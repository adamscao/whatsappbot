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
const scheduler = require('./utils/scheduler');
const logger = require('./utils/logger');
const config = require('./config/config');

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// QR code generation event handler
function handleQRCode(qr) {
    qrcode.generate(qr, { small: true });
    logger.info('QR code generated. Scan with WhatsApp to authenticate.');
}

// Ready event handler
function handleReady() {
    logger.info('WhatsApp client is ready');
    
    // Initialize scheduled tasks
    scheduler.initScheduler();
    
    // Initialize reminder service
    reminderService.initReminderService(client);
    
    // Log client info
    logger.info(`Logged in as: ${client.info.wid.user}`);
}

// Message event handler
async function handleMessage(message) {
    try {
        // Skip status messages
        if (message.isStatus) return;
        
        logger.debug(`Received message from ${message.from}: ${message.body}`);
        
        // Check if message is a command
        if (message.body.startsWith(config.COMMANDS.prefix) || 
            message.body.startsWith('!') || 
            message.body.startsWith('/')) {
            await commandController.handleCommand(client, message);
            return;
        }
        
        // Handle as regular message
        await messageController.handleMessage(client, message);
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

main();