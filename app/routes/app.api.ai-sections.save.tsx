import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        const body = await request.json();
        const { sectionData, conversationId } = body;

        if (!sectionData) {
            return { error: "Missing section data", status: 400 };
        }

        // Check if conversation exists and has a sectionId (for overwriting)
        let existingSectionId: string | null = null;
        if (conversationId) {
            const conversation = await prisma.chatConversation.findFirst({
                where: {
                    id: conversationId,
                    shop,
                },
                select: {
                    sectionId: true,
                },
            });
            existingSectionId = conversation?.sectionId || null;
        }

        let aiSection;

        if (existingSectionId) {
            // Update existing section
            aiSection = await prisma.aISection.update({
                where: { id: existingSectionId },
                data: {
                    sectionName: sectionData.sectionName,
                    sectionType: sectionData.sectionType,
                    htmlCode: sectionData.htmlCode,
                    cssCode: sectionData.cssCode || null,
                    jsCode: sectionData.jsCode || null,
                    liquidCode: sectionData.liquidCode || null,
                    prompt: sectionData.prompt || "",
                    previewData: sectionData.previewData ? JSON.stringify(sectionData.previewData) : null,
                    updatedAt: new Date(),
                },
            });
        } else {
            // Create new AI section
            aiSection = await prisma.aISection.create({
                data: {
                    shop,
                    sectionName: sectionData.sectionName,
                    sectionType: sectionData.sectionType,
                    htmlCode: sectionData.htmlCode,
                    cssCode: sectionData.cssCode || null,
                    jsCode: sectionData.jsCode || null,
                    liquidCode: sectionData.liquidCode || null,
                    prompt: sectionData.prompt || "",
                    previewData: sectionData.previewData ? JSON.stringify(sectionData.previewData) : null,
                    status: "draft",
                },
            });
        }

        return {
            success: true,
            id: aiSection.id,
        };
    } catch (error) {
        console.error("Save AI section error:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to save section",
            status: 500,
        };
    }
};
