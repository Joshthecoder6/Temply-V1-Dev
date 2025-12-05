import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        const body = await request.json();
        const { aiSectionId } = body;

        if (!aiSectionId) {
            return { error: "Missing AI section ID", status: 400 };
        }

        // Get AI section
        const aiSection = await prisma.aISection.findFirst({
            where: {
                id: aiSectionId,
                shop,
            },
        });

        if (!aiSection) {
            return { error: "AI section not found", status: 404 };
        }

        // Create or update equivalent SocialProofSection
        // Check if we already applied this AI section before
        const existingSocialProofSection = await prisma.socialProofSection.findFirst({
            where: {
                shop,
                // Use title matching to find existing section (AI sections don't have direct relation)
                title: aiSection.sectionName,
            },
        });

        let socialProofSection;
        if (existingSocialProofSection) {
            // Update existing section
            socialProofSection = await prisma.socialProofSection.update({
                where: { id: existingSocialProofSection.id },
                data: {
                    type: aiSection.sectionType,
                    status: "active",
                    content: JSON.stringify({
                        html: aiSection.htmlCode,
                        css: aiSection.cssCode,
                        js: aiSection.jsCode,
                        liquid: aiSection.liquidCode,
                    }),
                    settings: aiSection.previewData,
                    updatedAt: new Date(),
                },
            });
        } else {
            // Create new section
            socialProofSection = await prisma.socialProofSection.create({
                data: {
                    shop,
                    title: aiSection.sectionName,
                    type: aiSection.sectionType,
                    status: "active",
                    content: JSON.stringify({
                        html: aiSection.htmlCode,
                        css: aiSection.cssCode,
                        js: aiSection.jsCode,
                        liquid: aiSection.liquidCode,
                    }),
                    settings: aiSection.previewData,
                },
            });
        }

        // Update AI section status
        await prisma.aISection.update({
            where: { id: aiSectionId },
            data: {
                status: "applied",
                appliedAt: new Date(),
            },
        });

        return {
            success: true,
            socialProofSectionId: socialProofSection.id,
        };
    } catch (error) {
        console.error("Apply AI section error:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to apply section",
            status: 500,
        };
    }
};
