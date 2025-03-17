// services/reminder/reminder_service.js
// Reminder service for managing user reminders

const reminderModel = require('../../database/models/reminder');
const aiService = require('../ai/ai_service');
const logger = require('../../utils/logger');
const scheduler = require('../../utils/scheduler');
const config = require('../../config/config');
const schedule = require('node-schedule');

// Process natural language reminder text into structured data
async function processReminderText(reminderText) {
    try {
        if (!reminderText) {
            throw new Error('No reminder text provided');
        }
        
        // Use AI to extract time and content
        const parsedReminder = await aiService.preprocessReminder(reminderText);
        
        if (!parsedReminder || !parsedReminder.time || !parsedReminder.content) {
            logger.warn(`Failed to parse reminder text: ${reminderText}`);
            return null;
        }
        
        logger.debug(`Parsed reminder: ${JSON.stringify(parsedReminder)}`);
        return parsedReminder;
    } catch (error) {
        logger.error(`Error processing reminder text: ${error.message}`, { error });
        return null;
    }
}

// Create a new reminder
async function createReminder(reminder) {
    try {
        if (!reminder || !reminder.userId || !reminder.chatId || !reminder.content || !reminder.time) {
            throw new Error('Invalid reminder data');
        }
        
        // Create reminder in database
        const reminderId = await reminderModel.createReminder(reminder);
        
        if (!reminderId) {
            throw new Error('Failed to create reminder in database');
        }
        
        logger.debug(`Created reminder ${reminderId} for user ${reminder.userId}`);
        return reminderId;
    } catch (error) {
        logger.error(`Error creating reminder: ${error.message}`, { error });
        return null;
    }
}

// Get list of user reminders
async function getUserReminders(userId) {
    try {
        if (!userId) {
            throw new Error('No user ID provided');
        }
        
        const reminders = await reminderModel.getUserReminders(userId);
        logger.debug(`Retrieved ${reminders.length} reminders for user ${userId}`);
        return reminders;
    } catch (error) {
        logger.error(`Error getting user reminders: ${error.message}`, { error });
        return [];
    }
}

// Remove a specific reminder
async function removeReminder(reminderId, userId = null) {
    try {
        if (!reminderId) {
            throw new Error('No reminder ID provided');
        }
        
        const success = await reminderModel.removeReminder(reminderId, userId);
        
        if (success) {
            logger.debug(`Removed reminder ${reminderId}`);
            return true;
        } else {
            logger.warn(`Failed to remove reminder ${reminderId}`);
            return false;
        }
    } catch (error) {
        logger.error(`Error removing reminder: ${error.message}`, { error });
        return false;
    }
}

// Get reminder by ID
async function getReminderById(reminderId) {
    try {
        if (!reminderId) {
            throw new Error('No reminder ID provided');
        }
        
        const reminder = await reminderModel.getReminderById(reminderId);
        return reminder;
    } catch (error) {
        logger.error(`Error getting reminder by ID: ${error.message}`, { error });
        return null;
    }
}

// Send reminder notification
async function sendReminderNotification(client, reminder) {
    try {
        if (!client || !reminder) {
            throw new Error('Invalid parameters for sending reminder notification');
        }
        
        const chatId = reminder.chat_id;
        const prefix = config.REMINDERS.defaultReminderPrefix || '⏰ Reminder: ';
        const message = `${prefix}${reminder.content}`;
        
        // Send notification
        await client.sendMessage(chatId, message);
        
        // Mark reminder as triggered
        await reminderModel.markReminderAsTriggered(reminder.id);
        
        logger.debug(`Sent reminder notification for reminder ${reminder.id} to chat ${chatId}`);
        return true;
    } catch (error) {
        logger.error(`Error sending reminder notification: ${error.message}`, { error });
        return false;
    }
}

// Schedule a reminder with the scheduler
function scheduleReminderNotification(client, reminder) {
    try {
        if (!client || !reminder || !reminder.id || !reminder.trigger_time) {
            logger.error('Invalid parameters for scheduling reminder notification');
            return false;
        }
        
        const triggerTime = new Date(reminder.trigger_time);
        
        // If the trigger time is in the past, send immediately
        if (triggerTime <= new Date()) {
            sendReminderNotification(client, reminder);
            return true;
        }
        
        // Schedule for future time
        return scheduler.scheduleReminder(reminder.id, triggerTime, async () => {
            await sendReminderNotification(client, reminder);
        });
    } catch (error) {
        logger.error(`Error scheduling reminder notification: ${error.message}`, { error });
        return false;
    }
}

// Initialize reminder service
function initReminderService(client) {
    try {
        if (!client) {
            throw new Error('WhatsApp client is required to initialize reminder service');
        }
        
        logger.info('Initializing reminder service');
        
        // Check for pending reminders every minute
        const checkInterval = config.REMINDERS.checkIntervalMinutes || 1;
        const rule = new schedule.RecurrenceRule();
        rule.minute = new schedule.Range(0, 59, checkInterval);
        
        // Schedule the recurring check
        scheduler.scheduleRecurringJob('reminder_check', rule, async () => {
            await checkPendingReminders(client);
        });
        
        // Also check immediately on startup
        setTimeout(() => {
            checkPendingReminders(client);
        }, 5000);
        
        logger.info(`Reminder service initialized, checking every ${checkInterval} minutes`);
        return true;
    } catch (error) {
        logger.error(`Error initializing reminder service: ${error.message}`, { error });
        return false;
    }
}

// Check for pending reminders
async function checkPendingReminders(client) {
    try {
        logger.debug('Checking for pending reminders');
        
        // Get all pending reminders
        const pendingReminders = await reminderModel.getPendingReminders();
        
        if (pendingReminders.length === 0) {
            logger.debug('No pending reminders to process');
            return;
        }
        
        logger.debug(`Found ${pendingReminders.length} pending reminders`);
        
        // Process each pending reminder
        for (const reminder of pendingReminders) {
            try {
                await sendReminderNotification(client, reminder);
            } catch (sendError) {
                logger.error(`Error sending reminder ${reminder.id}: ${sendError.message}`, { error: sendError });
            }
        }
    } catch (error) {
        logger.error(`Error checking pending reminders: ${error.message}`, { error });
    }
}

// Schedule future reminders on startup
async function scheduleFutureReminders(client) {
    try {
        logger.debug('Scheduling future reminders');
        
        // Get all future reminders
        const futureReminders = await reminderModel.getFutureReminders();
        
        if (futureReminders.length === 0) {
            logger.debug('No future reminders to schedule');
            return;
        }
        
        logger.debug(`Scheduling ${futureReminders.length} future reminders`);
        
        // Schedule each future reminder
        for (const reminder of futureReminders) {
            try {
                scheduleReminderNotification(client, reminder);
            } catch (scheduleError) {
                logger.error(`Error scheduling reminder ${reminder.id}: ${scheduleError.message}`, { error: scheduleError });
            }
        }
    } catch (error) {
        logger.error(`Error scheduling future reminders: ${error.message}`, { error });
    }
}

module.exports = {
    processReminderText,
    createReminder,
    getUserReminders,
    removeReminder,
    getReminderById,
    sendReminderNotification,
    scheduleReminderNotification,
    initReminderService,
    checkPendingReminders,
    scheduleFutureReminders
};