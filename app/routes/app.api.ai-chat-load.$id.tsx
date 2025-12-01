import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    const { id } = params;

    if (!id) {
        return { error: "Conversation ID is required", status: 400 };
    }

    try {
        const conversation = await db.chatConversation.findFirst({
            where: {
                id,
                shop, // Ensure user owns this conversation
            },
        });

        if (!conversation) {
            return { error: "Conversation not found", status: 404 };
        }

        // Parse messages from JSON
        const messages = JSON.parse(conversation.messages);

        return {
            success: true,
            conversation: {
                ...conversation,
                messages,
            },
        };
    } catch (error) {
        console.error("Error loading conversation:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to load conversation",
            status: 500,
        };
    }
};
