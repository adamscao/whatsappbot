// controllers/command_controller.js
// Controller for parsing and handling commands

const config = require('../config/config');
const engines = require('../config/engines');
const userPreferences = require('../database/models/user_preferences');
const messageModel = require('../database/models/message');
const reminderController = require('./reminder_controller');
const priceService = require('../services/crypto/price_service');
const logger = require('../utils/logger');

// Check if a message is a command
function isCommand(message) {
    return message && 
           message.body && 
           (message.body.startsWith(config.COMMANDS.prefix) || 
            message.body.startsWith('!') || 
            message.body.startsWith('/'));
}

// Parse command from message
function parseCommand(message) {
    let commandText = message.body;
    
    // Remove the prefix character
    if (commandText.startsWith(config.COMMANDS.prefix)) {
        commandText = commandText.substring(config.COMMANDS.prefix.length);
    } else if (commandText.startsWith('!') || commandText.startsWith('/')) {
        commandText = commandText.substring(1);
    }
    
    // Split by whitespace
    const parts = commandText.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return { command, args };
}

// Handle help command
async function handleHelpCommand(client, msg) {
    try {
        const helpText = `*WhatsApp AI Bot Help*

Available commands:
${config.COMMANDS.prefix}${config.COMMANDS.help} - Show this help message
${config.COMMANDS.prefix}${config.COMMANDS.list} - List available AI engines and models
${config.COMMANDS.prefix}${config.COMMANDS.use} <engine> - Switch to a different AI engine
${config.COMMANDS.prefix}${config.COMMANDS.model} <model> - Switch to a different AI model
${config.COMMANDS.prefix}${config.COMMANDS.clear} - Clear your conversation history
${config.COMMANDS.prefix}${config.COMMANDS.price} [symbol] - Get cryptocurrency prices
${config.COMMANDS.prefix}${config.COMMANDS.reminder} <text> - Set a reminder
${config.COMMANDS.prefix}${config.COMMANDS.listReminders} - List your active reminders
${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} <id> - Remove a reminder
${config.COMMANDS.prefix}${config.COMMANDS.search} <query> - Perform a web search

Example: "${config.COMMANDS.prefix}${config.COMMANDS.use} anthropic" to switch to Claude AI`;

        await client.sendMessage(msg.from, helpText);
        logger.debug(`Sent help information to ${msg.from}`);
    } catch (error) {
        logger.error(`Error handling help command: ${error.message}`, { error });
    }
}

// Handle list command
async function handleListCommand(client, msg) {
    try {
        const availableEngines = engines.getAvailableEngines();
        
        if (Object.keys(availableEngines).length === 0) {
            await client.sendMessage(msg.from, "No AI engines are currently available. Please check your configuration.");
            return;
        }
        
        let responseText = "*Available AI Engines and Models*\n\n";
        
        // Get user preferences to mark current selections
        const userPrefs = await userPreferences.getUserPreferences(
            msg.author || msg.from.split('@')[0],
            msg.from
        );
        
        for (const [engineName, engineConfig] of Object.entries(availableEngines)) {
            const isCurrentEngine = userPrefs.engine === engineName;
            responseText += `${isCurrentEngine ? '▶️' : '◾'} *${engineName}*\n`;
            
            // Add models for this engine
            for (const model of engineConfig.models) {
                const isCurrentModel = isCurrentEngine && userPrefs.model === model;
                responseText += `  ${isCurrentModel ? '✅' : '○'} ${model}\n`;
            }
            
            responseText += '\n';
        }
        
        responseText += `Your current engine: *${userPrefs.engine}*\n`;
        responseText += `Your current model: *${userPrefs.model}*\n\n`;
        responseText += `To change engine: ${config.COMMANDS.prefix}${config.COMMANDS.use} <engine>\n`;
        responseText += `To change model: ${config.COMMANDS.prefix}${config.COMMANDS.model} <model>`;
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Sent engine list to ${msg.from}`);
    } catch (error) {
        logger.error(`Error handling list command: ${error.message}`, { error });
    }
}

// Handle use command
async function handleUseCommand(client, msg, userId, args) {
    try {
        if (!args || args.length === 0) {
            await client.sendMessage(msg.from, `Please specify an engine to use. Example: ${config.COMMANDS.prefix}${config.COMMANDS.use} openai`);
            return;
        }
        
        const requestedEngine = args[0].toLowerCase();
        
        // Check if engine exists and is available
        if (!engines.isEngineAvailable(requestedEngine)) {
            const availableEngines = Object.keys(engines.getAvailableEngines()).join(', ');
            await client.sendMessage(
                msg.from, 
                `Engine "${requestedEngine}" is not available. Available engines: ${availableEngines || 'None'}`
            );
            return;
        }
        
        // Save user preference
        await userPreferences.setUserEngine(userId, msg.from, requestedEngine);
        
        // Set the default model for this engine
        const defaultModel = engines.getDefaultModel(requestedEngine);
        await userPreferences.setUserModel(userId, msg.from, defaultModel);
        
        await client.sendMessage(
            msg.from, 
            `Switched to *${requestedEngine}* engine with model *${defaultModel}*`
        );
        logger.debug(`User ${userId} switched to engine ${requestedEngine}`);
    } catch (error) {
        logger.error(`Error handling use command: ${error.message}`, { error });
    }
}

// Handle model command
async function handleModelCommand(client, msg, userId, args) {
    try {
        if (!args || args.length === 0) {
            await client.sendMessage(msg.from, `Please specify a model to use. Example: ${config.COMMANDS.prefix}${config.COMMANDS.model} gpt-4o`);
            return;
        }
        
        const requestedModel = args[0].toLowerCase();
        
        // Get user's current engine
        const userPrefs = await userPreferences.getUserPreferences(userId, msg.from);
        const userEngine = userPrefs.engine || config.DEFAULTS.engine;
        
        // Check if model is available for the engine
        if (!engines.isModelAvailable(userEngine, requestedModel)) {
            const engineConfig = engines.ENGINES[userEngine];
            if (!engineConfig) {
                await client.sendMessage(msg.from, `Your current engine "${userEngine}" is not configured properly.`);
                return;
            }
            
            const availableModels = engineConfig.models.join(', ');
            await client.sendMessage(
                msg.from, 
                `Model "${requestedModel}" is not available for ${userEngine}. Available models: ${availableModels}`
            );
            return;
        }
        
        // Save user preference
        await userPreferences.setUserModel(userId, msg.from, requestedModel);
        
        await client.sendMessage(
            msg.from, 
            `Switched to model *${requestedModel}* for *${userEngine}* engine`
        );
        logger.debug(`User ${userId} switched to model ${requestedModel}`);
    } catch (error) {
        logger.error(`Error handling model command: ${error.message}`, { error });
    }
}

// Handle clear command
async function handleClearCommand(client, msg, userId, chatId) {
    try {
        // Clear chat history
        await messageModel.clearChatHistory(chatId);
        
        await client.sendMessage(msg.from, "Your conversation history has been cleared.");
        logger.debug(`Cleared chat history for ${chatId}`);
    } catch (error) {
        logger.error(`Error handling clear command: ${error.message}`, { error });
    }
}

// Handle price command
async function handlePriceCommand(client, msg, args) {
    try {
        let symbol = 'all';
        
        if (args && args.length > 0) {
            symbol = args[0].toUpperCase();
        }
        
        const priceData = await priceService.getCryptoPrices(symbol);
        let responseText = "*Cryptocurrency Prices*\n\n";
        
        if (typeof priceData === 'string') {
            // Error message
            responseText = priceData;
        } else {
            // Format price data
            for (const [coin, data] of Object.entries(priceData)) {
                responseText += `*${coin}*: $${data.usd.toLocaleString()} (${data.usd_24h_change.toFixed(2)}%)\n`;
            }
        }
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Sent price data to ${msg.from}`);
    } catch (error) {
        logger.error(`Error handling price command: ${error.message}`, { error });
        await client.sendMessage(msg.from, "Sorry, I couldn't fetch cryptocurrency prices at this time.");
    }
}

// Handle search command
async function handleSearchCommand(client, msg, args) {
    try {
        if (!args || args.length === 0) {
            await client.sendMessage(msg.from, `Please specify a search query. Example: ${config.COMMANDS.prefix}${config.COMMANDS.search} latest news`);
            return;
        }
        
        const query = args.join(' ');
        await client.sendMessage(msg.from, `Searching for: "${query}"...`);
        
        // Check if user wants Chinese search
        const useChineseSearch = query.toLowerCase().includes('chinese') || 
                                query.includes('中文') || 
                                query.includes('中国');
        
        // Process search query
        const processedQuery = await aiService.processSearchQuery(query, useChineseSearch);
        
        // Perform search
        const searchResults = await searchService.search(processedQuery, useChineseSearch);
        
        if (!searchResults || searchResults.length === 0) {
            await client.sendMessage(msg.from, "No search results found. Please try a different query.");
            return;
        }
        
        // Format search results
        let responseText = `*Search Results for: ${query}*\n\n`;
        
        for (let i = 0; i < Math.min(searchResults.length, config.SEARCH.maxResults); i++) {
            const result = searchResults[i];
            responseText += `*${i+1}. ${result.title}*\n`;
            responseText += `${result.snippet}\n`;
            responseText += `${result.link}\n\n`;
        }
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Sent search results to ${msg.from} for query: ${query}`);
    } catch (error) {
        logger.error(`Error handling search command: ${error.message}`, { error });
        await client.sendMessage(msg.from, "Sorry, I couldn't perform the search at this time.");
    }
}

// Handle all incoming commands
async function handleCommand(client, msg) {
    try {
        // Parse command
        const { command, args } = parseCommand(msg);
        const userId = msg.author || msg.from.split('@')[0];
        const chatId = msg.from;
        
        logger.debug(`Processing command: ${command} with args: ${args.join(' ')}`);
        
        // Route command to appropriate handler
        switch (command) {
            case config.COMMANDS.help:
                await handleHelpCommand(client, msg);
                break;
                
            case config.COMMANDS.list:
                await handleListCommand(client, msg);
                break;
                
            case config.COMMANDS.use:
                await handleUseCommand(client, msg, userId, args);
                break;
                
            case config.COMMANDS.model:
                await handleModelCommand(client, msg, userId, args);
                break;
                
            case config.COMMANDS.clear:
                await handleClearCommand(client, msg, userId, chatId);
                break;
                
            case config.COMMANDS.price:
                await handlePriceCommand(client, msg, args);
                break;
                
            case config.COMMANDS.reminder:
                await reminderController.handleReminderCommand(
                    client, msg, userId, chatId, msg.isGroup, args.join(' ')
                );
                break;
                
            case config.COMMANDS.listReminders:
                await reminderController.handleListRemindersCommand(client, msg, userId);
                break;
                
            case config.COMMANDS.removeReminder:
                await reminderController.handleRemoveReminderCommand(client, msg, userId, args[0]);
                break;
                
            case config.COMMANDS.search:
                await handleSearchCommand(client, msg, args);
                break;
                
            default:
                await client.sendMessage(
                    msg.from, 
                    `Unknown command: *${command}*. Type ${config.COMMANDS.prefix}${config.COMMANDS.help} for available commands.`
                );
        }
    } catch (error) {
        logger.error(`Error processing command: ${error.message}`, { error });
    }
}

module.exports = {
    isCommand,
    parseCommand,
    handleCommand
};