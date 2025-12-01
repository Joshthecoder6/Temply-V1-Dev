// Import data into Live Database
// Run this ON HEROKU with: heroku run node build/scripts/import-data.js -a temply-live
import { db } from '../app/db.server.js';

async function importData() {
    console.log('📥 Importing data to Live database...\n');

    try {
        // Theme Sections data
        const themeSections = [
            // Data will be populated here
        ];

        // Funnels data
        const funnels = [
            // Data will be populated here
        ];

        // Funnel Pages data
        const funnelPages = [
            // Data will be populated here  
        ];

        // Import Theme Sections
        console.log(`📦 Importing ${themeSections.length} theme sections...`);
        for (const section of themeSections) {
            await db.themeSection.upsert({
                where: { id: section.id },
                update: section,
                create: section,
            });
        }

        // Import Funnels
        console.log(`📦 Importing ${funnels.length} funnels...`);
        for (const funnel of funnels) {
            await db.funnel.upsert({
                where: { id: funnel.id },
                update: funnel,
                create: funnel,
            });
        }

        // Import Funnel Pages
        console.log(`📦 Importing ${funnelPages.length} funnel pages...`);
        for (const page of funnelPages) {
            await db.funnelPage.upsert({
                where: { id: page.id },
                update: page,
                create: page,
            });
        }

        console.log('\n✅ Import completed successfully!');

    } catch (error) {
        console.error('❌ Import failed:', error);
        throw error;
    } finally {
        await db.$disconnect();
    }
}

importData();
