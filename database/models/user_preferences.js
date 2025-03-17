// database/models/user_preferences.js
// User preferences model for storing and retrieving user AI preferences

const db = require('../db');
const logger = require('../../utils/logger');
const config = require('../../config/config');

// Get user preferences or create default if not exists
async function getUserPreferences(userId, chatId = null) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }

        // Try to get existing preferences
        const preferences = await database.get(
            'SELECT * FROM user_preferences WHERE user_id = ?',
            [userId]
        );

        if (preferences) {
            return preferences;
        }

        // Create default preferences if none exist
        const defaultEngine = config.DEFAULTS.engine;
        const defaultModel = config.DEFAULTS.model;

        await database.run(
            'INSERT INTO user_preferences (user_id, engine, model) VALUES (?, ?, ?)',
            [userId, defaultEngine, defaultModel]
        );

        logger.debug(`Created default preferences for user ${userId}`);

        return {
            user_id: userId,
            engine: defaultEngine,
            model: defaultModel
        };
    } catch (error) {
        logger.error(`Error getting user preferences: ${error.message}`, { error });
        // Return default preferences on error
        return {
            user_id: userId,
            engine: config.DEFAULTS.engine,
            model: config.DEFAULTS.model
        };
    }
}

// Set user's preferred AI engine
async function setUserEngine(userId, chatId, engine) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }

        // Check if user has existing preferences
        const existingPrefs = await getUserPreferences(userId, chatId);

        if (existingPrefs.id) {
            // Update existing preferences
            await database.run(
                'UPDATE user_preferences SET engine = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [engine, userId]
            );
        } else {
            // Create new preferences
            await database.run(
                'INSERT INTO user_preferences (user_id, engine, model) VALUES (?, ?, ?)',
                [userId, engine, config.DEFAULTS.model]
            );
        }

        logger.debug(`Set engine preference for user ${userId} to ${engine}`);
        return true;
    } catch (error) {
        logger.error(`Error setting user engine: ${error.message}`, { error });
        return false;
    }
}

// Set user's preferred AI model
async function setUserModel(userId, chatId, model) {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }

        // Check if user has existing preferences
        const existingPrefs = await getUserPreferences(userId, chatId);

        if (existingPrefs.id) {
            // Update existing preferences
            await database.run(
                'UPDATE user_preferences SET model = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
                [model, userId]
            );
        } else {
            // Create new preferences
            await database.run(
                'INSERT INTO user_preferences (user_id, engine, model) VALUES (?, ?, ?)',
                [userId, config.DEFAULTS.engine, model]
            );
        }

        logger.debug(`Set model preference for user ${userId} to ${model}`);
        return true;
    } catch (error) {
        logger.error(`Error setting user model: ${error.message}`, { error });
        return false;
    }
}

// Get all users and their preferences
async function getAllUserPreferences() {
    try {
        const database = db.getConnection();
        if (!database) {
            throw new Error('Database connection not available');
        }

        const allPreferences = await database.all('SELECT * FROM user_preferences');
        return allPreferences;
    } catch (error) {
        logger.error(`Error getting all user preferences: ${error.message}`, { error });
        return [];
    }
}

module.exports = {
    getUserPreferences,
    setUserEngine,
    setUserModel,
    getAllUserPreferences
};