import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing templates
  await prisma.template.deleteMany({});

  // Create "Complete Product Page Bundle" - a bundle template with multiple sections
  const bundleSectionFiles = [
    '1-text-section.liquid',
    '2-text-image-accordion.liquid',
    '3-full-width-image.liquid'
  ];

  const bundleTemplate = {
    name: 'Complete Product Page Bundle',
    description: 'Vollständige Produktseite mit 3 Sektionen: Text Section, Text + Image + Accordion, und Full Width Image.',
    category: 'product-page',
    previewImage: 'https://cdn.shopify.com/s/files/1/0799/5880/2740/files/example_product_cropped.png?v=1718548170',
    isActive: true,
    isFeatured: true,
    settings: JSON.stringify({
      sectionFiles: bundleSectionFiles,
      requiresAppEmbed: true
    }),
    liquidCode: null, // Bundle templates don't have a single liquidCode
    sections: null
  };

  const createdBundle = await prisma.template.create({
    data: bundleTemplate
  });
  console.log(`✅ Created template: ${createdBundle.name}`);

  // Create "Coming Soon" placeholder templates
  const comingSoonTemplates = [
    {
      name: 'Coming Soon',
      description: 'This template is coming soon. Stay tuned!',
      category: 'coming-soon',
      previewImage: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      isActive: true,
      isFeatured: false,
      settings: JSON.stringify({}),
      liquidCode: null,
      sections: null
    },
    {
      name: 'Coming Soon',
      description: 'This template is coming soon. Stay tuned!',
      category: 'coming-soon',
      previewImage: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      isActive: true,
      isFeatured: false,
      settings: JSON.stringify({}),
      liquidCode: null,
      sections: null
    }
  ];

  for (const template of comingSoonTemplates) {
    const created = await prisma.template.create({
      data: template
    });
    console.log(`✅ Created template: ${created.name}`);
  }

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
