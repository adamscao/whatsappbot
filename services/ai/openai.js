// services/ai/openai.js
// OpenAI API integration service

const { OpenAI } = require('openai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// OpenAI client instance
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Format messages for OpenAI API
function formatMessages(message, messageHistory) {
    const formattedMessages = [];
    
    // Add system message if not already present
    let hasSystemMessage = false;
    for (const msg of messageHistory) {
        if (msg.role === 'system') {
            hasSystemMessage = true;
            break;
        }
    }
    
    if (!hasSystemMessage) {
        formattedMessages.push({
            role: 'system',
            content: config.DEFAULTS.systemPrompt
        });
    }
    
    // Add message history (already formatted)
    formattedMessages.push(...messageHistory);
    
    // Add current message
    formattedMessages.push({
        role: 'user',
        content: message
    });
    
    return formattedMessages;
}

// Send message to OpenAI
async function sendMessage(message, messageHistory, model = 'gpt-4o') {
    try {
        logger.debug(`Sending message to OpenAI using model: ${model}`);
        
        // Check if we have any system messages with search results
        let hasSearchResults = false;
        let requestMessages = [];
        
        // Format messages - maintain all existing message history
        for (const msg of messageHistory) {
            requestMessages.push(msg);
            if (msg.role === 'system' && 
                msg.content.includes('search results') && 
                msg.content.includes('Source:')) {
                hasSearchResults = true;
            }
        }
        
        // Add the current user message
        requestMessages.push({
            role: 'user',
            content: message
        });
        
        // If we have search results, adjust temperature to be more factual
        const temperature = hasSearchResults ? 0.3 : 0.7;
        
        const response = await openai.chat.completions.create({
            model: model,
            messages: requestMessages,
            temperature: temperature,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });
        
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response from OpenAI');
        }
        
        return response.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in OpenAI sendMessage: ${error.message}`, { error });
        throw error;
    }
}

// Translate text using OpenAI
async function translateText(text, sourceLanguage, targetLanguage) {
    try {
        const messages = [
            {
                role: 'system',
                content: `You are a translator. Translate the text from ${sourceLanguage} to ${targetLanguage}. Only return the translated text without any notes or explanations.`
            },
            {
                role: 'user',
                content: text
            }
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini', // Using cheaper model for translations
            messages: messages,
            temperature: 0.3, // Lower temperature for more consistent translations
            max_tokens: 1000,
            top_p: 1
        });
        
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No translation response from OpenAI');
        }
        
        return response.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in OpenAI translateText: ${error.message}`, { error });
        throw error;
    }
}

// Preprocess reminder to extract time and content
async function preprocessReminder(reminderText) {
    try {
        // Get current date and time for context
        const now = new Date();
        const currentTimeISO = now.toISOString();
        const currentTimeFormatted = now.toString();
        
        logger.debug(`Processing reminder text with current time: ${currentTimeFormatted}`);
        
        const messages = [
            {
                role: 'system',
                content: `Extract time and content from reminder text. The current time is ${currentTimeFormatted} (ISO: ${currentTimeISO}). Return a JSON object with keys: "time" (ISO 8601 format with timezone if specified, otherwise UTC), "content" (the reminder message), and "relativeTime" (human readable relative time). Example: {"time": "2023-05-20T15:30:00Z", "content": "Call John", "relativeTime": "tomorrow at 3:30 PM"}`
            },
            {
                role: 'user',
                content: reminderText
            }
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.2,
            response_format: { type: "json_object" }
        });
        
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No reminder processing response from OpenAI');
        }
        
        try {
            const result = JSON.parse(response.choices[0].message.content);
            logger.debug(`Extracted reminder data: ${JSON.stringify(result)}`);
            return result;
        } catch (jsonError) {
            logger.error(`Error parsing reminder JSON: ${jsonError.message}`);
            throw new Error('Failed to parse reminder data');
        }
    } catch (error) {
        logger.error(`Error in OpenAI preprocessReminder: ${error.message}`, { error });
        throw error;
    }
}

// Check if query needs search augmentation
async function needsSearchAugmentation(query) {
    try {
        const messages = [
            {
                role: 'system',
                content: `Determine if the query requires current information, external search, or information that might not be in your knowledge. Respond with a JSON object with a single "needsSearch" boolean field. Example: {"needsSearch": true}`
            },
            {
                role: 'user',
                content: query
            }
        ];
        
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: messages,
            temperature: 0.1,
            response_format: { type: "json_object" }
        });
        
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No search augmentation response from OpenAI');
        }
        
        try {
            const result = JSON.parse(response.choices[0].message.content);
            return result.needsSearch === true;
        } catch (jsonError) {
            logger.error(`Error parsing search augmentation JSON: ${jsonError.message}`);
            return true; // Default to true on error
        }
    } catch (error) {
        logger.error(`Error in OpenAI needsSearchAugmentation: ${error.message}`, { error });
        return true; // Default to true on error
    }
}

// Get list of available models
async function getAvailableModels() {
    try {
        const response = await openai.models.list();
        
        // Filter for chat models only
        const chatModels = response.data.filter(model => 
            model.id.includes('gpt') && !model.id.includes('instruct')
        );
        
        return chatModels.map(model => model.id);
    } catch (error) {
        logger.error(`Error getting OpenAI models: ${error.message}`, { error });
        
        // Return hardcoded models as fallback
        return [
            'gpt-4o',
            'gpt-4o-mini',
            'o1-mini'
        ];
    }
}

module.exports = {
    sendMessage,
    translateText,
    preprocessReminder,
    needsSearchAugmentation,
    getAvailableModels
};
