// database/models/reminder.js
// Reminder model for storing and retrieving reminder data

const db = require('../db');
const logger = require('../../utils/logger');

// Create a new reminder
async function createReminder({ userId, chatId, content, time, isGroup }) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        // Format time to ISO string if it's a Date object
        const triggerTime = time instanceof Date ? time.toISOString() : time;
        const groupFlag = isGroup ? 1 : 0;
        
        const result = await database.run(
            `INSERT INTO reminders 
             (user_id, chat_id, content, trigger_time, is_triggered, is_group) 
             VALUES (?, ?, ?, ?, 0, ?)`,
            [userId, chatId, content, triggerTime, groupFlag]
        );
        
        const reminderId = result.lastID;
        logger.debug(`Created reminder ${reminderId} for user ${userId} at ${triggerTime}`);
        
        return reminderId;
    } catch (error) {
        logger.error(`Error creating reminder: ${error.message}`, { error });
        return null;
    }
}

// Get all reminders for a specific user
async function getUserReminders(userId) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const reminders = await database.all(
            `SELECT * FROM reminders 
             WHERE user_id = ? AND is_triggered = 0 
             ORDER BY trigger_time ASC`,
            [userId]
        );
        
        return reminders;
    } catch (error) {
        logger.error(`Error getting user reminders: ${error.message}`, { error });
        return [];
    }
}

// Get all pending reminders (not triggered yet)
async function getPendingReminders() {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const now = new Date().toISOString();
        
        const reminders = await database.all(
            `SELECT * FROM reminders 
             WHERE trigger_time <= ? AND is_triggered = 0 
             ORDER BY trigger_time ASC`,
            [now]
        );
        
        return reminders;
    } catch (error) {
        logger.error(`Error getting pending reminders: ${error.message}`, { error });
        return [];
    }
}

// Delete a specific reminder by ID
async function removeReminder(reminderId, userId = null) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        let query = 'DELETE FROM reminders WHERE id = ?';
        const params = [reminderId];
        
        // If userId is provided, make sure the reminder belongs to the user
        if (userId) {
            query += ' AND user_id = ?';
            params.push(userId);
        }
        
        const result = await database.run(query, params);
        
        logger.debug(`Removed reminder ${reminderId}, affected rows: ${result.changes}`);
        return result.changes > 0;
    } catch (error) {
        logger.error(`Error removing reminder: ${error.message}`, { error });
        return false;
    }
}

// Mark a reminder as triggered
async function markReminderAsTriggered(reminderId) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const result = await database.run(
            `UPDATE reminders 
             SET is_triggered = 1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [reminderId]
        );
        
        logger.debug(`Marked reminder ${reminderId} as triggered, affected rows: ${result.changes}`);
        return result.changes > 0;
    } catch (error) {
        logger.error(`Error marking reminder as triggered: ${error.message}`, { error });
        return false;
    }
}

// Get a reminder by ID
async function getReminderById(reminderId) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const reminder = await database.get(
            'SELECT * FROM reminders WHERE id = ?',
            [reminderId]
        );
        
        return reminder;
    } catch (error) {
        logger.error(`Error getting reminder by ID: ${error.message}`, { error });
        return null;
    }
}

// Get all future reminders
async function getFutureReminders() {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const now = new Date().toISOString();
        
        const reminders = await database.all(
            `SELECT * FROM reminders 
             WHERE trigger_time > ? AND is_triggered = 0 
             ORDER BY trigger_time ASC`,
            [now]
        );
        
        return reminders;
    } catch (error) {
        logger.error(`Error getting future reminders: ${error.message}`, { error });
        return [];
    }
}

module.exports = {
    createReminder,
    getUserReminders,
    getPendingReminders,
    removeReminder,
    markReminderAsTriggered,
    getReminderById,
    getFutureReminders
};