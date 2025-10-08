// utils/message_parser.js
// Utility for parsing WhatsApp messages

// Remove bot mention from message
function removeBotMention(message, botNumber, additionalBotIds = []) {
    if (!message || !botNumber) {
        return message;
    }

    // Extract just the number if botNumber includes @ suffix
    const cleanBotNumber = botNumber.includes('@') ? botNumber.split('@')[0] : botNumber;

    // Create list of all bot numbers
    const allBotNumbers = [cleanBotNumber, ...additionalBotIds];

    // Get bot mention formats for all bot IDs
    const mentionFormats = [
        '@bot',
        'hey bot',
        ...allBotNumbers.map(num => `@${num}`)
    ];

    let processedMessage = message;

    // Remove bot mentions at the beginning of the message
    for (const mention of mentionFormats) {
        // Escape special regex characters in the mention
        const escapedMention = mention.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`^\\s*${escapedMention}\\s*`, 'i');
        processedMessage = processedMessage.replace(regex, '');
    }

    return processedMessage.trim();
}

// Extract user ID from message
function extractUserId(msg) {
    if (!msg) return null;
    
    // From author (in group chats) or from sender (in private chats)
    const userId = msg.author || (msg.from ? msg.from.split('@')[0] : null);
    
    return userId;
}

// Extract chat ID from message
function extractChatId(msg) {
    if (!msg) return null;
    
    return msg.from;
}

// Check if message is from a group
function isGroupMessage(msg) {
    if (!msg) return false;
    
    // Update to use @g.us suffix which is WhatsApp's group chat identifier
    return msg.from && msg.from.endsWith('@g.us');
}

// Extract quoted message if present
function extractQuotedMessage(msg) {
    if (!msg || !msg.quotedMsg) return null;
    
    return msg.quotedMsg;
}

// Get sender name (contact name or pushname)
function getSenderName(msg) {
    if (!msg) return 'Unknown User';
    
    // If in a group, try to get the contact's name or author
    if (isGroupMessage(msg)) {
        if (msg.notifyName) return msg.notifyName;
        if (msg.author) return msg.author.split('@')[0];
    }
    
    // For private chats, get the sender's pushname or number
    if (msg.sender && msg.sender.pushname) return msg.sender.pushname;
    if (msg.from) return msg.from.split('@')[0];
    
    return 'Unknown User';
}

// Format message for AI context
function formatMessageForAI(msg, role = 'user') {
    if (!msg) return null;
    
    const content = msg.body || msg.content || '';
    
    return {
        role,
        content
    };
}

// Check if message is a command
function isCommand(msg, prefix = '$') {
    if (!msg || !msg.body) return false;
    
    return msg.body.startsWith(prefix) || 
           msg.body.startsWith('/') || 
           msg.body.startsWith('!');
}

// Extract command and args from message
function extractCommand(msg, prefix = '$') {
    if (!isCommand(msg, prefix)) return { command: null, args: [] };
    
    let content = msg.body;
    
    // Remove prefix character
    if (content.startsWith(prefix)) {
        content = content.substring(prefix.length);
    } else if (content.startsWith('/') || content.startsWith('!')) {
        content = content.substring(1);
    }
    
    const parts = content.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return { command, args };
}

// Check if the bot is mentioned in a message
function isBotMentioned(msg, botId, additionalBotIds = []) {
    if (!msg || !msg.body) return false;

    // Extract bot number from botId (handles both formats)
    // botId can be "15147715108@c.us" or "15147715108"
    const botNumber = botId.includes('@') ? botId.split('@')[0] : botId;

    // Create a list of all bot numbers to check
    const allBotNumbers = [botNumber, ...additionalBotIds];

    // Check if message mentions the bot by @mentioning its number
    if (msg.mentionedIds && msg.mentionedIds.length > 0) {
        // Check if any mentioned ID matches any of the bot numbers
        const isMentioned = msg.mentionedIds.some(mentionId => {
            const mentionNumber = mentionId.includes('@') ? mentionId.split('@')[0] : mentionId;
            return allBotNumbers.some(botNum => mentionNumber === botNum);
        });

        if (isMentioned) return true;
    }

    // Check common ways of addressing the bot
    const botIndicators = [
        '@bot',
        'hey bot',
        ...allBotNumbers.map(num => `@${num}`) // Check all bot numbers in message body
    ];

    const lowerCaseBody = msg.body.toLowerCase();
    return botIndicators.some(indicator => lowerCaseBody.includes(indicator.toLowerCase()));
}

module.exports = {
    removeBotMention,
    extractUserId,
    extractChatId,
    isGroupMessage,
    extractQuotedMessage,
    getSenderName,
    formatMessageForAI,
    isCommand,
    extractCommand,
    isBotMentioned
};
