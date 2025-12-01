
import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function checkDb() {
    console.log('🔍 Checking Live Database Content...');

    try {
        // Check Sections
        const sections = await db.section.findMany();
        console.log(`\n📊 Total Sections: ${sections.length}`);

        console.log('\n📋 Section List:');
        sections.forEach(s => {
            console.log(`- [${s.isActive ? 'ACTIVE' : 'INACTIVE'}] ${s.displayName} (ID: ${s.id}, Editor: ${s.editorName})`);
        });

        // Check AI Sections
        const aiSections = await db.aISection.findMany();
        console.log(`\n🤖 Total AI Sections: ${aiSections.length}`);

    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        await db.$disconnect();
    }
}

checkDb();
