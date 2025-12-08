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
                shop,
                userId: session.id, // Security: Ensure user owns this conversation
            },
        });

        if (!conversation) {
            return { error: "Conversation not found", status: 404 };
        }

        console.log('📂 [Load] Conversation found:', id);
        console.log('📂 [Load] Raw messages type:', typeof conversation.messages);
        console.log('📂 [Load] Raw messages length:', conversation.messages?.length);

        // Parse messages from JSON
        let messages;
        try {
            messages = JSON.parse(conversation.messages);
            console.log('📂 [Load] Parsed messages successfully, count:', Array.isArray(messages) ? messages.length : 'not an array');
        } catch (parseError) {
            console.error('❌ [Load] Failed to parse messages:', parseError);
            return {
                error: "Failed to parse conversation messages",
                status: 500
            };
        }

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
