// app.js
// Main application entry point - initializes WhatsApp client, database, and services

// Load environment variables
require('dotenv').config();

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./database/db');
const messageController = require('./controllers/message_controller');
const commandController = require('./controllers/command_controller');
const reminderService = require('./services/reminder/reminder_service');
const priceService = require('./services/crypto/price_service');
const scheduler = require('./utils/scheduler');
const logger = require('./utils/logger');
const messageParser = require('./utils/message_parser');
const config = require('./config/config');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/snap/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-features=IsolateOrigins,site-per-process'
        ]
    }
});

// Flag to prevent duplicate initialization
let isInitialized = false;

// QR code generation event handler
function handleQRCode(qr) {
    qrcode.generate(qr, { small: true });
    logger.info('QR code generated. Scan with WhatsApp to authenticate.');
}

// Ready event handler
function handleReady() {
    // Prevent duplicate initialization
    if (isInitialized) {
        logger.debug('Client already initialized, skipping duplicate ready event');
        return;
    }

    logger.info('WhatsApp client is ready');

    // Test if client can receive messages
    logger.debug('Message handler registered, waiting for messages...');

    // Initialize scheduled tasks
    scheduler.initScheduler();

    // Initialize reminder service
    reminderService.initReminderService(client);

    // Initialize cryptocurrency price updates
    priceService.scheduleCryptoPriceUpdates(client, scheduler);

    // Log client info
    logger.info(`Logged in as: ${client.info.wid.user}`);

    // Mark as initialized
    isInitialized = true;
}

// Message event handler
async function handleMessage(message) {
    try {
        logger.debug(`[MESSAGE EVENT FIRED] From: ${message.from}, IsStatus: ${message.isStatus}, Body: ${message.body ? message.body.substring(0, 50) : 'no body'}`);

        // Skip status messages
        if (message.isStatus) {
            logger.debug('Skipping status message');
            return;
        }

        // Skip messages from self
        if (message.fromMe) {
            logger.debug('Skipping message from self');
            return;
        }

        logger.debug(`Received message from ${message.from}: ${message.body}`);
        
        // Determine if it's a group chat
        const isGroup = messageParser.isGroupMessage(message);

        // For group chats, check if bot is mentioned or group is whitelisted
        if (isGroup) {
            const isWhitelisted = config.GROUP_WHITELIST.enabled &&
                                  config.GROUP_WHITELIST.groups.includes(message.from);
            const isMentioned = messageParser.isBotMentioned(
                message,
                client.info.wid._serialized,
                config.BOT_IDS.ids
            );

            // Skip if not mentioned and not in whitelist
            if (!isMentioned && !isWhitelisted) {
                logger.debug('Message in group but bot not mentioned and not whitelisted, ignoring');
                return;
            }

            if (isMentioned) {
                logger.debug('Bot mentioned in group chat, processing message');
            } else if (isWhitelisted) {
                logger.debug('Message in whitelisted group, processing message');
            }
        }
        
        // Remove bot mention regardless of whether it's a group or private chat
        const processedBody = messageParser.removeBotMention(message.body, client.info.wid.user);
        
        // Create a processed message object with the modified body
        const processedMessage = {...message, body: processedBody};
        
        logger.debug(`Processed message: ${processedBody}`);
        
        // Check if processed message is a command
        if (processedBody.startsWith(config.COMMANDS.prefix) || 
            processedBody.startsWith('!') || 
            processedBody.startsWith('/')) {
            logger.debug(`Detected command: ${processedBody}`);
            await commandController.handleCommand(client, processedMessage);
            return;
        }
        
        // Not a command, handle as regular message
        await messageController.handleMessage(client, processedMessage);
    } catch (error) {
        logger.error(`Error handling message: ${error.message}`, { error });
    }
}

// Authentication failure handler
function handleAuthFailure(error) {
    logger.error('Authentication failed', { error });
    logger.info('Please delete the .wwebjs_auth directory and restart the application');
    process.exit(1);
}

// Disconnection handler
function handleDisconnected(reason) {
    logger.warn('WhatsApp client disconnected', { reason });
    isInitialized = false;
}

// Loading screen handler
function handleLoadingScreen(percent, message) {
    logger.debug(`Loading: ${percent}% - ${message}`);
}

// Initialize application
async function initializeApp() {
    try {
        // Initialize database
        await db.initialize();
        logger.info('Database initialized successfully');
        
        // Set up event handlers
        client.on('qr', handleQRCode);
        client.on('ready', handleReady);
        client.on('message', handleMessage);
        client.on('auth_failure', handleAuthFailure);
        client.on('disconnected', handleDisconnected);
        client.on('loading_screen', handleLoadingScreen);
        
        // Start WhatsApp client
        logger.info('Starting WhatsApp client...');
        await client.initialize();
    } catch (error) {
        logger.error(`Failed to initialize application: ${error.message}`, { 
            error, 
            stack: error.stack 
        });
        process.exit(1);
    }
}

// Main execution
function main() {
    logger.info('Starting WhatsApp bot...');
    initializeApp();
}

// Global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection:', {
        reason: reason ? reason.toString() : 'Unknown',
        stack: reason && reason.stack ? reason.stack : 'No stack trace'
    });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', {
        error: error.message,
        stack: error.stack
    });
});

main();