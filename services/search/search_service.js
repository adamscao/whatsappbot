// services/search/search_service.js
// Search service for performing web searches

const axios = require('axios');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// Google Search API key and Engine ID
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_SEARCH_ENGINE_ID = process.env.GOOGLE_SEARCH_ENGINE_ID;

// Search the web for information
async function search(query, useChineseSearch = false, maxResults = config.SEARCH.maxResults) {
    try {
        if (!query) {
            throw new Error('No search query provided');
        }
        
        // Clean and encode the query
        const cleanQuery = query.trim();
        const encodedQuery = encodeURIComponent(cleanQuery);
        
        // Select API and parameters based on search type
        const apiKey = GOOGLE_API_KEY;
        const searchEngineId = GOOGLE_SEARCH_ENGINE_ID;
        
        if (!apiKey || !searchEngineId) {
            throw new Error('Google Search API credentials not configured');
        }
        
        // Add language parameter if Chinese search is requested
        const langParam = useChineseSearch ? '&lr=lang_zh-CN' : '';
        
        // Construct the Google Custom Search API URL
        const apiUrl = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodedQuery}&num=${maxResults}${langParam}`;
        
        logger.debug(`Searching for: ${cleanQuery} (Chinese: ${useChineseSearch})`);
        
        // Make the API request
        const response = await axios.get(apiUrl, {
            timeout: config.SEARCH.timeout || 15000
        });
        
        if (!response.data || !response.data.items || response.data.items.length === 0) {
            logger.warn(`No search results found for query: ${cleanQuery}`);
            return [];
        }
        
        // Format the results
        const results = response.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet || '',
            source: 'Google'
        }));
        
        logger.debug(`Found ${results.length} search results for: ${cleanQuery}`);
        return results;
    } catch (error) {
        logger.error(`Error searching the web: ${error.message}`, { error });
        return [];
    }
}

// Format search results for AI context
function formatSearchResults(results, maxResults = 3) {
    try {
        if (!results || results.length === 0) {
            return '';
        }
        
        // Limit the number of results
        const limitedResults = results.slice(0, maxResults);
        
        // Format the results as markdown
        let formattedResults = '### Search Results\n\n';
        
        limitedResults.forEach((result, index) => {
            formattedResults += `**${index + 1}. ${result.title}**\n`;
            formattedResults += `${result.snippet}\n`;
            formattedResults += `Source: ${result.link}\n\n`;
        });
        
        return formattedResults;
    } catch (error) {
        logger.error(`Error formatting search results: ${error.message}`, { error });
        return '';
    }
}

// Perform search and augment AI prompt with results
async function searchAndAugmentPrompt(query, originalPrompt) {
    try {
        if (!query || !originalPrompt) {
            return originalPrompt;
        }
        
        // Perform the search
        const searchResults = await search(query);
        
        if (!searchResults || searchResults.length === 0) {
            return originalPrompt;
        }
        
        // Format the results
        const formattedResults = formatSearchResults(searchResults);
        
        // Augment the prompt
        const augmentedPrompt = `${originalPrompt}\n\nHere's some information that might help answer the question:\n\n${formattedResults}`;
        
        return augmentedPrompt;
    } catch (error) {
        logger.error(`Error augmenting prompt with search results: ${error.message}`, { error });
        return originalPrompt;
    }
}

module.exports = {
    search,
    formatSearchResults,
    searchAndAugmentPrompt
};