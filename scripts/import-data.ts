
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const db = new PrismaClient();

async function importData() {
    console.log('📥 Importing data to Live PostgreSQL database...');

    try {
        const dataPath = path.join(process.cwd(), 'scripts', 'data_export.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const data = JSON.parse(rawData);

        // Import Sections
        console.log(`📦 Importing ${data.sections.length} Sections...`);
        for (const item of data.sections) {
            await db.section.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }

        // Import AISections
        console.log(`📦 Importing ${data.aiSections.length} AISections...`);
        for (const item of data.aiSections) {
            await db.aISection.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }

        // Import ChatConversations
        console.log(`📦 Importing ${data.chatConversations.length} ChatConversations...`);
        for (const item of data.chatConversations) {
            await db.chatConversation.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }

        // Import Templates
        console.log(`📦 Importing ${data.templates.length} Templates...`);
        for (const item of data.templates) {
            await db.template.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }

        // Import SocialProofSections
        console.log(`📦 Importing ${data.socialProofSections.length} SocialProofSections...`);
        for (const item of data.socialProofSections) {
            await db.socialProofSection.upsert({
                where: { id: item.id },
                update: item,
                create: item,
            });
        }

        // Import AppSettings
        console.log(`📦 Importing ${data.appSettings.length} AppSettings...`);
        for (const item of data.appSettings) {
            await db.appSettings.upsert({
                where: { shop: item.shop },
                update: item,
                create: item,
            });
        }

        console.log('✅ Import completed successfully!');

    } catch (error) {
        console.error('❌ Import failed:', error);
    } finally {
        await db.$disconnect();
    }
}

importData();
