// Export Dev DB data to JSON for import to Live
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const db = new PrismaClient({
    datasources: {
        db: {
            url: 'file:./prisma/dev.db',
        },
    },
});

async function exportData() {
    console.log('📤 Exporting data from Dev database...\n');

    try {
        const themeSections = await db.themeSection.findMany();
        const funnels = await db.funnel.findMany();
        const funnelPages = await db.funnelPage.findMany();

        const data = {
            themeSections,
            funnels,
            funnelPages,
        };

        fs.writeFileSync('./scripts/dev-data.json', JSON.stringify(data, null, 2));

        console.log(`✅ Exported:`);
        console.log(`   - ${themeSections.length} theme sections`);
        console.log(`   - ${funnels.length} funnels`);
        console.log(`   - ${funnelPages.length} funnel pages`);
        console.log(`\nData written to ./scripts/dev-data.json`);

    } catch (error) {
        console.error('❌ Export failed:', error);
        throw error;
    } finally {
        await db.$disconnect();
    }
}

exportData();
