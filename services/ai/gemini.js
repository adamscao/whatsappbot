// services/ai/gemini.js
// Google Gemini API integration service

const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// Gemini client instance
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Format history for Gemini API (converts from OpenAI format)
function formatChatHistory(messageHistory) {
    // Gemini uses a different format than OpenAI/Anthropic
    // We need to convert the messages to Gemini's format
    const formattedHistory = [];
    
    for (const msg of messageHistory) {
        // Skip system messages as Gemini handles them differently
        if (msg.role === 'system') continue;
        
        formattedHistory.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        });
    }
    
    return formattedHistory;
}

// Send message to Gemini
async function sendMessage(message, messageHistory, modelName = 'gemini-pro') {
    try {
        logger.debug(`Sending message to Gemini using model: ${modelName}`);
        
        // Get system message if present
        let systemPrompt = config.DEFAULTS.systemPrompt;
        for (const msg of messageHistory) {
            if (msg.role === 'system') {
                systemPrompt = msg.content;
                break;
            }
        }
        
        // Format message history for Gemini
        const formattedHistory = formatChatHistory(messageHistory);
        
        // Create generative model instance with the specified model
        const model = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 1000,
            },
            systemInstruction: systemPrompt
        });
        
        let response;
        
        // If we have chat history, use it
        if (formattedHistory.length > 0) {
            // Create a chat session
            const chat = model.startChat({
                history: formattedHistory,
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40,
                    maxOutputTokens: 1000,
                }
            });
            
            // Send the message in the chat session
            response = await chat.sendMessage(message);
        } else {
            // No history, just send a single message
            response = await model.generateContent(message);
        }
        
        if (!response || !response.response) {
            throw new Error('No response from Gemini');
        }
        
        return response.response.text();
    } catch (error) {
        logger.error(`Error in Gemini sendMessage: ${error.message}`, { error });
        throw error;
    }
}

// Translate text using Gemini
async function translateText(text, sourceLanguage, targetLanguage) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}. 
        Only return the translated text without any additional comments or explanations.
        
        Text to translate: "${text}"`;
        
        const response = await model.generateContent(prompt);
        
        if (!response || !response.response) {
            throw new Error('No translation response from Gemini');
        }
        
        // Extract just the translated text
        return response.response.text().trim();
    } catch (error) {
        logger.error(`Error in Gemini translateText: ${error.message}`, { error });
        throw error;
    }
}

// Check if query needs search augmentation
async function needsSearchAugmentation(query) {
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Determine if the following query requires current information, external search, or information that might not be in your knowledge. Respond with ONLY "true" or "false" - nothing else.
        
        Query: "${query}"`;
        
        const response = await model.generateContent(prompt);
        
        if (!response || !response.response) {
            throw new Error('No search augmentation response from Gemini');
        }
        
        const result = response.response.text().trim().toLowerCase();
        return result === 'true';
    } catch (error) {
        logger.error(`Error in Gemini needsSearchAugmentation: ${error.message}`, { error });
        return true; // Default to true on error to be safe
    }
}

// Process reminder to extract time and content
async function preprocessReminder(reminderText) {
    try {
        // Get current date and time for context
        const now = new Date();
        const currentTimeISO = now.toISOString();
        const currentTimeFormatted = now.toString();
        
        const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
        
        const prompt = `Extract time and content from the following reminder text. The current time is ${currentTimeFormatted} (ISO: ${currentTimeISO}).
        
        Reminder text: "${reminderText}"
        
        Return a JSON object with these three keys:
        1. "time" - ISO 8601 format with timezone if specified, otherwise UTC
        2. "content" - the actual reminder message
        3. "relativeTime" - human readable description of when the reminder is (e.g., "tomorrow at 3:30 PM")
        
        Only return the JSON, nothing else.`;
        
        const response = await model.generateContent(prompt);
        
        if (!response || !response.response) {
            throw new Error('No reminder processing response from Gemini');
        }
        
        const responseText = response.response.text().trim();
        
        // Extract JSON from the response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from Gemini response');
        }
        
        try {
            const result = JSON.parse(jsonMatch[0]);
            logger.debug(`Extracted reminder data: ${JSON.stringify(result)}`);
            return result;
        } catch (jsonError) {
            logger.error(`Error parsing reminder JSON: ${jsonError.message}`);
            throw new Error('Failed to parse reminder data');
        }
    } catch (error) {
        logger.error(`Error in Gemini preprocessReminder: ${error.message}`, { error });
        throw error;
    }
}

// Get list of available models
async function getAvailableModels() {
    // Gemini doesn't have a specific API endpoint for listing models
    // Return hardcoded models based on documentation
    return [
        'gemini-2.0-flash-lite',
        'gemini-2.0-flash',
        'gemini-1.5-flash'
    ];
}

module.exports = {
    sendMessage,
    translateText,
    preprocessReminder,
    needsSearchAugmentation,
    getAvailableModels
};