// config/config.js
// Configuration settings for the application

// Database configuration
const DATABASE = {
    path: './database/whatsapp_bot.sqlite',
    migrations: './database/migrations'
};

// Command prefixes
const COMMANDS = {
    prefix: '$',
    help: 'help',
    list: 'list',
    use: 'use',
    model: 'model',
    clear: 'clear',
    price: 'price',
    reminder: 'reminder',
    listReminders: 'listrem',
    removeReminder: 'rmrem',
    search: 'search'
};

// Default settings
const DEFAULTS = {
    engine: 'openai',
    model: 'gpt-5',
    systemPrompt: 'You are a helpful assistant integrated into WhatsApp. Answer questions concisely and accurately.'
};

// AI Models configuration - configurable models for each engine
const AI_MODELS = {
    openai: {
        // Default model for main conversations
        defaultModel: 'gpt-5-mini',
        // Lightweight model for auxiliary tasks (translation, reminder processing)
        lightModel: 'gpt-5-nano',
        // Fallback models when primary model fails
        fallbackModels: ['gpt-5-mini', 'gpt-5-nano', 'gpt-5']
    },
    anthropic: {
        defaultModel: 'claude-sonnet-4-20250514',
        lightModel: 'claude-3-5-haiku-20241022',
        fallbackModels: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022']
    },
    gemini: {
        defaultModel: 'gemini-2.0-flash-exp',
        lightModel: 'gemini-1.5-flash',
        fallbackModels: ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro-latest']
    },
    deepseek: {
        defaultModel: 'deepseek-chat',
        lightModel: 'deepseek-chat',
        fallbackModels: ['deepseek-chat', 'deepseek-reasoner']
    }
};

// AI Search configuration - enable/disable web search for each engine
const AI_SEARCH = {
    openai: {
        enabled: true,
        toolType: 'web_search'
    },
    deepseek: {
        enabled: true,
        toolType: 'web_search'
    },
    anthropic: {
        enabled: false
    },
    gemini: {
        enabled: true,
        toolType: 'googleSearch'
    }
};

// Cryptocurrency scheduler configuration
const CRYPTO_SCHEDULER = {
    intervalHours: 4,
    // Array of group IDs to send automatic updates to
    targetGroups: ['120363392098042428@g.us'],
    // List of cryptocurrencies to track
    currencies: ['BTC', 'ETH', 'LTC', 'BCH'],
    // API endpoint for fetching prices
    apiEndpoint: 'https://api.coingecko.com/api/v3/simple/price'
};

// Group whitelist configuration - groups where bot responds without @mention
const GROUP_WHITELIST = {
    enabled: false,  // Disabled - require @mention in all groups
    // Groups where bot responds to all messages (no @mention required)
    groups: [
        // '120363392098042428@g.us' // Main group (commented out)
    ]
};

// Bot IDs configuration - multiple IDs the bot may have
const BOT_IDS = {
    // Bot can have multiple IDs in WhatsApp
    ids: [
        '8618980575100',    // Primary phone number
        '5712893722756'     // Linked ID (lid)
    ]
};

// Message storage configuration
const MESSAGE_STORAGE = {
    // Maximum number of messages to store for context
    // Optimized to 10 for faster responses while maintaining conversation context
    maxContextMessages: 10,
    // Whether to include system messages in context
    includeSystemMessages: true,
    // Time in hours before context is automatically cleared
    contextExpirationHours: 24
};

// Search configuration
const SEARCH = {
    maxResults: 10,  // Increased from 5 to 10 for GPT-5's larger context
    provider: 'google', // 'google', 'bing', etc.
    timeout: 15000, // timeout in milliseconds
    userAgent: 'WhatsApp Bot Search Service'
};

// Reminder configuration
const REMINDERS = {
    checkIntervalMinutes: 1,
    timeZone: 'UTC', // Default timezone
    defaultReminderPrefix: '⏰ Reminder: '
};

// Logging configuration
const LOGGING = {
    level: process.env.LOG_LEVEL || 'debug', // debug, info, warn, error
    file: './logs/whatsapp-bot.log',
    console: true,
    maxFiles: 5,
    maxSize: '10m'
};

module.exports = {
    DATABASE,
    COMMANDS,
    DEFAULTS,
    AI_MODELS,
    AI_SEARCH,
    CRYPTO_SCHEDULER,
    GROUP_WHITELIST,
    BOT_IDS,
    MESSAGE_STORAGE,
    SEARCH,
    REMINDERS,
    LOGGING
};
