# Scripts

这个目录包含项目的实用工具脚本。

## fetch-models.js

自动获取所有已配置AI提供商的可用模型列表，并生成 `config/models.example.json` 配置文件。

### 功能

- 从OpenAI API获取所有可用的GPT模型
- 从DeepSeek API获取可用模型
- 包含Anthropic的已知Claude模型列表
- 包含Google Gemini的已知模型列表
- 生成的所有模型默认 `enabled: false`
- 自动排序和分类模型

### 使用方法

1. 确保 `.env` 文件中配置了相应的API密钥：
   ```bash
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   GEMINI_API_KEY=...
   DEEPSEEK_API_KEY=sk-...
   ```

2. 运行脚本：
   ```bash
   node scripts/fetch-models.js
   ```

3. 查看生成的 `config/models.example.json` 文件

4. 根据需要编辑 `config/models.json`，将需要启用的模型的 `enabled` 字段设置为 `true`

### 输出示例

```
ℹ Starting model fetch process...

ℹ Fetching OpenAI models...
✓ Found 83 OpenAI models
ℹ Fetching Anthropic models...
✓ Found 6 Anthropic models
ℹ Fetching Gemini models...
✓ Found 5 Gemini models
ℹ Fetching DeepSeek models...
✓ Found 2 DeepSeek models

============================================================
Summary:
============================================================
openai: 83 models (default: gpt-5)
anthropic: 6 models (default: claude-sonnet-4-20250514)
gemini: 5 models (default: gemini-2.0-flash-exp)
deepseek: 2 models (default: deepseek-chat)
============================================================
```

### 注意事项

- 如果某个API密钥未配置，该提供商的模型会被跳过
- Anthropic和Gemini的模型列表是硬编码的，因为这些服务没有公开的模型列表API
- 生成的文件会覆盖现有的 `models.example.json`
- 实际使用时应该编辑 `models.json` 而不是 `models.example.json`
