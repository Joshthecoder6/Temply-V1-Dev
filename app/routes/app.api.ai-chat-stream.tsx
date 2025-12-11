import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { generateSectionStream } from "../lib/llm.server";
import type { ChatMessage } from "../lib/llm.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        // Validate GEMINI_API_KEY
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not configured');
            return new Response(JSON.stringify({
                error: "Gemini API key is missing. Please add GEMINI_API_KEY to your .env file. Get your API key from https://ai.google.dev"
            }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const body = await request.json();
        const { messages } = body as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "Invalid messages format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Create a readable stream for Server-Sent Events
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                let fullContent = '';

                try {
                    await generateSectionStream(
                        messages,
                        // onChunk - send each chunk to the client
                        (chunk: string) => {
                            fullContent += chunk;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk, type: 'chunk' })}\n\n`));
                        },
                        // onComplete - send the final parsed section
                        (section) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ section, type: 'complete', shop })}\n\n`));
                            controller.close();
                        },
                        // onError - send error to client
                        (error) => {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message, type: 'error' })}\n\n`));
                            controller.close();
                        }
                    );
                } catch (error) {
                    console.error("Streaming error:", error);
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        error: error instanceof Error ? error.message : "Failed to generate section",
                        type: 'error'
                    })}\n\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error("AI Chat Stream error:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to start stream",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};
