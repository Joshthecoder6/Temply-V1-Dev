import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        // Get all conversations for this shop AND user, ordered by most recent
        const conversations = await db.chatConversation.findMany({
            where: {
                shop,
                userId: session.id, // Filter by user - ensures privacy
            },
            orderBy: { lastMessageAt: 'desc' },
            select: {
                id: true,
                title: true,
                lastMessageAt: true,
                createdAt: true,
            },
        });

        return {
            success: true,
            conversations,
        };
    } catch (error) {
        console.error("Error loading chat history:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to load chat history",
            status: 500,
        };
    }
};
