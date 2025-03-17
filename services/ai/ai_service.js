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
            return await service.sendMessage(message, messageHistory, defaultModel);
        }
        
        // Check if model is available for engine
        if (!engines.isModelAvailable(engineName, modelName)) {
            logger.warn(`Model ${modelName} not available for ${engineName}, using default model`);
            const defaultModel = engines.getDefaultModel(engineName);
            const service = getAIService(engineName);
            return await service.sendMessage(message, messageHistory, defaultModel);
        }
        
        // Route to appropriate service
        const service = getAIService(engineName);
        return await service.sendMessage(message, messageHistory, modelName);
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

// Check if query needs search augmentation
async function needsSearchAugmentation(query) {
    try {
        if (!engines.isEngineAvailable('openai')) {
            // If OpenAI is not available, default to true to be safe
            logger.warn("OpenAI not available for search augmentation check, defaulting to true");
            return true;
        }
        
        return await openaiService.needsSearchAugmentation(query);
    } catch (error) {
        logger.error(`Error in needsSearchAugmentation: ${error.message}`, { error });
        // Default to true in case of error
        return true;
    }
}

// Process search query (translate if needed)
async function processSearchQuery(query, useChineseSearch = false) {
    try {
        if (useChineseSearch) {
            // If Chinese search is requested, ensure query is in Chinese
            if (!engines.isEngineAvailable('openai')) {
                // Cannot translate, return original
                return query;
            }
            
            return await openaiService.translateText(query, 'auto', 'zh-CN');
        } else {
            // Ensure query is in English for better search results
            if (!engines.isEngineAvailable('openai')) {
                // Cannot translate, return original
                return query;
            }
            
            return await openaiService.translateText(query, 'auto', 'en');
        }
    } catch (error) {
        logger.error(`Error in processSearchQuery: ${error.message}`, { error });
        // Return original query in case of error
        return query;
    }
}

module.exports = {
    sendMessage,
    translateText,
    preprocessReminder,
    needsSearchAugmentation,
    processSearchQuery,
    getAIService
};