// controllers/message_controller.js
// Controller for processing and responding to messages

const commandController = require('./command_controller');
const messageModel = require('../database/models/message');
const userPreferences = require('../database/models/user_preferences');
const aiService = require('../services/ai/ai_service');
const searchService = require('../services/search/search_service');
const messageParser = require('../utils/message_parser');
const logger = require('../utils/logger');
const config = require('../config/config');

// Process incoming message
async function handleMessage(client, msg) {
    try {
        // Skip status messages and messages from the bot itself
        if (msg.isStatus || msg.fromMe) {
            return;
        }
        
        // Get basic message info
        const chatId = msg.from;
        const userId = msg.author || msg.from.split('@')[0];
        const isGroup = msg.from.includes('-');
        
        logger.debug(`Processing message from ${userId} in chat ${chatId}`);
        
        // Save the user's message to the database
        await saveMessageToDatabase(msg, chatId, msg.body, 'user');
        
        // Check if the bot should respond
        let shouldRespond = false;
        
        if (isGroup) {
            // In groups, only respond if mentioned or if the bot's attention is requested
            shouldRespond = isBotMentioned(msg);
        } else {
            // In private chats, always respond
            shouldRespond = true;
        }
        
        if (shouldRespond) {
            await processAIResponse(client, msg, userId, chatId, isGroup);
        }
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, { error });
    }
}

// Check if bot is mentioned in a group chat
function isBotMentioned(msg) {
    if (!msg.isGroup) {
        return false;
    }
    
    // Check if message mentions the bot by @mentioning its name
    // This depends on how mentions work in whatsapp-web.js
    if (msg.mentionedIds && msg.mentionedIds.includes(client.info.wid._serialized)) {
        return true;
    }
    
    // Check common ways of addressing the bot
    const botIndicators = [
        '@bot', 'hey bot', 'bot,', 'bot:', 'dear bot',
        'ai,', 'ai:', 'ai bot', 'assistant',
        'gpt', 'claude', 'gemini'
    ];
    
    const lowerCaseBody = msg.body.toLowerCase();
    return botIndicators.some(indicator => lowerCaseBody.includes(indicator));
}

// Process AI response
async function processAIResponse(client, msg, userId, chatId, isGroup) {
    try {
        // Send typing indicator
        await client.sendPresenceAvailable();
        await client.sendMessage(chatId, { presenceState: 'typing' });
        
        // Get message history for context
        const messageHistory = await getMessageHistory(chatId, userId);
        
        // Check if we should perform a search first
        const messageText = msg.body;
        let needsSearch = false;
        let searchResults = null;
        
        try {
            needsSearch = await aiService.needsSearchAugmentation(messageText);
            
            if (needsSearch) {
                logger.debug(`Search augmentation needed for message: ${messageText}`);
                
                // Check if user wants Chinese search
                const useChineseSearch = isChineseSearchRequested(messageText);
                
                // Process query for search
                const processedQuery = await aiService.processSearchQuery(messageText, useChineseSearch);
                
                // Perform search
                searchResults = await searchService.search(processedQuery, useChineseSearch);
                
                if (searchResults && searchResults.length > 0) {
                    logger.debug(`Got ${searchResults.length} search results`);
                }
            }
        } catch (searchError) {
            logger.error(`Error during search augmentation: ${searchError.message}`, { error: searchError });
            // Continue without search results
        }
        
        // Add search results to message if available
        let augmentedMessage = messageText;
        let systemInstructions = "";
        
        if (searchResults && searchResults.length > 0) {
            // Create separate system instructions for handling search results
            systemInstructions = `Important: I'm providing you with recent search results to help answer this question. 
The user's original question was: "${messageText}"

Here's some information that might help answer the question:

`;
            
            for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
                const result = searchResults[i];
                systemInstructions += `[${i+1}] ${result.title}\n${result.snippet}\nSource: ${result.link}\n\n`;
            }
            
            systemInstructions += `Based on the search results above, please answer the user's original question. 
If the search results contain relevant information, use it to provide an accurate response.
If the search results don't directly answer the question, say so and provide the best answer you can.
If the question is in a non-English language, respond in the same language.`;
            
            // Add a temporary system message with search results to the message history
            messageHistory.unshift({
                role: "system",
                content: systemInstructions
            });
        }
        
        // Send to AI service
        let aiResponse;
        try {
            aiResponse = await aiService.sendMessage(userId, chatId, messageText, messageHistory);
        } catch (aiError) {
            logger.error(`Error getting AI response: ${aiError.message}`, { error: aiError });
            aiResponse = "I'm sorry, I encountered an error processing your request. Please try again later.";
        }
        
        // Send the response
        await client.sendMessage(chatId, aiResponse);
        
        // Save AI response to database
        await saveMessageToDatabase(msg, chatId, aiResponse, 'assistant');
        
        logger.debug(`Sent AI response to ${chatId}`);
    } catch (error) {
        logger.error(`Error in processAIResponse: ${error.message}`, { error });
        
        // Send error message
        try {
            await client.sendMessage(
                msg.from, 
                "对不起，我在处理您的消息时遇到了错误。请稍后再试。"
            );
        } catch (sendError) {
            logger.error(`Error sending error message: ${sendError.message}`, { error: sendError });
        }
    }
}

// Check if message indicates Chinese search is requested
function isChineseSearchRequested(message) {
    const lowerCaseMsg = message.toLowerCase();
    return (
        message.includes('中文') || 
        message.includes('中国') || 
        message.includes('用中文') || 
        lowerCaseMsg.includes('in chinese') || 
        lowerCaseMsg.includes('chinese search') || 
        lowerCaseMsg.includes('search in chinese')
    );
}

// Save message to database
async function saveMessageToDatabase(msg, chatId, content, role = 'user') {
    try {
        const timestamp = new Date();
        const userId = msg.author || msg.from.split('@')[0];
        
        await messageModel.saveMessage({
            userId,
            chatId,
            content,
            role,
            timestamp
        });
        
        logger.debug(`Saved ${role} message to database for chat ${chatId}`);
    } catch (error) {
        logger.error(`Error saving message to database: ${error.message}`, { error });
    }
}

// Get message history for context
async function getMessageHistory(chatId, userId) {
    try {
        // Get messages from database
        const dbMessages = await messageModel.getChatHistory(
            chatId, 
            config.MESSAGE_STORAGE.maxContextMessages
        );
        
        // Format for AI consumption
        const formattedMessages = dbMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        // Add system message if not present
        let hasSystemMessage = formattedMessages.some(msg => msg.role === 'system');
        
        if (!hasSystemMessage) {
            // Get user preferences
            const userPrefs = await userPreferences.getUserPreferences(userId, chatId);
            const engineName = userPrefs.engine || config.DEFAULTS.engine;
            
            // Add system message based on engine
            formattedMessages.unshift({
                role: 'system',
                content: config.DEFAULTS.systemPrompt
            });
        }
        
        return formattedMessages;
    } catch (error) {
        logger.error(`Error getting message history: ${error.message}`, { error });
        
        // Return empty history if there's an error
        return [{
            role: 'system',
            content: config.DEFAULTS.systemPrompt
        }];
    }
}

module.exports = {
    handleMessage,
    isBotMentioned,
    processAIResponse,
    saveMessageToDatabase,
    getMessageHistory
};