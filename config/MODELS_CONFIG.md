# AI Models Configuration

## Overview

The WhatsApp AI Bot now supports dynamic model configuration through the `models.json` file. This allows you to add, remove, or modify AI models without changing the code.

## Configuration File

**Location:** `config/models.json`

## File Structure

```json
{
  "engineName": {
    "envKey": "ENVIRONMENT_VARIABLE_NAME",
    "defaultModel": "default-model-id",
    "models": [
      {
        "id": "model-id",
        "name": "Friendly Model Name",
        "description": "Model description for users"
      }
    ]
  }
}
```

## Fields Explanation

### Engine Level

- **`engineName`**: The identifier for the AI engine (e.g., "openai", "anthropic", "gemini", "deepseek")
- **`envKey`**: The environment variable name that contains the API key for this engine
- **`defaultModel`**: The model ID to use by default when switching to this engine

### Model Level

Each model in the `models` array should have:

- **`id`**: The exact model identifier as required by the AI provider's API
- **`name`**: A user-friendly display name for the model
- **`description`**: A brief description of the model's capabilities or use case

## Adding a New Model

To add a new model to an existing engine:

1. Open `config/models.json`
2. Locate the engine you want to add the model to
3. Add a new object to the `models` array:

```json
{
  "id": "new-model-id",
  "name": "New Model Name",
  "description": "Description of what this model does"
}
```

4. Save the file and restart the bot

## Adding a New AI Engine

To add a completely new AI engine:

1. Open `config/models.json`
2. Add a new top-level object:

```json
{
  "newengine": {
    "envKey": "NEW_ENGINE_API_KEY",
    "defaultModel": "model-id",
    "models": [
      {
        "id": "model-id",
        "name": "Model Name",
        "description": "Model description"
      }
    ]
  }
}
```

3. Add the corresponding API key to your `.env` file:
```
NEW_ENGINE_API_KEY=your-api-key-here
```

4. Implement the service file `services/ai/newengine.js` (see existing services for reference)
5. Update `services/ai/ai_service.js` to route to your new service

## Example

See `config/models.example.json` for a minimal configuration example.

## Important Notes

1. The `id` field must exactly match the model identifier expected by the AI provider's API
2. Changes to `models.json` require a bot restart to take effect
3. The configuration is loaded at startup - runtime changes are not supported
4. Invalid JSON syntax will prevent the bot from starting
5. Make sure to keep a backup of your `models.json` before making changes

## Testing Configuration

You can test if your configuration loads correctly by running:

```bash
node -e "const engines = require('./config/engines'); console.log('Available engines:', Object.keys(engines.ENGINES));"
```

## User Commands

Users can view available models using the command:
```
$list
```

This will display all configured engines and their models with the friendly names and indicators showing which engine/model is currently active.
