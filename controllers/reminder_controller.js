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
                `请指定提醒文本。 例如： ${config.COMMANDS.prefix}${config.COMMANDS.reminder} 明天下午3点给小王打电话。`
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
                "我无法理解此提醒的时间。请尝试使用更明确的时间说明。"
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
            `✅ 提醒设置 *${reminderData.relativeTime}*:\n\n${reminderData.content}\n\n提醒编号: ${reminderId}`
        );
        
        logger.debug(`Created reminder for user ${userId} at ${reminderData.time}`);
    } catch (error) {
        logger.error(`Error handling reminder command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "抱歉，我无法设置您的提醒。请尝试使用不同的措辞再试一次。"
        );
    }
}

// Handle list reminders command
async function handleListRemindersCommand(client, msg, userId) {
    try {
        // Get user's reminders
        const reminders = await reminderService.getUserReminders(userId);
        
        if (!reminders || reminders.length === 0) {
            await client.sendMessage(msg.from, "您没有激活的提醒。");
            return;
        }
        
        // Format reminders list
        let responseText = "*您已激活的提醒有：*\n\n";
        
        for (const reminder of reminders) {
            const reminderTime = new Date(reminder.time);
            const timeString = reminderTime.toLocaleString();
            const timeFromNow = getRelativeTimeString(reminderTime);
            
            responseText += `*编号： ${reminder.id}*\n`;
            responseText += `${reminder.content}\n`;
            responseText += `时间： ${timeString} (${timeFromNow})\n\n`;
        }
        
        responseText += `要删除提醒，使用 ${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} <id>`;
        
        await client.sendMessage(msg.from, responseText);
        logger.debug(`Listed ${reminders.length} reminders for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling list reminders command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "抱歉，我暂时无法获取您的提醒事项。"
        );
    }
}

// Handle remove reminder command
async function handleRemoveReminderCommand(client, msg, userId, reminderId) {
    try {
        if (!reminderId) {
            await client.sendMessage(
                msg.from, 
                `请指定要删除提醒的编号，例如： ${config.COMMANDS.prefix}${config.COMMANDS.removeReminder} 123`
            );
            return;
        }
        
        // Check if reminder exists and belongs to user
        const reminder = await reminderService.getReminderById(reminderId);
        
        if (!reminder) {
            await client.sendMessage(msg.from, `找不到该编号的提醒： ${reminderId}`);
            return;
        }
        
        if (reminder.userId !== userId) {
            await client.sendMessage(msg.from, "您没有权限删除这个提醒。");
            return;
        }
        
        // Remove reminder
        const success = await reminderService.removeReminder(reminderId);
        
        if (!success) {
            throw new Error("Failed to remove reminder");
        }
        
        await client.sendMessage(msg.from, `✅ 编号为 ${reminderId} 的提醒已删除。`);
        logger.debug(`Removed reminder ${reminderId} for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling remove reminder command: ${error.message}`, { error });
        await client.sendMessage(
            msg.from, 
            "对不起，我无法删除提醒。请检查编号并重试。"
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
