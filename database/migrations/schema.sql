-- database/migrations/schema.sql
-- Database schema for WhatsApp bot

-- Messages table to store all chat messages
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    message_id TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    is_group BOOLEAN NOT NULL DEFAULT 0,
    role TEXT NOT NULL DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for message retrieval by chat
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- User preferences table to store AI engine and model preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    engine TEXT NOT NULL DEFAULT 'openai',
    model TEXT NOT NULL DEFAULT 'gpt-4o',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reminders table to store user reminders
CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    content TEXT NOT NULL,
    trigger_time DATETIME NOT NULL,
    is_triggered BOOLEAN NOT NULL DEFAULT 0,
    is_group BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create index for reminder retrieval
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_trigger_time ON reminders(trigger_time);