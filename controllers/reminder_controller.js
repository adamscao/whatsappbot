// controllers/reminder_controller.js
// Controller for handling reminder-related commands

const reminderService = require('../services/reminder/reminder_service');
const logger = require('../utils/logger');
const config = require('../config/config');

// Handle reminder command
async function handleReminderCommand(client, msg, userId, chatId, isGroup, reminderText) {
    try {
        if (!reminderText || reminderText.trim().length === 0) {
            await client.sendMessage(
                msg.from, 
                `Please specify the reminder text. Example: ${config.COMMANDS.prefix}${config.COMMANDS.reminder} Call John tomorrow at 3pm`
            );
            return;
        }
        
        // Let the user know we're processing
        await client.sendMessage(msg.from, "Processing your reminder...");
        
        // Use AI to extract time and content from reminder text
        const reminderData = await reminderService.processReminderText(reminderText);
        
        if (!reminderData || !reminderData.time || !reminderData.content) {
            await client.sendMessage(
                msg.from, 
                "I couldn't understand the time for this reminder. Please try again with a clearer time specification."
            );
            return;
        }
        
        // Create reminder
        const reminder = {
            userId,
            chatId,
            content: reminderData.content,
            time: new Date(reminderData.time),
            isGroup
        };
        
        const reminderId = await reminderService.createReminder(reminder);
        
        if (!reminderId) {
            throw new Error("Failed to create reminder");
        }
        
        // Confirm to user
        await client.sendMessage(
            msg.from, 
            `✅ Reminder set for *${reminderData.relativeTime}*:\n\n${reminderData.content}\n\nReminder ID: ${reminderId}`
        );
        
        logger.debug(`Created reminder for user ${userId} at ${reminderData.time}`);
    } catch (error) {
        logger.error(`Error handling reminder command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "I'm sorry, I couldn't set your reminder. Please try again with a different phrasing."
        );
    }
}

// Handle list reminders command
async function handleListRemindersCommand(client, msg, userId) {
    try {
        // Get user's reminders
        const reminders = await reminderService.getUserReminders(userId);
        
        if (!reminders || reminders.length === 0) {
            await client.sendMessage(msg.from, "You don't have any active reminders.");
            return;
        }
        
        // Format reminders list
        let responseText = "*Your Active Reminders*\n\n";
        
        for (const reminder of reminders) {
            const reminderTime = new Date(reminder.time);
            const timeString = reminderTime.toLocaleString();
            const timeFromNow = getRelativeTimeString(reminderTime);
            
            responseText += `*ID: ${reminder.id}*\n`;
            responseText += `${reminder.content}\n`;
            responseText += `Time: ${timeString} (${timeFromNow})\n\n`;
        }
        
        responseText += `To remove a reminder, use: ${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} <id>`;
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Listed ${reminders.length} reminders for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling list reminders command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "I'm sorry, I couldn't retrieve your reminders at this time."
        );
    }
}

// Handle remove reminder command
async function handleRemoveReminderCommand(client, msg, userId, reminderId) {
    try {
        if (!reminderId) {
            await client.sendMessage(
                msg.from, 
                `Please specify the reminder ID to remove. Example: ${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} 123`
            );
            return;
        }
        
        // Check if reminder exists and belongs to user
        const reminder = await reminderService.getReminderById(reminderId);
        
        if (!reminder) {
            await client.sendMessage(msg.from, `No reminder found with ID: ${reminderId}`);
            return;
        }
        
        if (reminder.userId !== userId) {
            await client.sendMessage(msg.from, "You don't have permission to remove this reminder.");
            return;
        }
        
        // Remove reminder
        const success = await reminderService.removeReminder(reminderId);
        
        if (!success) {
            throw new Error("Failed to remove reminder");
        }
        
        await client.sendMessage(msg.from, `✅ Reminder with ID ${reminderId} has been removed.`);
        logger.debug(`Removed reminder ${reminderId} for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling remove reminder command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "I'm sorry, I couldn't remove the reminder. Please check the ID and try again."
        );
    }
}

// Helper function to get relative time string
function getRelativeTimeString(dateTime) {
    const now = new Date();
    const diffMs = dateTime - now;
    
    // If in the past
    if (diffMs < 0) {
        return "in the past";
    }
    
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
        return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
        return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    } else if (diffMins > 0) {
        return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    } else {
        return `in ${diffSecs} second${diffSecs > 1 ? 's' : ''}`;
    }
}

module.exports = {
    handleReminderCommand,
    handleListRemindersCommand,
    handleRemoveReminderCommand
};
