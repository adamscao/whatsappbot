// services/ai/ai_service.js
// AI service router that directs requests to the appropriate AI engine

const openaiService = require('./openai');
const anthropicService = require('./anthropic');
const geminiService = require('./gemini');
const deepseekService = require('./deepseek');
const engines = require('../../config/engines');
const userPreferences = require('../../database/models/user_preferences');
const logger = require('../../utils/logger');

// Get the appropriate AI service based on engine name
function getAIService(engineName) {
    switch (engineName.toLowerCase()) {
        case 'openai':
            return openaiService;
        case 'anthropic':
            return anthropicService;
        case 'gemini':
            return geminiService;
        case 'deepseek':
            return deepseekService;
        default:
            logger.warn(`Unknown engine: ${engineName}, falling back to OpenAI`);
            return openaiService;
    }
}

// Send a message to the AI with the specified engine and model
async function sendMessage(userId, chatId, message, messageHistory) {
    try {
        // Get user preferences
        const userPrefs = await userPreferences.getUserPreferences(userId, chatId);
        const engineName = userPrefs.engine || 'openai';
        const modelName = userPrefs.model || engines.getDefaultModel(engineName);
        
        // Deep copy the message history to avoid modifying the original
        const msgHistory = JSON.parse(JSON.stringify(messageHistory));
        
        // Check if engine is available
        if (!engines.isEngineAvailable(engineName)) {
            logger.warn(`Engine ${engineName} not available, falling back to default`);
            const availableEngines = engines.getAvailableEngines();
            const firstAvailableEngine = Object.keys(availableEngines)[0];
            
            if (!firstAvailableEngine) {
                throw new Error("No AI engines available. Check your API keys.");
            }
            
            const service = getAIService(firstAvailableEngine);
            const defaultModel = engines.getDefaultModel(firstAvailableEngine);
            return await service.sendMessage(message, msgHistory, defaultModel);
        }
        
        // Check if model is available for engine
        if (!engines.isModelAvailable(engineName, modelName)) {
            logger.warn(`Model ${modelName} not available for ${engineName}, using default model`);
            const defaultModel = engines.getDefaultModel(engineName);
            const service = getAIService(engineName);
            return await service.sendMessage(message, msgHistory, defaultModel);
        }
        
        // Route to appropriate service
        const service = getAIService(engineName);
        const response = await service.sendMessage(message, msgHistory, modelName);
        
        logger.debug(`Got response from ${engineName} using model ${modelName}`);
        return response;
    } catch (error) {
        logger.error(`Error in sendMessage: ${error.message}`, { error });
        throw error;
    }
}

// Translate text using OpenAI (regardless of user preferences)
async function translateText(text, sourceLanguage, targetLanguage) {
    try {
        if (!engines.isEngineAvailable('openai')) {
            throw new Error("OpenAI engine not available for translation");
        }
        
        return await openaiService.translateText(text, sourceLanguage, targetLanguage);
    } catch (error) {
        logger.error(`Error in translateText: ${error.message}`, { error });
        throw error;
    }
}

// Preprocess reminder text to extract structured data
async function preprocessReminder(reminderText) {
    try {
        if (!engines.isEngineAvailable('openai')) {
            throw new Error("OpenAI engine not available for reminder preprocessing");
        }
        
        return await openaiService.preprocessReminder(reminderText);
    } catch (error) {
        logger.error(`Error in preprocessReminder: ${error.message}`, { error });
        throw error;
    }
}

module.exports = {
    sendMessage,
    translateText,
    preprocessReminder,
    getAIService
};