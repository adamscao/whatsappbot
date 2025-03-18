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
        const isGroup = messageParser.isGroupMessage(msg);
        
        logger.debug(`Processing AI response for message: "${msg.body}"`);
        
        // Save the user's message to the database
        await saveMessageToDatabase(msg, chatId, msg.body, 'user');
        
        // Process the AI response
        await processAIResponse(client, msg, userId, chatId, isGroup);
    } catch (error) {
        logger.error(`Error processing message: ${error.message}`, { error });
    }
}

// Process AI response
async function processAIResponse(client, msg, userId, chatId, isGroup) {
    try {
        // Send typing indicator
        await client.sendPresenceAvailable();
        await client.sendMessage(chatId, { presenceState: 'typing' });
        
        // Get message history for context
        const messageHistory = await getMessageHistory(chatId, userId);
        
        // Use the already processed message text (bot mentions already removed in app.js)
        let messageText = msg.body;
        
        // Check if we should perform a search first
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
        if (searchResults && searchResults.length > 0) {
            logger.debug(`Adding ${searchResults.length} search results to AI context`);

            // Format search results in a structured way that will help the AI
            augmentedMessage = `${messageText}\n\n### Search Results\n\n`;

            for (let i = 0; i < Math.min(searchResults.length, 3); i++) {
                const result = searchResults[i];
                augmentedMessage += `[${i + 1}] ${result.title}\n${result.snippet}\nSource: ${result.link}\n\n`;
            }

            augmentedMessage += `\nPlease use these search results to help answer the question: "${messageText}"\n`;
        }

        // Send to AI service
        let aiResponse;
        try {
            logger.debug(`Sending augmented message to AI: length=${augmentedMessage.length}`);
            aiResponse = await aiService.sendMessage(userId, chatId, augmentedMessage, messageHistory);
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
                "I'm sorry, I encountered an error while processing your message. Please try again later."
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
    processAIResponse,
    saveMessageToDatabase,
    getMessageHistory
};