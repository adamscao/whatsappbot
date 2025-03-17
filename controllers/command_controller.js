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
        const helpText = `*WhatsApp AI 机器人帮助*

可用命令：
${config.COMMANDS.prefix}${config.COMMANDS.help} - 显示此帮助信息
${config.COMMANDS.prefix}${config.COMMANDS.list} - 列出可用的 AI 引擎和模型
${config.COMMANDS.prefix}${config.COMMANDS.use} <引擎> - 切换到不同的 AI 引擎
${config.COMMANDS.prefix}${config.COMMANDS.model} <模型> - 切换到不同的 AI 模型
${config.COMMANDS.prefix}${config.COMMANDS.clear} - 清除你的对话历史
${config.COMMANDS.prefix}${config.COMMANDS.price} [代币符号] - 获取加密货币价格
${config.COMMANDS.prefix}${config.COMMANDS.reminder} <内容> - 设置提醒
${config.COMMANDS.prefix}${config.COMMANDS.listReminders} - 列出你的所有提醒
${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} <ID> - 删除指定提醒
${config.COMMANDS.prefix}${config.COMMANDS.search} <查询内容> - 执行网页搜索

示例：输入 "${config.COMMANDS.prefix}${config.COMMANDS.use} anthropic" 切换到 Claude AI`;

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
            await client.sendMessage(msg.from, "当前没有可用的 AI 引擎，请检查您的配置。");
            return;
        }
        
        let responseText = "*可用的 AI 引擎和模型*\n\n";
        
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
        
        responseText += `您当前的引擎: *${userPrefs.engine}*\n`;
        responseText += `您当前的模型: *${userPrefs.model}*\n\n`;
        responseText += `切换引擎: ${config.COMMANDS.prefix}${config.COMMANDS.use} <引擎>\n`;
        responseText += `切换模型: ${config.COMMANDS.prefix}${config.COMMANDS.model} <模型>`;
        
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
            await client.sendMessage(msg.from, `请指定要使用的引擎。例如：${config.COMMANDS.prefix}${config.COMMANDS.use} openai`);
            return;
        }
        
        const requestedEngine = args[0].toLowerCase();
        
        // Check if engine exists and is available
        if (!engines.isEngineAvailable(requestedEngine)) {
            const availableEngines = Object.keys(engines.getAvailableEngines()).join(', ');
            await client.sendMessage(
                msg.from, 
                `引擎 "${requestedEngine}" 不可用。可用引擎：${availableEngines || '无'}`
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
            `已切换到 *${requestedEngine}* 引擎，使用模型 *${defaultModel}*`
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
            await client.sendMessage(msg.from, `请指定要使用的模型。例如：${config.COMMANDS.prefix}${config.COMMANDS.model} gpt-4o`);
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
                await client.sendMessage(msg.from, `您当前的引擎 "${userEngine}" 配置不正确。`);
                return;
            }
            
            const availableModels = engineConfig.models.join(', ');
            await client.sendMessage(
                msg.from, 
                `模型 "${requestedModel}" 不适用于 ${userEngine}。可用模型：${availableModels}`
            );
            return;
        }
        
        // Save user preference
        await userPreferences.setUserModel(userId, msg.from, requestedModel);
        
        await client.sendMessage(
            msg.from, 
            `已为 *${userEngine}* 引擎切换到模型 *${requestedModel}*`
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
        
        await client.sendMessage(msg.from, "您的对话历史已清除。");
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
        
        // Send a "loading" message to improve user experience
        await client.sendMessage(msg.from, "正在获取加密货币价格...");
        
        const priceData = await priceService.getCryptoPrices(symbol);
        const responseText = priceService.formatCryptoPrices(priceData);
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Sent price data to ${msg.from}`);
    } catch (error) {
        logger.error(`Error handling price command: ${error.message}`, { error });
        await client.sendMessage(msg.from, "抱歉，暂时无法获取加密货币价格，请稍后再试。");
    }
}

// Handle search command
async function handleSearchCommand(client, msg, args) {
    try {
        if (!args || args.length === 0) {
            await client.sendMessage(msg.from, `请指定搜索查询。例如：${config.COMMANDS.prefix}${config.COMMANDS.search} 最新新闻`);
            return;
        }
        
        const query = args.join(' ');
        await client.sendMessage(msg.from, `正在搜索："${query}"...`);
        
        // Check if user wants Chinese search
        const useChineseSearch = query.toLowerCase().includes('chinese') || 
                                query.includes('中文') || 
                                query.includes('中国');
        
        // Process search query
        const processedQuery = await aiService.processSearchQuery(query, useChineseSearch);
        
        // Perform search
        const searchResults = await searchService.search(processedQuery, useChineseSearch);
        
        if (!searchResults || searchResults.length === 0) {
            await client.sendMessage(msg.from, "未找到搜索结果，请尝试其他查询。");
            return;
        }
        
        // Format search results
        let responseText = `*搜索结果：${query}*\n\n`;
        
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
        await client.sendMessage(msg.from, "抱歉，暂时无法进行搜索。");
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
                    `未知命令：*${command}*。请输入 ${config.COMMANDS.prefix}${config.COMMANDS.help} 查看可用命令。`
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
