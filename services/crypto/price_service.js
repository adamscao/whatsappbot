// services/crypto/price_service.js
// Cryptocurrency price service for fetching and formatting crypto prices

const axios = require('axios');
const logger = require('../../utils/logger');

const config = require('../../config/config');
const schedule = require('node-schedule');

// Store mapping of symbols to CoinGecko IDs
let symbolToIdMap = {};
let idToSymbolMap = {};

// Fetch all coins list from CoinGecko to build a symbol to ID mapping
async function initCoinMappings() {
    try {
        logger.debug('Initializing cryptocurrency symbol mappings');
        
        // CoinGecko API endpoint for coin list
        const url = 'https://api.coingecko.com/api/v3/coins/list';
        
        const response = await axios.get(url, {
            timeout: 15000 // 15 seconds timeout
        });
        
        if (!response.data || !Array.isArray(response.data)) {
            throw new Error('Invalid response format from CoinGecko API');
        }
        
        // Reset the mappings
        symbolToIdMap = {};
        idToSymbolMap = {};
        
        // Build mappings
        for (const coin of response.data) {
            if (coin.symbol && coin.id) {
                const upperSymbol = coin.symbol.toUpperCase();
                
                // For symbols with multiple coins, prefer the more "canonical" ones
                // For example, prefer "bitcoin" over "bitcoin-cash" for BTC
                if (!symbolToIdMap[upperSymbol] || isPriorityCoin(coin.id)) {
                    symbolToIdMap[upperSymbol] = coin.id;
                }
                
                // Also store reverse mapping
                idToSymbolMap[coin.id] = upperSymbol;
            }
        }
        
        logger.info(`Initialized mappings for ${Object.keys(symbolToIdMap).length} cryptocurrencies`);
        
        // Validate that all configured currencies can be mapped
        const configuredSymbols = config.CRYPTO_SCHEDULER.currencies;
        const unmappableSymbols = configuredSymbols.filter(sym => !symbolToIdMap[sym]);
        
        if (unmappableSymbols.length > 0) {
            logger.warn(`Could not map the following symbols to CoinGecko IDs: ${unmappableSymbols.join(', ')}`);
        }
        
        return true;
    } catch (error) {
        logger.error(`Error initializing coin mappings: ${error.message}`, { error });
        
        // Set fallback mappings for common cryptocurrencies
        symbolToIdMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'LTC': 'litecoin',
            'BCH': 'bitcoin-cash'
        };
        
        idToSymbolMap = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'litecoin': 'LTC',
            'bitcoin-cash': 'BCH'
        };
        
        logger.warn('Using fallback cryptocurrency mappings');
        return false;
    }
}

// Helper to prioritize certain coin IDs when there are multiple options for a symbol
function isPriorityCoin(id) {
    const priorities = [
        'bitcoin', 'ethereum', 'litecoin', 'bitcoin-cash', 
        'binancecoin', 'ripple', 'cardano', 'polkadot'
    ];
    return priorities.includes(id);
}

// Get CoinGecko ID for a symbol
function getCoinId(symbol) {
    const upperSymbol = symbol.toUpperCase();
    return symbolToIdMap[upperSymbol] || symbol.toLowerCase();
}

// Fetch cryptocurrency prices from API
async function getCryptoPrices(symbol = 'all') {
    try {
        // Ensure mappings are initialized
        if (Object.keys(symbolToIdMap).length === 0) {
            await initCoinMappings();
        }
        
        // Determine which currencies to fetch
        let currenciesToFetch = [];
        
        if (symbol.toLowerCase() === 'all') {
            // Use the config settings and map to proper IDs
            currenciesToFetch = config.CRYPTO_SCHEDULER.currencies.map(sym => getCoinId(sym));
        } else {
            // Single currency - map to CoinGecko ID
            currenciesToFetch = [getCoinId(symbol)];
        }
        
        // Join currencies with comma for API
        const currencyParam = currenciesToFetch.join(',');
        
        // Currency conversion units
        const vsCurrencies = 'usd,cny';
        
        // Build API URL
        const url = `${config.CRYPTO_SCHEDULER.apiEndpoint}?ids=${currencyParam}&vs_currencies=${vsCurrencies}&include_24hr_change=true`;
        
        logger.debug(`Fetching cryptocurrency prices from: ${url}`);
        
        const response = await axios.get(url, {
            timeout: 10000 // 10 seconds timeout
        });
        
        if (!response.data || Object.keys(response.data).length === 0) {
            return `No price data available for ${currencyParam}`;
        }
        
        // Format the response
        const formattedData = {};
        
        for (const [coinId, priceData] of Object.entries(response.data)) {
            // Convert back to symbol (like BTC) if available, or use the ID
            const coinSymbol = idToSymbolMap[coinId] || coinId.toUpperCase();
            
            formattedData[coinSymbol] = {
                usd: priceData.usd || 0,
                cny: priceData.cny || 0,
                usd_24h_change: priceData.usd_24h_change || 0,
                cny_24h_change: priceData.cny_24h_change || 0
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
        formattedText += "====================\n";
        formattedText += "货币   USD     CNY     涨跌幅\n";
        formattedText += "====================\n";
        
        for (const [coin, data] of Object.entries(priceData)) {
            // Format USD price
            const usdPrice = data.usd.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: data.usd < 1 ? 4 : 2
            });
            
            // Format CNY price
            const cnyPrice = data.cny.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: data.cny < 1 ? 4 : 2
            });
            
            // Format 24h change
            const change = data.usd_24h_change.toFixed(2);
            const changeSign = data.usd_24h_change >= 0 ? '+' : '';
            
            formattedText += `${coin} : $ ${usdPrice.padStart(6)} ¥ ${cnyPrice.padStart(6)}    ${changeSign}${change}%\n`;
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
        
        // Initialize coin mappings
        initCoinMappings();
        
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
    initCoinMappings,
    getCryptoPrices,
    formatCryptoPrices,
    sendCryptoPrices,
    scheduleCryptoPriceUpdates
};