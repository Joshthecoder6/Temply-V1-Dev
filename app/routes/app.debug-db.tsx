
import { useLoaderData } from "react-router";
import prisma from "../db.server";

export const loader = async () => {
    try {
        const sections = await prisma.section.findMany();
        const aiSections = await prisma.aISection.findMany();
        const appSettings = await prisma.appSettings.findMany();

        return {
            status: "ok",
            counts: {
                sections: sections.length,
                aiSections: aiSections.length,
                appSettings: appSettings.length
            },
            sections: sections.map(s => ({ id: s.id, name: s.displayName, active: s.isActive })),
            env: {
                DATABASE_URL: process.env.DATABASE_URL ? "Set" : "Not Set"
            }
        };
    } catch (error: any) {
        return { status: "error", message: error.message, stack: error.stack };
    }
};

export default function DebugDB() {
    const data = useLoaderData<typeof loader>();
    return (
        <div style={{ padding: 20, fontFamily: 'monospace' }}>
            <h1>Database Debug</h1>
            <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
    );
}
