#!/usr/bin/env node

// scripts/fetch-models.js
// Fetch available models from all configured AI providers and generate models.example.json

require('dotenv').config();
const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const logger = {
    info: (msg) => console.log(`ℹ ${msg}`),
    success: (msg) => console.log(`✓ ${msg}`),
    warn: (msg) => console.log(`⚠ ${msg}`),
    error: (msg) => console.error(`✗ ${msg}`),
};

// Fetch models from OpenAI
async function fetchOpenAIModels() {
    if (!process.env.OPENAI_API_KEY) {
        logger.warn('OPENAI_API_KEY not configured, skipping OpenAI models');
        return null;
    }

    try {
        logger.info('Fetching OpenAI models...');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const response = await openai.models.list();

        const models = response.data
            .filter(model => {
                // Filter for chat models (gpt-*, o1-*, chatgpt-*)
                return model.id.startsWith('gpt-') ||
                       model.id.startsWith('o1-') ||
                       model.id.startsWith('o3-') ||
                       model.id.startsWith('chatgpt-');
            })
            .map(model => ({
                id: model.id,
                name: formatModelName(model.id),
                description: getModelDescription(model.id, 'openai'),
                enabled: false
            }))
            .sort((a, b) => {
                // Sort by version (newer first), then by name
                const aVersion = extractVersion(a.id);
                const bVersion = extractVersion(b.id);
                if (aVersion !== bVersion) return bVersion - aVersion;
                return a.id.localeCompare(b.id);
            });

        logger.success(`Found ${models.length} OpenAI models`);
        return {
            envKey: 'OPENAI_API_KEY',
            defaultModel: 'gpt-5',
            models
        };
    } catch (error) {
        logger.error(`Failed to fetch OpenAI models: ${error.message}`);
        return null;
    }
}

// Fetch models from Anthropic (hardcoded as no public list API)
async function fetchAnthropicModels() {
    if (!process.env.ANTHROPIC_API_KEY) {
        logger.warn('ANTHROPIC_API_KEY not configured, skipping Anthropic models');
        return null;
    }

    try {
        logger.info('Fetching Anthropic models...');
        // Anthropic doesn't have a public models list API, use known models
        const models = [
            {
                id: 'claude-sonnet-4-20250514',
                name: 'Claude Sonnet 4',
                description: 'Balanced performance and cost',
                enabled: false
            },
            {
                id: 'claude-opus-4-20250514',
                name: 'Claude Opus 4',
                description: 'Most capable Claude model',
                enabled: false
            },
            {
                id: 'claude-3-7-sonnet-20250219',
                name: 'Claude 3.7 Sonnet',
                description: 'Latest Sonnet model with improved capabilities',
                enabled: false
            },
            {
                id: 'claude-3-5-sonnet-20241022',
                name: 'Claude 3.5 Sonnet',
                description: 'Previous generation Sonnet model',
                enabled: false
            },
            {
                id: 'claude-3-5-haiku-20241022',
                name: 'Claude 3.5 Haiku',
                description: 'Fast and efficient model',
                enabled: false
            },
            {
                id: 'claude-3-opus-20240229',
                name: 'Claude 3 Opus',
                description: 'Claude 3 family\'s most capable model',
                enabled: false
            }
        ];

        logger.success(`Found ${models.length} Anthropic models`);
        return {
            envKey: 'ANTHROPIC_API_KEY',
            defaultModel: 'claude-sonnet-4-20250514',
            models
        };
    } catch (error) {
        logger.error(`Failed to fetch Anthropic models: ${error.message}`);
        return null;
    }
}

// Fetch models from Gemini (hardcoded as no public list API)
async function fetchGeminiModels() {
    if (!process.env.GEMINI_API_KEY) {
        logger.warn('GEMINI_API_KEY not configured, skipping Gemini models');
        return null;
    }

    try {
        logger.info('Fetching Gemini models...');
        // Gemini doesn't have a reliable models list API, use known models
        const models = [
            {
                id: 'gemini-2.0-flash-exp',
                name: 'Gemini 2.0 Flash (Experimental)',
                description: 'Latest experimental flash model',
                enabled: false
            },
            {
                id: 'gemini-2.0-flash-thinking-exp-01-21',
                name: 'Gemini 2.0 Flash Thinking',
                description: 'Experimental model with enhanced reasoning',
                enabled: false
            },
            {
                id: 'gemini-exp-1206',
                name: 'Gemini Experimental 1206',
                description: 'Experimental Gemini model',
                enabled: false
            },
            {
                id: 'gemini-1.5-pro-latest',
                name: 'Gemini 1.5 Pro',
                description: 'Production-ready Pro model',
                enabled: false
            },
            {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                description: 'Fast and efficient model',
                enabled: false
            }
        ];

        logger.success(`Found ${models.length} Gemini models`);
        return {
            envKey: 'GEMINI_API_KEY',
            defaultModel: 'gemini-2.0-flash-exp',
            models
        };
    } catch (error) {
        logger.error(`Failed to fetch Gemini models: ${error.message}`);
        return null;
    }
}

// Fetch models from DeepSeek
async function fetchDeepSeekModels() {
    if (!process.env.DEEPSEEK_API_KEY) {
        logger.warn('DEEPSEEK_API_KEY not configured, skipping DeepSeek models');
        return null;
    }

    try {
        logger.info('Fetching DeepSeek models...');
        const deepseek = new OpenAI({
            baseURL: 'https://api.deepseek.com',
            apiKey: process.env.DEEPSEEK_API_KEY
        });

        const response = await deepseek.models.list();

        const models = response.data
            .map(model => ({
                id: model.id,
                name: formatModelName(model.id),
                description: getModelDescription(model.id, 'deepseek'),
                enabled: false
            }))
            .sort((a, b) => a.id.localeCompare(b.id));

        logger.success(`Found ${models.length} DeepSeek models`);
        return {
            envKey: 'DEEPSEEK_API_KEY',
            defaultModel: 'deepseek-chat',
            models
        };
    } catch (error) {
        logger.error(`Failed to fetch DeepSeek models: ${error.message}`);
        return null;
    }
}

// Helper functions
function formatModelName(modelId) {
    // Convert model ID to display name
    return modelId
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function extractVersion(modelId) {
    // Extract major version number for sorting
    const match = modelId.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
}

function getModelDescription(modelId, provider) {
    // Generate basic description based on model ID
    const id = modelId.toLowerCase();

    if (id.includes('nano')) return 'Lightweight and efficient model';
    if (id.includes('mini')) return 'Compact and cost-effective model';
    if (id.includes('flash')) return 'Fast and efficient model';
    if (id.includes('pro')) return 'Professional-grade model';
    if (id.includes('opus')) return 'Most capable model';
    if (id.includes('sonnet')) return 'Balanced performance and cost';
    if (id.includes('haiku')) return 'Fast and efficient model';
    if (id.includes('reasoning') || id.includes('reasoner')) return 'Specialized reasoning model';
    if (id.includes('thinking')) return 'Enhanced reasoning capabilities';
    if (id.includes('exp') || id.includes('preview')) return 'Experimental model';

    return `${provider} chat model`;
}

// Main function
async function main() {
    logger.info('Starting model fetch process...\n');

    const results = {};

    // Fetch models from all providers
    const openai = await fetchOpenAIModels();
    if (openai) results.openai = openai;

    const anthropic = await fetchAnthropicModels();
    if (anthropic) results.anthropic = anthropic;

    const gemini = await fetchGeminiModels();
    if (gemini) results.gemini = gemini;

    const deepseek = await fetchDeepSeekModels();
    if (deepseek) results.deepseek = deepseek;

    // Write to models.example.json
    const outputPath = path.join(__dirname, '../config/models.example.json');

    logger.info(`\nWriting results to ${outputPath}`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2) + '\n');

    logger.success(`\nSuccessfully generated models.example.json`);
    logger.info(`Total providers: ${Object.keys(results).length}`);
    logger.info(`Total models: ${Object.values(results).reduce((sum, provider) => sum + provider.models.length, 0)}`);

    console.log('\n' + '='.repeat(60));
    console.log('Summary:');
    console.log('='.repeat(60));
    Object.entries(results).forEach(([provider, config]) => {
        console.log(`${provider}: ${config.models.length} models (default: ${config.defaultModel})`);
    });
    console.log('='.repeat(60));

    console.log('\nNote: All models have been set to enabled=false by default.');
    console.log('Edit config/models.json to enable specific models.\n');
}

// Run the script
main().catch(error => {
    logger.error(`Script failed: ${error.message}`);
    process.exit(1);
});
