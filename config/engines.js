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
    // Check environment variables and return available engines
}

// Function to validate if an engine is available
function isEngineAvailable(engineName) {
    // Check if the specified engine is available
}

// Function to validate if a model is available for an engine
function isModelAvailable(engineName, modelName) {
    // Check if the specified model is available for the engine
}

// Function to get default model for an engine
function getDefaultModel(engineName) {
    // Get the default model for the specified engine
}

module.exports = {
    ENGINES,
    getAvailableEngines,
    isEngineAvailable,
    isModelAvailable,
    getDefaultModel
};