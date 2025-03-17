// services/ai/anthropic.js
// Anthropic API integration service

const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');

// Anthropic client instance
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

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