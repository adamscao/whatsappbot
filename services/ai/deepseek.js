// services/ai/deepseek.js
// DeepSeek API integration service

// Load environment variables first
require('dotenv').config();

const { OpenAI } = require('openai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// DeepSeek client instance - lazy initialization
let deepseek = null;

function getDeepSeekClient() {
    if (!deepseek) {
        deepseek = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });
    }
    return deepseek;
}

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
async function sendMessage(message, messageHistory, model = config.AI_MODELS.deepseek.defaultModel) {
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

        const requestParams = {
            model: model,
            messages: requestMessages,
            temperature: temperature,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        };

        // Add web_search tool if enabled
        if (config.AI_SEARCH.deepseek.enabled) {
            requestParams.tools = [
                { type: config.AI_SEARCH.deepseek.toolType }
            ];
            logger.debug('Enabled web_search tool for DeepSeek');
        }

        const response = await getDeepSeekClient().chat.completions.create(requestParams);

        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response from DeepSeek');
        }

        return response.choices[0].message.content;
    } catch (error) {
        logger.error(`Error in DeepSeek sendMessage: ${error.message}`, { error });
        throw error;
    }
}

// Get list of available models
async function getAvailableModels() {
    try {
        // DeepSeek doesn't have a specific API endpoint for listing models
        // Return configured fallback models
        return config.AI_MODELS.deepseek.fallbackModels;
    } catch (error) {
        logger.error(`Error getting DeepSeek models: ${error.message}`, { error });

        // Return configured fallback models
        return config.AI_MODELS.deepseek.fallbackModels;
    }
}

module.exports = {
    sendMessage,
    getAvailableModels
};