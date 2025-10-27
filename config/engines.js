// config/engines.js
// AI engines configuration and model options

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Load model configuration from JSON file
let MODELS_CONFIG = {};
try {
    const configPath = path.join(__dirname, 'models.json');
    const configData = fs.readFileSync(configPath, 'utf8');
    MODELS_CONFIG = JSON.parse(configData);
    logger.info('Model configuration loaded successfully');
} catch (error) {
    logger.error(`Failed to load model configuration: ${error.message}`);
    // Fallback to empty config - will cause errors if models are accessed
    MODELS_CONFIG = {};
}

// Transform models config to include just model IDs for backward compatibility
const ENGINES = {};
for (const [engineName, engineConfig] of Object.entries(MODELS_CONFIG)) {
    ENGINES[engineName] = {
        envKey: engineConfig.envKey,
        defaultModel: engineConfig.defaultModel,
        models: engineConfig.models.map(model => model.id)
    };
}

// Function to check which engines are available based on environment variables
function getAvailableEngines() {
    const availableEngines = {};
    
    for (const [engineName, engineConfig] of Object.entries(ENGINES)) {
        const apiKey = process.env[engineConfig.envKey];
        if (apiKey) {
            availableEngines[engineName] = engineConfig;
        }
    }
    
    return availableEngines;
}

// Function to validate if an engine is available
function isEngineAvailable(engineName) {
    if (!ENGINES[engineName]) {
        return false; // Engine doesn't exist in config
    }
    
    const apiKey = process.env[ENGINES[engineName].envKey];
    return !!apiKey;
}

// Function to validate if a model is available for an engine
function isModelAvailable(engineName, modelName) {
    if (!isEngineAvailable(engineName)) {
        return false;
    }
    
    return ENGINES[engineName].models.includes(modelName);
}

// Function to get default model for an engine
function getDefaultModel(engineName) {
    if (!isEngineAvailable(engineName)) {
        return null;
    }

    return ENGINES[engineName].defaultModel;
}

// Function to get model details (name, description)
function getModelDetails(engineName, modelId) {
    if (!MODELS_CONFIG[engineName]) {
        return null;
    }

    const model = MODELS_CONFIG[engineName].models.find(m => m.id === modelId);
    return model || null;
}

// Function to get all models with details for an engine
function getModelsWithDetails(engineName) {
    if (!MODELS_CONFIG[engineName]) {
        return [];
    }

    return MODELS_CONFIG[engineName].models;
}

// Function to get all engines configuration (for listing purposes)
function getAllEnginesConfig() {
    return MODELS_CONFIG;
}

module.exports = {
    ENGINES,
    getAvailableEngines,
    isEngineAvailable,
    isModelAvailable,
    getDefaultModel,
    getModelDetails,
    getModelsWithDetails,
    getAllEnginesConfig
};