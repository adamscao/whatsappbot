// services/ai/anthropic.js
// Anthropic API integration service

// Load environment variables first
require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

// Anthropic client instance - lazy initialization
let anthropic = null;

function getAnthropicClient() {
    if (!anthropic) {
        anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY
        });
    }
    return anthropic;
}

// Send message to Anthropic
async function sendMessage(message, messageHistory, model) {
    // Send message to Anthropic API and return response
}

// Get list of available models
async function getAvailableModels() {
    // Get list of available models from Anthropic API
}

module.exports = {
    sendMessage,
    getAvailableModels
};