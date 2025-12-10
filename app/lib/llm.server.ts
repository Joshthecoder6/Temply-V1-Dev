import OpenAI from 'openai';

// Validate XAI_API_KEY exists
if (!process.env.XAI_API_KEY) {
  console.error('❌ XAI_API_KEY is missing! Please add it to your .env file.');
  console.error('Get your API key from: https://console.x.ai');
}

// Initialize X.AI client (using OpenAI SDK with X.AI base URL)
// X.AI is API-compatible with OpenAI SDK, we just point to their endpoint
const openai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || 'dummy-key-will-fail', // Use dummy to prevent null errors
  baseURL: 'https://api.x.ai/v1',
});

// System prompt for section generation
const SYSTEM_PROMPT = `You are Temply AI, an expert Shopify section developer for the Temply platform.

ROLE:
- Generate complete, production-ready Shopify sections.
- Work ONLY with the AISection table.
- When screenshots or assets are provided, you MUST follow the rules below.

HARD CONSTRAINTS (NO EXCEPTIONS):
1. You MUST NOT invent new UI elements.
   - Do NOT add buttons, text blocks, badges, cards, icons, or extra sections that are NOT visible in the screenshot or explicitly requested in text.
   - If the screenshot shows 1 button, you output exactly 1 button.
   - If the screenshot shows NO button, you output NO button.

2. You MUST NOT change the layout.
   - Keep the same number of columns, general proportions, alignment, and element order as in the screenshot.
   - Left/right placement must stay the same.

3. You MUST NOT change the visual style.
   - Do NOT add gradients, different colors, different shadows, or new font styles unless they are clearly visible in the screenshot.
   - Background, border radius, spacing and shadows must be as close as possible to what you see.

SCREENSHOTS & ASSETS:
- You will receive structured information like this in the user message:
  - SCREENSHOT: a hero layout or section to replicate.
  - IMAGES: a list of images with IDs and URLs, for example:
    - hero_image: https://example.com/hero.png
  - TEXTS: a list of texts with IDs, for example:
    - heading_text: "Your Amazing Headline"
    - body_text: "Discover incredible products and elevate your style today."
    - button_text: "Shop Now"

RULES:
1. If a SCREENSHOT is provided:
   - Your PRIMARY goal is to recreate the screenshot layout and styling as precisely as possible.
   - Use IMAGES and TEXTS to replace the content in the screenshot:
     - Use the provided image URLs in <img> tags in the correct position.
     - Use the provided text values for headings, subtexts and buttons in the correct position.

2. If the screenshot shows an image area but NO IMAGE URL is given:
   - Output a placeholder box in exactly the same position and approximate size.
   - The placeholder may contain simple “No image” text or an icon.

3. If you are NOT sure about a detail from the screenshot:
   - Choose the simplest, most neutral option.
   - NEVER invent extra content or visual elements.

4. Only when NO SCREENSHOT is provided:
   - You may use modern aesthetics (gradients, micro-animations, etc.), but still follow all Liquid and JSON rules below.

LIQUID STRUCTURE (REQUIRED):
- Your liquidCode MUST follow this structure:

<div class="section-name-{{ section.id }} st_check-section--{{ section.id }}">
  <div class="page-width">
    <!-- Your section content here -->
  </div>
</div>

<script>
(function() {
  'use strict';
  const sectionId = '{{ section.id }}';
  const sectionSelector = '.st_check-section--' + sectionId;
  
  function checkAppEmbed() {
    const embedMarker = document.getElementById('temply-app-embed-active');
    const sectionElement = document.querySelector(sectionSelector);
    
    if (!sectionElement) return;
    
    if (!embedMarker) {
      sectionElement.style.display = 'none';
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAppEmbed);
  } else {
    checkAppEmbed();
  }
})();
</script>

<style>
  .section-name-{{ section.id }} {
    padding-top: {{ section.settings.padding_top | times: 0.75 | round: 0 }}px;
    padding-bottom: {{ section.settings.padding_bottom | times: 0.75 | round: 0 }}px;
  }
  
  @media screen and (min-width: 750px) {
    .section-name-{{ section.id }} {
      padding-top: {{ section.settings.padding_top }}px;
      padding-bottom: {{ section.settings.padding_bottom }}px;
    }
  }

  /* All additional classes MUST include {{ section.id }} */
</style>

<script>
(function() {
  // Optional section-specific JS, scoped by section.id
})();
</script>

SCHEMA RULES:
- The {% schema %} block MUST be valid JSON:
  - No trailing commas.
  - Strings with double quotes.
  - Numbers without quotes.
  - Booleans as true/false, not strings.
- Do NOT use JavaScript ternary operators (? :) in Liquid.
- Use {% if %}, {% elsif %}, {% else %}, {% endif %} instead.

OUTPUT FORMAT:
Your response must ALWAYS be valid JSON in this exact format:
{
  "sectionName": "unique-kebab-case-name",
  "sectionType": "testimonial|live-activity|trust-badge|counter|custom",
  "htmlCode": "complete HTML code here",
  "cssCode": "complete CSS code here",
  "jsCode": "JavaScript code if needed, or empty string",
  "liquidCode": "Complete Shopify Liquid section code with all the above requirements",
  "explanation": "Brief explanation of the section and how to use it"
}`;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface GeneratedSection {
  sectionName: string;
  sectionType: string;
  htmlCode: string;
  cssCode?: string;
  jsCode?: string;
  liquidCode?: string;
  explanation?: string;
}

/**
 * Generate a section using X.AI Grok streaming
 */
export async function generateSectionStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (section: GeneratedSection) => void,
  onError: (error: Error) => void
) {
  try {
    // Validate API key
    if (!process.env.XAI_API_KEY) {
      console.error('❌ XAI_API_KEY is missing');
      onError(new Error('X.AI API key is not configured'));
      return;
    }

    console.log('🎬 Starting stream generation...');
    console.log('📤 Messages count:', messages.length);

    const stream = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: process.env.XAI_MODEL || 'grok-4-1-fast',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages,
        ],
        temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
        max_tokens: parseInt(process.env.XAI_MAX_TOKENS || '8000'),
        stream: true,
      });
    });

    let fullContent = '';
    let chunkCount = 0;

    console.log('📖 Reading stream...');

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullContent += content;
        chunkCount++;
        onChunk(content);
      }
    }

    console.log(`✅ Stream complete. Chunks: ${chunkCount}, Content length: ${fullContent.length}`);

    if (!fullContent || fullContent.length === 0) {
      console.error('❌ No content received from stream');
      onError(new Error('No content received from X.AI stream'));
      return;
    }

    // Parse the JSON response
    try {
      console.log('🔍 Parsing JSON from response...');

      // Remove markdown code fences if present
      let jsonString = fullContent;
      const codeBlockMatch = fullContent.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
        console.log('📦 Extracted from code block');
      } else {
        // Try to extract JSON object
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
          console.log('📦 Extracted JSON object');
        }
      }

      if (!jsonString || jsonString.length === 0) {
        console.error('❌ No JSON found in response');
        console.error('Response preview:', fullContent.substring(0, 500));
        throw new Error('No valid JSON found in response');
      }

      const section = JSON.parse(jsonString) as GeneratedSection;
      console.log('🎉 Successfully parsed section');
      onComplete(section);
    } catch (parseError) {
      console.error('❌ Failed to parse LLM response:', parseError);
      console.error('Response preview:', fullContent.substring(0, 500));
      onError(new Error('Failed to parse section from LLM response'));
    }
  } catch (error) {
    console.error('❌ X.AI API error:', error);
    onError(error as Error);
  }
}

/**
 * Extract text from PDF data URL
 */
async function extractTextFromPDF(dataUrl: string): Promise<string> {
  try {
    // Dynamic import for pdf-parse (ES module compatibility)
    // @ts-ignore - pdf-parse has complex module structure
    const pdf = (await import('pdf-parse')).default || (await import('pdf-parse'));

    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '[PDF text extraction failed]';
  }
}

/**
 * Extract text from text file data URL
 */
function extractTextFromTextFile(dataUrl: string): string {
  try {
    const base64Data = dataUrl.split(',')[1];
    const buffer = Buffer.from(base64Data, 'base64');
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Text file extraction error:', error);
    return '[Text file extraction failed]';
  }
}

/**
 * Retry wrapper for API calls with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Extract status code from various error formats
      const statusCode = error?.status || error?.statusCode || error?.response?.status || null;
      const errorCode = error?.code || null;

      // Check if error is retryable (503, 500, 429, network errors)
      const isRetryable =
        statusCode === 503 ||
        statusCode === 500 ||
        statusCode === 429 ||
        statusCode === 502 ||
        statusCode === 504 ||
        errorCode === 'ECONNRESET' ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ENOTFOUND' ||
        (error?.message && error.message.includes('503')) ||
        (error?.message && error.message.includes('timeout'));

      if (!isRetryable || attempt === maxRetries) {
        console.error(`[X.AI] Non-retryable error or max retries reached:`, {
          attempt: attempt + 1,
          status: statusCode,
          code: errorCode,
          message: error?.message,
          isRetryable
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[X.AI] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms due to: ${error?.message || error} (status: ${statusCode || 'unknown'})`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generate a section without streaming (simpler for testing)
 */
export async function generateSection(
  messages: ChatMessage[]
): Promise<GeneratedSection> {
  try {
    // Check if any message has attachments and determine types
    let hasImages = false;

    // Process messages and handle attachments
    const processedMessages = await Promise.all(messages.map(async (msg) => {
      if (!msg.attachments || msg.attachments.length === 0) {
        return {
          role: msg.role,
          content: msg.content
        };
      }

      // Process attachments
      const content: any[] = [];
      let additionalText = msg.content;

      for (const attachment of msg.attachments) {
        if (attachment.type.startsWith('image/')) {
          // Image attachment - use Vision API
          hasImages = true;
          content.push({
            type: 'image_url',
            image_url: {
              url: attachment.dataUrl,
            }
          });
        } else if (attachment.type === 'application/pdf') {
          // PDF attachment - extract text
          const extractedText = await extractTextFromPDF(attachment.dataUrl);
          additionalText += `\n\n[Content from ${attachment.name}]:\n${extractedText}`;
        } else if (attachment.type === 'text/plain') {
          // Text file - extract content
          const extractedText = extractTextFromTextFile(attachment.dataUrl);
          additionalText += `\n\n[Content from ${attachment.name}]:\n${extractedText}`;
        }
      }

      // If we have images, return vision format
      if (hasImages) {
        if (additionalText) {
          content.unshift({
            type: 'text',
            text: additionalText
          });
        }
        return {
          role: msg.role,
          content
        };
      }

      // Otherwise return text-only format
      return {
        role: msg.role,
        content: additionalText
      };
    }));

    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: hasImages ? 'grok-vision-beta' : (process.env.XAI_MODEL || 'grok-4-1-fast'),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...processedMessages,
        ] as any,
        temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
        max_tokens: parseInt(process.env.XAI_MAX_TOKENS || '8000'),
        // Note: X.AI doesn't support response_format, so we parse JSON manually
      });
    });

    const content = completion.choices[0]?.message?.content || '';

    console.log(`[X.AI] Response length: ${content.length} characters`);
    console.log(`[X.AI] Finish reason: ${completion.choices[0]?.finish_reason}`);

    // Extract JSON from response (X.AI may wrap it in markdown or text)
    try {
      // Try to find JSON block (could be wrapped in ```json or just raw)
      let jsonString = content;

      // Remove markdown code fences if present
      const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (codeBlockMatch) {
        jsonString = codeBlockMatch[1];
      } else {
        // Try to extract JSON object
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonString = jsonMatch[0];
        }
      }

      console.log(`[X.AI] Extracted JSON length: ${jsonString.length} characters`);

      if (!jsonString || jsonString.length === 0) {
        console.error('[X.AI] No JSON found in response');
        throw new Error('No valid JSON found in X.AI response');
      }

      // Robust JSON sanitization: XAI sometimes generates invalid JSON with unescaped characters
      // We need to carefully escape control characters and quotes within string values
      function sanitizeJSONString(str: string): string {
        let result = '';
        let inString = false;
        let prevChar = '';

        for (let i = 0; i < str.length; i++) {
          const char = str[i];

          // Track if we're inside a string value
          if (char === '"' && prevChar !== '\\') {
            inString = !inString;
            result += char;
            prevChar = char;
            continue;
          }

          // If we're inside a string, escape special characters
          if (inString) {
            switch (char) {
              case '\n':
                result += '\\n';
                break;
              case '\r':
                result += '\\r';
                break;
              case '\t':
                result += '\\t';
                break;
              case '\b':
                result += '\\b';
                break;
              case '\f':
                result += '\\f';
                break;
              case '\\':
                // Only escape if not already part of an escape sequence
                if (str[i + 1] && 'nrtbf"\\'.includes(str[i + 1])) {
                  result += char;
                } else {
                  result += '\\\\';
                }
                break;
              default:
                result += char;
            }
          } else {
            // Outside string, keep as is
            result += char;
          }

          prevChar = char;
        }

        return result;
      }

      console.log(`[X.AI] Sanitizing JSON string...`);
      const sanitizedJSON = sanitizeJSONString(jsonString);
      console.log(`[X.AI] Sanitized JSON (length: ${sanitizedJSON.length})`);

      const section = JSON.parse(sanitizedJSON) as GeneratedSection;
      console.log(`[X.AI] Successfully parsed section: ${section.sectionName}`);
      return section;
    } catch (parseError) {
      console.error('[X.AI] ❌ Failed to parse response');

      // Show detailed error context
      if (parseError instanceof Error && parseError.message.includes('position')) {
        const match = parseError.message.match(/position (\d+)/);
        if (match) {
          const errorPos = parseInt(match[1]);
          const contextStart = Math.max(0, errorPos - 100);
          const contextEnd = Math.min(jsonString.length, errorPos + 100);

          console.error(`[X.AI] Error at position ${errorPos}:`);
          console.error(`[X.AI] Context before: "${jsonString.substring(contextStart, errorPos)}"`);
          console.error(`[X.AI] Context after: "${jsonString.substring(errorPos, contextEnd)}"`);
          console.error(`[X.AI] Character at error: ${JSON.stringify(jsonString[errorPos])}`);
        }
      }

      console.error('[X.AI] Response preview:', content.substring(0, 500));
      console.error('[X.AI] Parse error:', parseError);
      throw new Error(`Failed to parse section from X.AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('X.AI API error:', error);
    throw error;
  }
}

/**
 * Validate API key
 */
export async function validateXAIKey(): Promise<boolean> {
  try {
    await openai.models.list();
    return true;
  } catch (error) {
    console.error('X.AI API key validation failed:', error);
    return false;
  }
}
