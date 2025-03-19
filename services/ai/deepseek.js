// services/ai/deepseek.js
// DeepSeek API integration service

const { OpenAI } = require('openai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// DeepSeek client instance (using OpenAI SDK with custom baseURL)
const deepseek = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY
});

// Format messages for DeepSeek API (compatible with OpenAI format)
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

// Send message to DeepSeek
async function sendMessage(message, messageHistory, model = 'deepseek-chat') {
    try {
        logger.debug(`Sending message to DeepSeek using model: ${model}`);
        
        // Format messages for DeepSeek API
        const requestMessages = formatMessages(message, messageHistory);
        
        // Set different temperature based on model
        let temperature = 0.7;
        if (model === 'deepseek-reasoner') {
            // Lower temperature for more factual responses from the reasoner model
            temperature = 0.3;
        }
        
        const response = await deepseek.chat.completions.create({
            model: model,
            messages: requestMessages,
            temperature: temperature,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });
        
        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response from DeepSeek');
        }
        
        return response.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in DeepSeek sendMessage: ${error.message}`, { error });
        throw error;
    }
}

// Check if query needs search augmentation
// This uses a simple heuristic approach since DeepSeek doesn't have a specific API for this
async function needsSearchAugmentation(query) {
    try {
        // Keywords that might indicate a need for search
        const searchIndicators = [
            'current', 'latest', 'news', 'recent', 'today', 'yesterday',
            '最新', '新闻', '近期', '今天', '昨天',
            'what is', 'how to', 'who is', 'where is', 'when did',
            '什么是', '如何', '谁是', '在哪里', '什么时候'
        ];
        
        const lowerQuery = query.toLowerCase();
        
        // Check if query contains any of the indicators
        for (const indicator of searchIndicators) {
            if (lowerQuery.includes(indicator.toLowerCase())) {
                return true;
            }
        }
        
        // Default to false - don't always need search
        return false;
    } catch (error) {
        logger.error(`Error in DeepSeek needsSearchAugmentation: ${error.message}`, { error });
        return true; // Default to true on error to be safe
    }
}

// Get list of available models
async function getAvailableModels() {
    try {
        // DeepSeek doesn't have a specific API endpoint for listing models
        // Return hardcoded models based on documentation
        return [
            'deepseek-chat',
            'deepseek-reasoner'
        ];
    } catch (error) {
        logger.error(`Error getting DeepSeek models: ${error.message}`, { error });
        
        // Return hardcoded models as fallback
        return [
            'deepseek-chat',
            'deepseek-reasoner'
        ];
    }
}

module.exports = {
    sendMessage,
    needsSearchAugmentation,
    getAvailableModels
};