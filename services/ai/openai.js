// services/ai/openai.js
// OpenAI API integration service

// Load environment variables first
require('dotenv').config();

const { OpenAI } = require('openai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// OpenAI client instance - lazy initialization
let openai = null;

function getOpenAIClient() {
    if (!openai) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
    return openai;
}

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
async function sendMessage(message, messageHistory, model = 'gpt-5') {
    try {
        logger.debug(`Sending message to OpenAI using model: ${model}`);

        // Check if the current message contains search results
        const hasSearchResults = message.includes('=== SEARCH RESULTS') &&
                                 message.includes('=== INSTRUCTIONS ===');

        let requestMessages = [];

        // Format messages - maintain all existing message history
        for (const msg of messageHistory) {
            requestMessages.push(msg);
        }

        // Add the current user message
        requestMessages.push({
            role: 'user',
            content: message
        });

        // GPT-5 and o1 models use max_completion_tokens, older models use max_tokens
        const isGPT5 = model.startsWith('gpt-5');
        const isO1 = model.startsWith('o1');
        const isGPT5orO1 = isGPT5 || isO1;

        const requestParams = {
            model: model,
            messages: requestMessages
        };

        // GPT-5 and o1 models have different parameter requirements
        if (isGPT5orO1) {
            // GPT-5: 400K context window, 128K max output tokens
            // o1 models: Different limits
            if (isGPT5) {
                // Optimized for faster responses while maintaining quality
                // Use 4K for search results (concise responses with citations)
                // Use 2K for regular queries (faster, focused answers)
                requestParams.max_completion_tokens = hasSearchResults ? 4000 : 2000;
            } else {
                // o1 models - use conservative limits
                requestParams.max_completion_tokens = hasSearchResults ? 4000 : 2000;
            }
            // GPT-5 and o1 only support temperature: 1 (default)
            // Don't set temperature, top_p, frequency_penalty, presence_penalty
        } else {
            // For GPT-4 and earlier models
            const temperature = hasSearchResults ? 0.3 : 0.7;
            requestParams.temperature = temperature;
            requestParams.max_tokens = hasSearchResults ? 2000 : 1000;
            requestParams.top_p = 1;
            requestParams.frequency_penalty = 0;
            requestParams.presence_penalty = 0;
        }

        const response = await getOpenAIClient().chat.completions.create(requestParams);

        if (!response.choices || response.choices.length === 0) {
            throw new Error('No response from OpenAI');
        }

        const content = response.choices[0].message.content;

        // Log if content is empty
        if (!content || content.trim() === '') {
            logger.warn(`Empty response from OpenAI model ${model}, finish_reason: ${response.choices[0].finish_reason}`);
        }

        return content;
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

        const response = await getOpenAIClient().chat.completions.create({
            model: config.AI_MODELS.openai.lightModel,
            messages: messages,
            max_completion_tokens: 2000
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
        
        const response = await getOpenAIClient().chat.completions.create({
            model: config.AI_MODELS.openai.lightModel,
            messages: messages,
            max_completion_tokens: 1000,
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
        
        const response = await getOpenAIClient().chat.completions.create({
            model: config.AI_MODELS.openai.lightModel,
            messages: messages,
            max_completion_tokens: 500,
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
        const response = await getOpenAIClient().models.list();
        
        // Filter for chat models only
        const chatModels = response.data.filter(model => 
            model.id.includes('gpt') && !model.id.includes('instruct')
        );
        
        return chatModels.map(model => model.id);
    } catch (error) {
        logger.error(`Error getting OpenAI models: ${error.message}`, { error });

        // Return configured fallback models
        return config.AI_MODELS.openai.fallbackModels;
    }
}

module.exports = {
    sendMessage,
    translateText,
    preprocessReminder,
    needsSearchAugmentation,
    getAvailableModels
};
