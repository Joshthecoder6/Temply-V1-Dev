import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    try {
        const aiSections = await prisma.aISection.findMany({
            where: { shop },
            orderBy: { createdAt: "desc" },
        });

        return {
            success: true,
            sections: aiSections,
        };
    } catch (error) {
        console.error("List AI sections error:", error);
        return {
            error: error instanceof Error ? error.message : "Failed to list sections",
            status: 500,
        };
    }
};
