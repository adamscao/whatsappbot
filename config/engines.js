// config/engines.js
// AI engines configuration and model options

// Available AI engines
const ENGINES = {
    openai: {
        envKey: 'OPENAI_API_KEY',
        defaultModel: 'gpt-5',
        models: [
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano',
            'gpt-4o',
            'gpt-4o-mini',
            'o1',
            'o1-mini',
            'o1-preview'
        ]
    },
    anthropic: {
        envKey: 'ANTHROPIC_API_KEY',
        defaultModel: 'claude-sonnet-4-20250514',
        models: [
            'claude-sonnet-4-20250514',
            'claude-opus-4-20250514',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-opus-20240229'
        ]
    },
    gemini: {
        envKey: 'GEMINI_API_KEY',
        defaultModel: 'gemini-2.0-flash-exp',
        models: [
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash-thinking-exp-01-21',
            'gemini-exp-1206',
            'gemini-1.5-pro-latest',
            'gemini-1.5-flash'
        ]
    },
    deepseek: {
        envKey: 'DEEPSEEK_API_KEY',
        defaultModel: 'deepseek-chat',
        models: [
            'deepseek-chat',
            'deepseek-reasoner'
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