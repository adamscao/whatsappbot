// database/db.js
// Database initialization and connection handling

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const config = require('../config/config');
const logger = require('../utils/logger');

// Database connection instance
let db = null;

// Initialize and open database connection
async function initialize() {
    try {
        if (db) {
            logger.debug('Database already initialized');
            return db;
        }

        const dbPath = config.DATABASE.path;
        
        logger.info(`Initializing database at ${dbPath}`);
        
        // Ensure database directory exists
        const fs = require('fs');
        const path = require('path');
        const dbDir = path.dirname(dbPath);
        
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
            logger.debug(`Created database directory: ${dbDir}`);
        }
        
        // Open database connection
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });
        
        logger.debug('Database connection established');
        
        // Run migrations
        await runMigrations();
        
        return db;
    } catch (error) {
        logger.error(`Database initialization failed: ${error.message}`, { error });
        throw error;
    }
}

// Run migrations to set up database schema
async function runMigrations() {
    try {
        if (!db) {
            throw new Error('Database not initialized');
        }
        
        logger.debug('Running database migrations');
        
        // Read migration SQL
        const fs = require('fs');
        const path = require('path');
        const migrationPath = path.join(__dirname, 'migrations', 'schema.sql');
        
        if (!fs.existsSync(migrationPath)) {
            throw new Error(`Migration file not found: ${migrationPath}`);
        }
        
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute migration queries
        await db.exec(migrationSQL);
        
        logger.info('Database migrations completed successfully');
    } catch (error) {
        logger.error(`Migration failed: ${error.message}`, { error });
        throw error;
    }
}

// Get database connection
function getConnection() {
    if (!db) {
        logger.warn('Attempted to get database connection before initialization');
        return null;
    }
    
    return db;
}

// Close database connection
async function closeDatabase() {
    try {
        if (db) {
            await db.close();
            db = null;
            logger.debug('Database connection closed');
        }
    } catch (error) {
        logger.error(`Error closing database: ${error.message}`, { error });
    }
}

module.exports = {
    initialize,
    getConnection,
    closeDatabase
};