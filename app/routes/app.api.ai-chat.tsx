import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { generateSection } from "../lib/llm.server";
import type { ChatMessage } from "../lib/llm.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    // Validate XAI_API_KEY
    if (!process.env.XAI_API_KEY) {
        console.error('❌ XAI_API_KEY is not configured');
        return new Response(JSON.stringify({
            error: "X.AI API key is missing. Please add XAI_API_KEY to your .env file. Get your API key from https://console.x.ai"
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    try {
        const body = await request.json();
        const { messages } = body as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages)) {
            return new Response(JSON.stringify({ error: "Invalid messages format" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Generate section using X.AI
        const section = await generateSection(messages);

        return new Response(JSON.stringify({
            success: true,
            section,
            shop,
        }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        console.error("AI Chat error:", error);
        return new Response(JSON.stringify({
            error: error instanceof Error ? error.message : "Failed to generate section",
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
};

