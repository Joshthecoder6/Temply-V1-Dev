# Temply AI - Environment Configuration

This document describes the environment variables and configuration for **Temply AI**, the intelligent section generator powered by **X.AI Grok**.

## Environment Variables

Add these to your `.env` file:

```bash
# X.AI Configuration
XAI_API_KEY=your-xai-api-key-here
XAI_MODEL=grok-beta
XAI_TEMPERATURE=0.7
XAI_MAX_TOKENS=2000
```

## Model Options

- **grok-beta** (recommended for text-only, powerful and cost-effective)
- **grok-vision-beta** (automatically used when images are attached, supports vision capabilities)

## Base Prompt Configuration

Temply AI uses a comprehensive base prompt that:
- Identifies the assistant as "Temply AI"
- Provides clear instructions for generating Shopify sections
- Emphasizes modern design aesthetics and best practices
- Defines security boundaries and database access restrictions

The base prompt is automatically included with every request and can be customized in `app/lib/llm.server.ts` (lines 8-64, variable `SYSTEM_PROMPT`).

## Database Security

🔒 **Security Boundaries**:
- Temply AI **ONLY** has access to the `AISection` table
- Cannot read or write to Session, SocialProofSection, AppSettings, Template, Subscription, or Section tables
- All generated sections are scoped to the current shop
- This restriction is enforced through:
  1. System prompt instructions
  2. API route implementation (limited to AISection operations)
  3. Database schema permissions

## File Upload Support

Temply AI supports image attachments to provide visual reference:
- **Supported formats**: PNG, JPG, GIF, WebP, and other image formats
- **Maximum file size**: 5MB per image
- **Storage**: Files are converted to base64 data URLs and sent directly to X.AI Grok Vision API
- **Privacy**: Images are not permanently stored, only included in the API request
- **Model**: When images are attached, automatically switches to `grok-vision-beta` for vision capabilities

### Usage
1. Click the attachment icon (📎) in the chat input
2. Select an image file
3. Add optional text description
4. Send the message

The AI will analyze the image and generate sections based on visual reference.

## API Configuration

- **Base URL**: `https://api.x.ai/v1`
- **SDK**: Uses OpenAI SDK (fully compatible with X.AI)
- **API Key**: Get your key from https://console.x.ai
