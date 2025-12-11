import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Content, Part } from '@google/generative-ai';

// Validate GEMINI_API_KEY exists
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is missing! Please add it to your .env file.');
  console.error('Get your API key from: https://ai.google.dev');
}

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy-key-will-fail');

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
 * Helper to get the model instance
 */
function getGeminiModel() {
  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro-latest';
  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_PROMPT,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });
}
}

/**
 * Convert internal ChatMessages to Gemini Content format
 */
async function convertMessagesToGemini(messages: ChatMessage[]): Promise<Content[]> {
  const contents: Content[] = [];

  for (const msg of messages) {
    if (msg.role === 'system') continue; // Handled via systemInstruction

    const role = msg.role === 'assistant' ? 'model' : 'user';
    const parts: Part[] = [];

    // Add text content
    let textContent = msg.content || '';

    // Handle attachments
    if (msg.attachments && msg.attachments.length > 0) {
      for (const attachment of msg.attachments) {
        if (attachment.type.startsWith('image/')) {
          // Extract base64
          const base64Data = attachment.dataUrl.split(',')[1];
          parts.push({
            inlineData: {
              mimeType: attachment.type,
              data: base64Data,
            },
          });
        } else if (attachment.type === 'application/pdf') {
          const extractedText = await extractTextFromPDF(attachment.dataUrl);
          textContent += `\n\n[Content from ${attachment.name}]:\n${extractedText}`;
        } else if (attachment.type === 'text/plain') {
          const extractedText = extractTextFromTextFile(attachment.dataUrl);
          textContent += `\n\n[Content from ${attachment.name}]:\n${extractedText}`;
        }
      }
    }

    if (textContent) {
      parts.push({ text: textContent });
    }

    // Gemini requires at least one part. If message is empty but had processing fallback, ensure part exists.
    if (parts.length === 0) {
      parts.push({ text: ' ' });
    }

    contents.push({ role, parts });
  }

  return contents;
}

/**
 * Generate a section using Gemini streaming
 */
export async function generateSectionStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (section: GeneratedSection) => void,
  onError: (error: Error) => void
) {
  try {
    // Validate API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is missing');
      onError(new Error('Gemini API key is not configured'));
      return;
    }

    console.log('🎬 Starting Gemini stream generation...');
    console.log('📤 Messages count:', messages.length);

    const model = getGeminiModel();
    const geminiHistory = await convertMessagesToGemini(messages);

    // We need to separate history from the new message for startChat + sendMessage
    // If there is only 1 message, history is empty and we send that message.
    let history: Content[] = [];
    let lastMessageParts: string | (string | Part)[] = [];

    if (geminiHistory.length > 0) {
      const lastMsg = geminiHistory[geminiHistory.length - 1];
      if (lastMsg.role === 'user') {
        history = geminiHistory.slice(0, -1);
        lastMessageParts = lastMsg.parts;
      } else {
        // Edge case: Last message is model? Should not happen in standard flow usually
        history = geminiHistory;
        lastMessageParts = "Please continue.";
      }
    } else {
      lastMessageParts = "Generate the section.";
    }

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      }
    });

    const streamResult = await retryWithBackoff(async () => {
      // sendMessageStream accepts string, Part[], or array of mixed strings/parts
      return await chat.sendMessageStream(lastMessageParts);
    });

    let fullContent = '';
    let chunkCount = 0;

    console.log('📖 Reading Gemini stream...');

    for await (const chunk of streamResult.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullContent += chunkText;
        chunkCount++;
        onChunk(chunkText);
      }
    }

    console.log(`✅ Stream complete. Chunks: ${chunkCount}, Content length: ${fullContent.length}`);

    if (!fullContent || fullContent.length === 0) {
      console.error('❌ No content received from stream');
      onError(new Error('No content received from Gemini stream'));
      return;
    }

    // Parse the JSON response
    try {
      console.log('🔍 Parsing JSON from response...');
      const section = parseAndSanitizeJSON(fullContent);
      console.log('🎉 Successfully parsed section');
      onComplete(section);
    } catch (parseError) {
      console.error('❌ Failed to parse LLM response:', parseError);
      onError(new Error('Failed to parse section from LLM response'));
    }
  } catch (error) {
    console.error('❌ Gemini API error:', error);
    onError(error as Error);
  }
}

/**
 * Generate a section without streaming (simpler for testing)
 */
export async function generateSection(
  messages: ChatMessage[]
): Promise<GeneratedSection> {
  try {
    const model = getGeminiModel();
    const geminiHistory = await convertMessagesToGemini(messages);

    let history: Content[] = [];
    let lastMessageParts: string | (string | Part)[] = [];

    if (geminiHistory.length > 0) {
      const lastMsg = geminiHistory[geminiHistory.length - 1];
      if (lastMsg.role === 'user') {
        history = geminiHistory.slice(0, -1);
        lastMessageParts = lastMsg.parts;
      } else {
        history = geminiHistory;
        lastMessageParts = "Please continue.";
      }
    }

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,
      }
    });

    const result = await retryWithBackoff(async () => {
      return await chat.sendMessage(lastMessageParts);
    });

    const content = result.response.text();

    console.log(`[Gemini] Response length: ${content.length} characters`);

    return parseAndSanitizeJSON(content);

  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
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

      // Gemini specific error codes or generic status codes
      // 429 = Too Many Requests
      // 503 = Service Unavailable
      // 500 = Internal Server Error
      const statusCode = error?.status || error?.statusCode || error?.response?.status || null;
      const errorCode = error?.code || null;

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
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`[Gemini] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Helper to parse and sanitize JSON from LLM response
 */
function parseAndSanitizeJSON(content: string): GeneratedSection {
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

  if (!jsonString || jsonString.length === 0) {
    throw new Error('No valid JSON found in response');
  }

  // Robust JSON sanitization
  function sanitizeJSONString(str: string): string {
    let result = '';
    let inString = false;
    let prevChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        prevChar = char;
        continue;
      }

      if (inString) {
        switch (char) {
          case '\n': result += '\\n'; break;
          case '\r': result += '\\r'; break;
          case '\t': result += '\\t'; break;
          case '\b': result += '\\b'; break;
          case '\f': result += '\\f'; break;
          case '\\':
            if (str[i + 1] && 'nrtbf"\\'.includes(str[i + 1])) {
              result += char;
            } else {
              result += '\\\\';
            }
            break;
          default: result += char;
        }
      } else {
        result += char;
      }
      prevChar = char;
    }
    return result;
  }

  const sanitizedJSON = sanitizeJSONString(jsonString);
  return JSON.parse(sanitizedJSON) as GeneratedSection;
}

/**
 * Validate API key
 */
export async function validateGeminiKey(): Promise<boolean> {
  try {
    const model = getGeminiModel();
    const result = await model.generateContent("Test connection");
    return !!result.response.text();
  } catch (error) {
    console.error('Gemini API key validation failed:', error);
    return false;
  }
}
