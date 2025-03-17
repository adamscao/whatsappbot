// services/crypto/price_service.js
// Cryptocurrency price service for fetching and formatting crypto prices

const axios = require('axios');
const logger = require('../../utils/logger');

const config = require('../../config/config');
const schedule = require('node-schedule');

// Fetch cryptocurrency prices from API
async function getCryptoPrices(symbol = 'all') {
    try {
        // Use the config settings
        const currenciesToFetch = symbol.toLowerCase() === 'all' 
            ? config.CRYPTO_SCHEDULER.currencies 
            : [symbol.toUpperCase()];
        
        // Join currencies with comma for API
        const currencyParam = currenciesToFetch.join(',');
        
        // Currency conversion units
        const vsCurrencies = 'usd,eur';
        
        // Build API URL
        const url = `${config.CRYPTO_SCHEDULER.apiEndpoint}?ids=${currencyParam.toLowerCase()}&vs_currencies=${vsCurrencies}&include_24hr_change=true`;
        
        logger.debug(`Fetching cryptocurrency prices from: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 10000 // 10 seconds timeout
        });
        
        if (!response.data || Object.keys(response.data).length === 0) {
            return `No price data available for ${currencyParam}`;
        }
        
        // Format the response to include USD and EUR prices
        const formattedData = {};
        
        for (const [coin, priceData] of Object.entries(response.data)) {
            const coinUpper = coin.toUpperCase();
            
            formattedData[coinUpper] = {
                usd: priceData.usd || 0,
                eur: priceData.eur || 0,
                usd_24h_change: priceData.usd_24h_change || 0,
                eur_24h_change: priceData.eur_24h_change || 0
            };
        }
        
        logger.debug(`Fetched prices for ${Object.keys(formattedData).length} cryptocurrencies`);
        return formattedData;
    } catch (error) {
        logger.error(`Error fetching cryptocurrency prices: ${error.message}`, { error });
        return `Error fetching cryptocurrency prices: ${error.message}`;
    }
}

// Format cryptocurrency prices for display
function formatCryptoPrices(priceData) {
    if (typeof priceData === 'string') {
        // Error message
        return priceData;
    }
    
    try {
        let formattedText = "*Cryptocurrency Prices*\n\n";
        
        for (const [coin, data] of Object.entries(priceData)) {
            // Format USD price with thousands separators
            const usdPrice = data.usd.toLocaleString('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: data.usd < 1 ? 4 : 2
            });
            
            // Format EUR price with thousands separators
            const eurPrice = data.eur.toLocaleString('en-US', {
                style: 'currency',
                currency: 'EUR',
                minimumFractionDigits: 2,
                maximumFractionDigits: data.eur < 1 ? 4 : 2
            });
            
            // Format 24h changes
            const usdChange = data.usd_24h_change.toFixed(2);
            const eurChange = data.eur_24h_change.toFixed(2);
            
            // Add emoji based on price change
            const changeEmoji = data.usd_24h_change >= 0 ? '📈' : '📉';
            
            formattedText += `*${coin}* ${changeEmoji}\n`;
            formattedText += `USD: ${usdPrice} (${usdChange}%)\n`;
            formattedText += `EUR: ${eurPrice} (${eurChange}%)\n\n`;
        }
        
        return formattedText;
    } catch (error) {
        logger.error(`Error formatting cryptocurrency prices: ${error.message}`, { error });
        return "Error formatting cryptocurrency prices.";
    }
}

// Send cryptocurrency prices to specified chats
async function sendCryptoPrices(client, chatIds = []) {
    try {
        const priceData = await getCryptoPrices('all');
        const formattedPrices = formatCryptoPrices(priceData);
        
        if (!chatIds || chatIds.length === 0) {
            logger.debug('No chat IDs provided for sending cryptocurrency prices');
            return;
        }
        
        // Send prices to each chat
        for (const chatId of chatIds) {
            try {
                await client.sendMessage(chatId, formattedPrices);
                logger.debug(`Sent cryptocurrency prices to ${chatId}`);
            } catch (error) {
                logger.error(`Error sending prices to chat ${chatId}: ${error.message}`, { error });
            }
        }
    } catch (error) {
        logger.error(`Error in sendCryptoPrices: ${error.message}`, { error });
    }
}

// Schedule regular cryptocurrency price updates
function scheduleCryptoPriceUpdates(client, scheduler, chatIds = []) {
    try {
        if (!client || !scheduler) {
            logger.error('Invalid parameters for scheduling crypto price updates');
            return false;
        }
        
        const targetChats = chatIds.length > 0 ? chatIds : config.CRYPTO_SCHEDULER.targetGroups;
        
        if (!targetChats || targetChats.length === 0) {
            logger.debug('No target chats for cryptocurrency price updates');
            return false;
        }
        
        // Create a recurring rule based on the interval in config
        const interval = config.CRYPTO_SCHEDULER.intervalHours || 4;
        const rule = new schedule.RecurrenceRule();
        rule.hour = new schedule.Range(0, 23, interval);
        rule.minute = 0;
        
        // Schedule the job
        scheduler.scheduleRecurringJob('crypto_price_updates', rule, async () => {
            await sendCryptoPrices(client, targetChats);
        });
        
        logger.info(`Scheduled cryptocurrency price updates every ${interval} hours`);
        return true;
    } catch (error) {
        logger.error(`Error scheduling cryptocurrency updates: ${error.message}`, { error });
        return false;
    }
}

module.exports = {
    getCryptoPrices,
    formatCryptoPrices,
    sendCryptoPrices,
    scheduleCryptoPriceUpdates
};