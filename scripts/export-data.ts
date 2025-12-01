
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

async function exportData() {
    console.log('📤 Exporting data from local SQLite database...');

    try {
        const sections = await db.section.findMany();
        console.log(`Found ${sections.length} Sections`);

        const aiSections = await db.aISection.findMany();
        console.log(`Found ${aiSections.length} AISections`);

        const chatConversations = await db.chatConversation.findMany();
        console.log(`Found ${chatConversations.length} ChatConversations`);

        const templates = await db.template.findMany();
        console.log(`Found ${templates.length} Templates`);

        const socialProofSections = await db.socialProofSection.findMany();
        console.log(`Found ${socialProofSections.length} SocialProofSections`);

        const appSettings = await db.appSettings.findMany();
        console.log(`Found ${appSettings.length} AppSettings`);

        const data = {
            sections,
            aiSections,
            chatConversations,
            templates,
            socialProofSections,
            appSettings
        };

        const outputPath = path.join(process.cwd(), 'scripts', 'data_export.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
        console.log(`✅ Data exported to ${outputPath}`);

    } catch (error) {
        console.error('❌ Export failed:', error);
    } finally {
        await db.$disconnect();
    }
}

exportData();
