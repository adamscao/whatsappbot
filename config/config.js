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
    model: 'gpt-4o',
    systemPrompt: 'You are a helpful assistant integrated into WhatsApp. Answer questions concisely and accurately.'
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

// Message storage configuration
const MESSAGE_STORAGE = {
    // Maximum number of messages to store for context
    maxContextMessages: 10,
    // Whether to include system messages in context
    includeSystemMessages: true,
    // Time in hours before context is automatically cleared
    contextExpirationHours: 24
};

// Search configuration
const SEARCH = {
    maxResults: 5,
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
    CRYPTO_SCHEDULER,
    MESSAGE_STORAGE,
    SEARCH,
    REMINDERS,
    LOGGING
};
