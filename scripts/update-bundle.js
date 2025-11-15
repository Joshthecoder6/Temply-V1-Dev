/**
 * Update Complete Product Page Bundle
 * Entfernt die beiden nicht-angepassten Sections (4-text-image, 5-faq)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Aktualisiere Complete Product Page Bundle...\n');

  // Finde das Bundle
  const bundle = await prisma.template.findFirst({
    where: {
      name: {
        contains: 'Complete Product Page Bundle'
      }
    }
  });

  if (!bundle) {
    console.error('❌ Bundle nicht gefunden!');
    process.exit(1);
  }

  console.log('✅ Bundle gefunden:', bundle.name);
  console.log('📋 ID:', bundle.id);
  
  // Parse aktuelle settings
  const settings = bundle.settings ? JSON.parse(bundle.settings) : {};
  console.log('\n📦 Aktuelle sectionFiles:', settings.sectionFiles);

  // Aktualisiere sectionFiles: Entferne die letzten 2 (4-text-image, 5-faq)
  const updatedSectionFiles = [
    '1-text-section.liquid',
    '2-text-image-accordion.liquid',
    '3-full-width-image.liquid'
  ];

  settings.sectionFiles = updatedSectionFiles;

  // Update in DB
  await prisma.template.update({
    where: { id: bundle.id },
    data: {
      settings: JSON.stringify(settings)
    }
  });

  console.log('\n✅ Bundle erfolgreich aktualisiert!');
  console.log('📦 Neue sectionFiles:', updatedSectionFiles);
  console.log('\n✨ Das Bundle enthält jetzt nur noch die 3 angepassten Sections:');
  console.log('   1. Text Section');
  console.log('   2. Text, Image & Accordion');
  console.log('   3. Full Width Image');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

