import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    attachments?: any[];
}

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        const body = await request.json();
        const { messages, conversationId, title, sectionId } = body as {
            messages: ChatMessage[];
            conversationId?: string;
            title?: string;
            sectionId?: string;
        };

        if (!messages || !Array.isArray(messages)) {
            return { error: "Invalid messages format", status: 400 };
        }

        // Use provided title, or generate from first user message as fallback
        const conversationTitle = title || (() => {
            const firstUserMessage = messages.find(m => m.role === "user");
            return firstUserMessage
                ? firstUserMessage.content.substring(0, 50) + (firstUserMessage.content.length > 50 ? "..." : "")
                : "New conversation";
        })();

        const messagesJson = JSON.stringify(messages);
        const now = new Date();

        let conversation;

        if (conversationId) {
            // Update existing conversation - verify user ownership
            conversation = await db.chatConversation.update({
                where: {
                    id: conversationId,
                    shop,
                    userId: session.id, // Security: Ensure user owns this conversation
                },
                data: {
                    title: conversationTitle,
                    sectionId: sectionId || undefined,
                    messages: messagesJson,
                    lastMessageAt: now,
                    updatedAt: now,
                },
            });
        } else {
            // Create new conversation
            conversation = await db.chatConversation.create({
                data: {
                    shop,
                    userId: session.id, // Associate with current user
                    title: conversationTitle,
                    sectionId: sectionId || null,
                    messages: messagesJson,
                    lastMessageAt: now,
                },
            });
        }

        return {
            success: true,
            conversation,
        };
    } catch (error) {
        console.error("Error saving conversation:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to save conversation",
            status: 500,
        };
    }
};
