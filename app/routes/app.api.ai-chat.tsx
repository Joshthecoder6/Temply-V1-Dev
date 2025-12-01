import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { generateSection } from "../lib/llm.server";
import type { ChatMessage } from "../lib/llm.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        const body = await request.json();
        const { messages } = body as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages)) {
            return { error: "Invalid messages format", status: 400 };
        }

        // Generate section using OpenAI
        const section = await generateSection(messages);

        return {
            success: true,
            section,
            shop,
        };
    } catch (error) {
        console.error("AI Chat error:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to generate section",
            status: 500,
        };
    }
};
