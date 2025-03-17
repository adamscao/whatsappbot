// config/config.js
// Configuration settings for the application

// Database configuration
const DATABASE = {
    path: './database/whatsapp_bot.sqlite'
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
    removeReminder: 'rmrem'
};

// Default settings
const DEFAULTS = {
    engine: 'openai',
    model: 'gpt-4o'
};

// Cryptocurrency scheduler configuration
const CRYPTO_SCHEDULER = {
    intervalHours: 4,
    // Array of group IDs to send automatic updates to
    targetGroups: []
};

// Message storage configuration
const MESSAGE_STORAGE = {
    // Maximum number of messages to store for context
    maxContextMessages: 10
};

// Search configuration
const SEARCH = {
    maxResults: 5
};

module.exports = {
    DATABASE,
    COMMANDS,
    DEFAULTS,
    CRYPTO_SCHEDULER,
    MESSAGE_STORAGE,
    SEARCH
};