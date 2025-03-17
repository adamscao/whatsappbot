# WhatsApp AI Chatbot

A WhatsApp chatbot built with whatsapp-web.js that supports multiple AI engines, cryptocurrency price tracking, and reminder functionality.

## Features

- Multiple AI engine support (OpenAI, Anthropic, Gemini, DeepSeek)
- User-specific AI engine and model preferences
- Cryptocurrency price tracking and automatic updates
- Natural language reminder system
- Message history for context-aware conversations
- External search capabilities for up-to-date information

## Project Architecture

The project follows a modular architecture:

### Core Components

- **app.js**: Main application entry point
- **config/**: Configuration files
- **database/**: Database models and migrations
- **services/**: AI, crypto, reminder, and search services
- **controllers/**: Command and message processing
- **utils/**: Helper utilities

### Data Flow

1. Incoming messages are processed in `message_controller.js`
2. Commands are identified and routed in `command_controller.js`
3. AI responses are generated via the appropriate engine in `ai_service.js`
4. Reminders are scheduled and managed in `reminder_service.js`
5. Cryptocurrency updates are handled by `price_service.js`

### Database Structure

The application uses SQLite3 with three main tables:
- **messages**: Stores all chat messages
- **user_preferences**: Stores user AI engine and model preferences
- **reminders**: Stores scheduled reminders

## Commands

- `$help`: Display help information
- `$list`: Show available AI engines
- `$use [AI Engine]`: Switch AI engine
- `$model [AI Model]`: Switch AI model
- `$clear`: Clear conversation history
- `$price`: Show cryptocurrency prices
- `$reminder [text]`: Set a reminder
- `$listrem`: List active reminders
- `$rmrem [ID]`: Remove a specific reminder

## Setup

1. Install dependencies: `npm install`
2. Set up environment variables:
   ```
   OPENAI_API_KEY=your_openai_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GEMINI_API_KEY=your_gemini_key
   DEEPSEEK_API_KEY=your_deepseek_key
   GOOGLE_API_KEY=your_google_search_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   ```
3. Start the application: `npm start`

## Development

The project framework is designed for extensibility:
- Add new AI engines by creating a new service in `services/ai/`
- Add new commands by extending the command controller
- Add new features by creating new service modules

## License

MIT