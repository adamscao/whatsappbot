// config/engines.js
// AI engines configuration and model options

// Available AI engines
const ENGINES = {
    openai: {
        envKey: 'OPENAI_API_KEY',
        defaultModel: 'gpt-4o',
        models: [
            'gpt-4o',
            'gpt-3.5-turbo',
            'gpt-4-turbo'
            // Other models can be added
        ]
    },
    anthropic: {
        envKey: 'ANTHROPIC_API_KEY',
        defaultModel: 'claude-3-opus',
        models: [
            'claude-3-opus',
            'claude-3-sonnet',
            'claude-3-haiku'
            // Other models can be added
        ]
    },
    gemini: {
        envKey: 'GEMINI_API_KEY',
        defaultModel: 'gemini-pro',
        models: [
            'gemini-pro',
            'gemini-pro-vision'
            // Other models can be added
        ]
    },
    deepseek: {
        envKey: 'DEEPSEEK_API_KEY',
        defaultModel: 'deepseek-chat',
        models: [
            'deepseek-chat',
            'deepseek-coder'
            // Other models can be added
        ]
    }
};

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

module.exports = {
    ENGINES,
    getAvailableEngines,
    isEngineAvailable,
    isModelAvailable,
    getDefaultModel
};