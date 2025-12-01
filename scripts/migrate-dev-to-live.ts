// Script to migrate data from Dev SQLite to Live PostgreSQL
import { PrismaClient } from '@prisma/client';

async function migrateDevelopmentData() {
    console.log('🚀 Starting migration from Dev to Live...\n');

    // Dev DB (SQLite)
    const devDb = new PrismaClient({
        datasources: {
            db: {
                url: 'file:./prisma/dev.db',
            },
        },
    });

    // Live DB (PostgreSQL on Heroku)
    const liveDb = new PrismaClient({
        datasources: {
            db: {
                url: process.env.LIVE_DATABASE_URL || '',
            },
        },
    });

    try {
        // 1. Migrate ThemeSections
        console.log('📦 Migrating ThemeSections...');
        const themeSections = await devDb.themeSection.findMany();
        console.log(`Found ${themeSections.length} theme sections in Dev DB`);

        for (const section of themeSections) {
            await liveDb.themeSection.upsert({
                where: { id: section.id },
                update: {
                    name: section.name,
                    description: section.description,
                    category: section.category,
                    liquidCode: section.liquidCode,
                    schemaJson: section.schemaJson,
                    previewImageUrl: section.previewImageUrl,
                    isPremium: section.isPremium,
                    tags: section.tags,
                },
                create: {
                    id: section.id,
                    name: section.name,
                    description: section.description,
                    category: section.category,
                    liquidCode: section.liquidCode,
                    schemaJson: section.schemaJson,
                    previewImageUrl: section.previewImageUrl,
                    isPremium: section.isPremium,
                    tags: section.tags,
                    createdAt: section.createdAt,
                    updatedAt: section.updatedAt,
                },
            });
        }
        console.log(`✅ Migrated ${themeSections.length} theme sections\n`);

        // 2. Migrate Funnels
        console.log('📦 Migrating Funnels...');
        const funnels = await devDb.funnel.findMany();
        console.log(`Found ${funnels.length} funnels in Dev DB`);

        for (const funnel of funnels) {
            await liveDb.funnel.upsert({
                where: { id: funnel.id },
                update: {
                    name: funnel.name,
                    description: funnel.description,
                    category: funnel.category,
                    isPremium: funnel.isPremium,
                    previewImageUrl: funnel.previewImageUrl,
                },
                create: {
                    id: funnel.id,
                    name: funnel.name,
                    description: funnel.description,
                    category: funnel.category,
                    isPremium: funnel.isPremium,
                    previewImageUrl: funnel.previewImageUrl,
                    createdAt: funnel.createdAt,
                    updatedAt: funnel.updatedAt,
                },
            });
        }
        console.log(`✅ Migrated ${funnels.length} funnels\n`);

        // 3. Migrate FunnelPages
        console.log('📦 Migrating FunnelPages...');
        const funnelPages = await devDb.funnelPage.findMany();
        console.log(`Found ${funnelPages.length} funnel pages in Dev DB`);

        for (const page of funnelPages) {
            await liveDb.funnelPage.upsert({
                where: { id: page.id },
                update: {
                    funnelId: page.funnelId,
                    name: page.name,
                    liquidCode: page.liquidCode,
                    order: page.order,
                },
                create: {
                    id: page.id,
                    funnelId: page.funnelId,
                    name: page.name,
                    liquidCode: page.liquidCode,
                    order: page.order,
                    createdAt: page.createdAt,
                    updatedAt: page.updatedAt,
                },
            });
        }
        console.log(`✅ Migrated ${funnelPages.length} funnel pages\n`);

        console.log('🎉 Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`  - Theme Sections: ${themeSections.length}`);
        console.log(`  - Funnels: ${funnels.length}`);
        console.log(`  - Funnel Pages: ${funnelPages.length}`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await devDb.$disconnect();
        await liveDb.$disconnect();
    }
}

migrateDevelopmentData();
