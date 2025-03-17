// database/models/message.js
// Message model for storing and retrieving message data

const db = require('../db');
const logger = require('../../utils/logger');

// Save a new message to the database
async function saveMessage({ userId, chatId, content, role, timestamp }) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const isGroup = chatId.includes('-');
        const now = timestamp || new Date();
        const messageId = `${chatId}-${userId}-${now.getTime()}`;
        
        await database.run(
            'INSERT INTO messages (chat_id, sender_id, message_id, content, timestamp, is_group, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [chatId, userId, messageId, content, now.toISOString(), isGroup ? 1 : 0, role || 'user']
        );
        
        logger.debug(`Saved message to database: ${messageId}`);
        return messageId;
    } catch (error) {
        logger.error(`Error saving message: ${error.message}`, { error });
        return null;
    }
}

// Get chat history for a specific chat
async function getChatHistory(chatId, limit = 10) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const history = await database.all(
            'SELECT * FROM messages WHERE chat_id = ? ORDER BY timestamp DESC LIMIT ?',
            [chatId, limit]
        );
        
        // Reverse to get chronological order (oldest first)
        return history.reverse();
    } catch (error) {
        logger.error(`Error getting chat history: ${error.message}`, { error });
        return [];
    }
}

// Clear chat history for a specific chat
async function clearChatHistory(chatId) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        await database.run('DELETE FROM messages WHERE chat_id = ?', [chatId]);
        
        logger.debug(`Cleared chat history for chat ${chatId}`);
        return true;
    } catch (error) {
        logger.error(`Error clearing chat history: ${error.message}`, { error });
        return false;
    }
}

// Count messages in a specific chat
async function countMessages(chatId) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const result = await database.get(
            'SELECT COUNT(*) as count FROM messages WHERE chat_id = ?',
            [chatId]
        );
        
        return result.count;
    } catch (error) {
        logger.error(`Error counting messages: ${error.message}`, { error });
        return 0;
    }
}

// Get all chat IDs where messages exist
async function getAllChatIds() {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const results = await database.all(
            'SELECT DISTINCT chat_id FROM messages'
        );
        
        return results.map(row => row.chat_id);
    } catch (error) {
        logger.error(`Error getting all chat IDs: ${error.message}`, { error });
        return [];
    }
}

// Get messages older than a certain date
async function getMessagesOlderThan(date) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const messages = await database.all(
            'SELECT * FROM messages WHERE timestamp < ?',
            [date.toISOString()]
        );
        
        return messages;
    } catch (error) {
        logger.error(`Error getting old messages: ${error.message}`, { error });
        return [];
    }
}

// Delete messages older than a certain date
async function deleteMessagesOlderThan(date) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }
        
        const result = await database.run(
            'DELETE FROM messages WHERE timestamp < ?',
            [date.toISOString()]
        );
        
        logger.debug(`Deleted ${result.changes} old messages`);
        return result.changes;
    } catch (error) {
        logger.error(`Error deleting old messages: ${error.message}`, { error });
        return 0;
    }
}

module.exports = {
    saveMessage,
    getChatHistory,
    clearChatHistory,
    countMessages,
    getAllChatIds,
    getMessagesOlderThan,
    deleteMessagesOlderThan
};