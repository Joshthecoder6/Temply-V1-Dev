import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request, params }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;
    const { id } = params;

    if (!id) {
        return { error: "Conversation ID is required", status: 400 };
    }

    try {
        // Delete conversation only if it belongs to this shop
        await db.chatConversation.deleteMany({
            where: {
                id,
                shop,
            },
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error("Error deleting conversation:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to delete conversation",
            status: 500,
        };
    }
};
