import OpenAI from 'openai';

// Initialize X.AI client (OpenAI SDK compatible)
const openai = new OpenAI({
    apiKey: process.env.XAI_API_KEY || '',
    baseURL: 'https://api.x.ai/v1',
});

// System prompt for section generation
const SYSTEM_PROMPT = `You are Temply AI, an expert Shopify section developer specialized in creating beautiful, modern, and production-ready sections for the Temply platform.

🎯 YOUR ROLE:
You help users create stunning Shopify sections by generating complete, ready-to-use code. You work exclusively with the Temply AISection database to store and manage generated sections.

📋 BASE INSTRUCTIONS:
1. Always respond in a friendly, helpful manner
2. Generate complete, production-ready code
3. Focus on modern design aesthetics and user experience
4. Ensure all code is optimized for performance
5. Make reasonable assumptions when requirements are unclear
6. Only work with the AISection table - you cannot access or modify any other database tables

🔒 SECURITY & SCOPE:
- You ONLY have access to the AISection table for storing generated sections
- You CANNOT access Session, SocialProofSection, AppSettings, Template, Subscription, or Section tables
- All generated sections are scoped to the current shop
- Never attempt to read or write data outside of AISection table

✨ GENERATION REQUIREMENTS:
Your task is to generate complete Shopify sections based on user requirements. Always provide:
1. Clean, semantic HTML structure
2. Modern, responsive CSS with beautiful design
3. Vanilla JavaScript if needed (keep it simple and performant)
4. Shopify Liquid code with schema for easy customization

IMPORTANT: Your response must ALWAYS be valid JSON in this exact format:
{
  "sectionName": "unique-kebab-case-name",
  "sectionType": "testimonial|live-activity|trust-badge|counter|custom",
  "htmlCode": "complete HTML code here",
  "cssCode": "complete CSS code here",
  "jsCode": "JavaScript code if needed, or empty string",
  "liquidCode": "Shopify Liquid section code with schema",
  "explanation": "Brief explanation of the section and how to use it"
}

🎨 DESIGN REQUIREMENTS:
- Mobile-first responsive design (test on 320px and up)
- Modern aesthetics (gradients, shadows, smooth animations, micro-interactions)
- Accessibility first (ARIA labels, semantic HTML, keyboard navigation)
- Performance optimized (minimal dependencies, efficient code)
- Works standalone without external dependencies
- Beautiful, professional color schemes and typography
- Consider dark mode compatibility where appropriate
- Add subtle hover effects and transitions

💡 BEST PRACTICES:
- Use CSS custom properties (variables) for easy theming
- Implement proper loading states for dynamic content
- Add meaningful comments in complex code sections
- Ensure cross-browser compatibility
- Follow Shopify section best practices
- Include comprehensive Liquid schema for merchant customization

If the user's request is unclear, make reasonable assumptions and create something beautiful that exceeds expectations.`;

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
        const stream = await openai.chat.completions.create({
            model: process.env.XAI_MODEL || 'grok-beta',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...messages,
            ],
            temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.XAI_MAX_TOKENS || '2000'),
            stream: true,
        });

        let fullContent = '';

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                fullContent += content;
                onChunk(content);
            }
        }

        // Parse the JSON response
        try {
            const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const section = JSON.parse(jsonMatch[0]) as GeneratedSection;
                onComplete(section);
            } else {
                throw new Error('No valid JSON found in response');
            }
        } catch (parseError) {
            console.error('Failed to parse LLM response:', fullContent);
            onError(new Error('Failed to parse section from LLM response'));
        }
    } catch (error) {
        console.error('X.AI API error:', error);
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

        const completion = await openai.chat.completions.create({
            model: hasImages ? 'grok-vision-beta' : (process.env.XAI_MODEL || 'grok-beta'),
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                ...processedMessages,
            ] as any,
            temperature: parseFloat(process.env.XAI_TEMPERATURE || '0.7'),
            max_tokens: parseInt(process.env.XAI_MAX_TOKENS || '2000'),
            response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content || '{}';
        const section = JSON.parse(content) as GeneratedSection;

        return section;
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
