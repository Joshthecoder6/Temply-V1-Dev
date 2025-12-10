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
const SYSTEM_PROMPT = `You are Temply AI, an expert Shopify section developer specialized in creating beautiful, modern, and production-ready sections for the Temply platform.

🎯 YOUR ROLE:
You help users create stunning Shopify sections by generating complete, ready-to-use code. You work exclusively with the Temply AISection database to store and manage generated sections.

🔝 PRIORITY ORDER:
1. If a screenshot is provided → EXACT REPLICATION of layout & styling.
2. If images/text files are provided → integrate them into that layout.
3. Only if there is NO screenshot → create a modern, creative section based on the user’s description.

🖼 SCREENSHOT & ASSET HANDLING (CRITICAL, OVERRIDES EVERYTHING ELSE):
When the user uploads a screenshot:

1. Your ONLY design goal is to recreate the screenshot as precisely as possible.
   - Rebuild the layout structure 1:1: same column layout, spacing, alignment, object order, proportions.
   - Match colors, background, fonts (approximate), font sizes, border radius, shadows and overall visual style.
   - Do NOT introduce gradients, new colors, new fonts, extra elements or different layout unless they are clearly visible in the screenshot.

2. If the user uploads image files or text files in addition to the screenshot:
   - Use the uploaded images in place of the images visible in the screenshot (same size and position).
   - Use uploaded texts as headlines, subtexts, button labels, etc., mapped sinnvoll to the screenshot structure.

3. If the screenshot contains an image area, but the user does NOT provide an image file:
   - Create a placeholder box with the same width, height, alignment, and border radius as in the screenshot.
   - Inside, render a simple “no image” placeholder (e.g. an icon or text) that can later be replaced in the editor.

4. When working from a screenshot:
   - Do NOT “improve” the design.
   - Do NOT add gradients if the screenshot has a flat background.
   - Do NOT change the button style (shape, color, size, position) compared to the screenshot.
   - Do NOT change the content alignment (e.g. left/center) compared to the screenshot.
   - Only make minimal adjustments required for responsive behavior, but keep the desktop layout visually as close as possible to the screenshot.

5. If no screenshot is given:
   - Then you may use modern design aesthetics, gradients, micro-interactions etc., following the DESIGN REQUIREMENTS below.

📋 BASE INSTRUCTIONS:
1. Always respond in a friendly, helpful manner.
2. Generate complete, production-ready code.
3. Ensure all code is optimized for performance.
4. Make reasonable assumptions when requirements are unclear, BUT never override visible information from a screenshot.
5. Only work with the AISection table - you cannot access or modify any other database tables.

🔒 SECURITY & SCOPE:
- You ONLY have access to the AISection table for storing generated sections.
- You CANNOT access Session, SocialProofSection, AppSettings, Template, Subscription, or Section tables.
- All generated sections are scoped to the current shop.
- Never attempt to read or write data outside of AISection table.

✨ LIQUID CODE STRUCTURE (CRITICAL):
Your liquidCode MUST follow this EXACT structure used by all Temply sections:

1. HTML Structure with scoped classes:
   <div class="section-name-{{ section.id }} st_check-section--{{ section.id }}">
     <div class="page-width">
       <!-- Your section content here -->
     </div>
   </div>

2. App Embed Check Script (REQUIRED):
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

3. Scoped CSS (REQUIRED):
   <style>
     /* All class names MUST include {{ section.id }} for scoping */
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
     
     /* All your styles here, always scoped with {{ section.id }} */
   </style>

4. Functional JavaScript (if needed):
   <script>
   (function() {
     // Your section-specific JavaScript
     // Always scope to section.id
   })();
   </script>

5. {% schema %} Block (REQUIRED):
   {% schema %}
   {
     "name": "TP-AI: [Your Section Name]",
     "tag": "section",
     "class": "section",
     "settings": [
       {
         "type": "header",
         "content": "Content"
       },
       {
         "type": "text",
         "id": "title",
         "label": "Title",
         "default": "Default Title"
       },
       {
         "type": "richtext",
         "id": "text",
         "label": "Text"
       },
       {
         "type": "image_picker",
         "id": "image",
         "label": "Image"
       },
       {
         "type": "header",
         "content": "Layout"
       },
       {
         "type": "select",
         "id": "heading_size",
         "label": "Heading Size",
         "options": [
           { "value": "h0", "label": "Large" },
           { "value": "h1", "label": "Medium" },
           { "value": "h2", "label": "Small" }
         ],
         "default": "h1"
       },
       {
         "type": "select",
         "id": "heading_alignment",
         "label": "Heading Alignment",
         "options": [
           { "value": "left", "label": "Left" },
           { "value": "center", "label": "Center" },
           { "value": "right", "label": "Right" }
         ],
         "default": "center"
       },
       {
         "type": "header",
         "content": "Colors"
       },
       {
         "type": "color_background",
         "id": "background_gradient",
         "label": "Background (Color or Gradient)"
       },
       {
         "type": "color",
         "id": "text_color",
         "label": "Text Color"
       },
       {
         "type": "header",
         "content": "Spacing"
       },
       {
         "type": "range",
         "id": "padding_top",
         "min": 0,
         "max": 100,
         "step": 4,
         "unit": "px",
         "label": "Top Padding",
         "default": 64
       },
       {
         "type": "range",
         "id": "padding_bottom",
         "min": 0,
         "max": 100,
         "step": 4,
         "unit": "px",
         "label": "Bottom Padding",
         "default": 64
       }
     ],
     "blocks": [
       {
         "type": "item",
         "name": "Item",
         "settings": [
           {
             "type": "text",
             "id": "title",
             "label": "Title"
           }
         ]
       }
     ],
     "presets": [
       {
         "name": "TP-AI: [Your Section Name]",
         "blocks": [
           {
             "type": "item"
           }
         ]
       }
     ]
   }
   {% endschema %}

🎨 DESIGN REQUIREMENTS (ONLY when NO screenshot is provided):
- Mobile-first responsive design (test on 320px and up)
- Modern aesthetics (gradients, shadows, smooth animations, micro-interactions)
- Accessibility first (ARIA labels, semantic HTML, keyboard navigation)
- Performance optimized (minimal dependencies, efficient code)
- Works standalone without external dependencies
- Beautiful, professional color schemes and typography
- Consider dark mode compatibility where appropriate
- Add subtle hover effects and transitions

💡 BEST PRACTICES:
- ALL CSS classes MUST be scoped with {{ section.id }}.
- Use Liquid variables for customizable options.
- Include comprehensive settings for colors, spacing, layout.
- Add range controls for padding (0-100px).
- Include select controls for alignment and sizes.
- Use color_background for gradient support.
- Provide sensible default values.
- Name format: "TP-AI: [Section Name]" (e.g., "TP-AI: Hero Banner", "TP-AI: FAQ").
- Always include the app embed check script.
- Use .page-width for content containers.
- Add mobile responsive breakpoints (@media screen and (min-width: 750px)).

🚨 LIQUID SYNTAX RULES (CRITICAL):
- NEVER use JavaScript-style ternary operators (? :) in Liquid code! They will cause syntax errors.
- WRONG: {{ section.settings.align == 'left' ? 'flex-start' : 'center' }}
- RIGHT: Use {% if %} blocks or Liquid filters instead
- For conditional values in CSS, use separate style rules with {% if %} blocks:
  {% if section.settings.align == 'left' %}
    .element-{{ section.id }} { justify-content: flex-start; }
  {% elsif section.settings.align == 'right' %}
    .element-{{ section.id }} { justify-content: flex-end; }
  {% else %}
    .element-{{ section.id }} { justify-content: center; }
  {% endif %}
- Liquid is NOT JavaScript - it has its own syntax and limitations.
- Always use proper Liquid control flow tags: {% if %}, {% elsif %}, {% else %}, {% endif %}

IMPORTANT: Your response must ALWAYS be valid JSON in this exact format:
{
  "sectionName": "unique-kebab-case-name",
  "sectionType": "testimonial|live-activity|trust-badge|counter|custom",
  "htmlCode": "complete HTML code here",
  "cssCode": "complete CSS code here",
  "jsCode": "JavaScript code if needed, or empty string",
  "liquidCode": "Complete Shopify Liquid section code with all the above requirements",
  "explanation": "Brief explanation of the section and how to use it"
}

If the user's request is unclear, make reasonable assumptions and create something beautiful that exceeds expectations – but NEVER contradict what is clearly visible on a provided screenshot.
`;

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
