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

  // Read all liquid template files
  const templatesDir = path.join(__dirname, 'templates');
  
  const templateFiles = [
    { file: '1-text-section.liquid', name: 'Text Section', description: 'A simple text section with heading, text, and optional button.' },
    { file: '2-text-image-accordion.liquid', name: 'Text + Image + Accordion', description: 'A section with text, image, and accordion items.' },
    { file: '3-full-width-image.liquid', name: 'Full Width Image', description: 'A full-width image section with optional overlay text.' },
    { file: '4-text-image.liquid', name: 'Text + Image', description: 'A section combining text and image side by side.' },
    { file: '5-faq.liquid', name: 'FAQ Section', description: 'A frequently asked questions section with expandable items.' },
    { file: 'test-section.liquid', name: 'Image with Benefits', description: 'A section displaying a central image with benefit boxes on both sides.' },
  ];

  const templates = [];

  for (const templateFile of templateFiles) {
    const liquidPath = path.join(templatesDir, templateFile.file);
    
    if (!fs.existsSync(liquidPath)) {
      console.warn(`⚠️  Template file not found: ${templateFile.file}`);
      continue;
    }

    const liquidCode = fs.readFileSync(liquidPath, 'utf-8');
    const cleanName = templateFile.file.replace(/^\d+-/, '').replace('.liquid', '');
    
    // All templates are single sections (not bundles)
    const settings = {
      sectionType: cleanName,
      requiresAppEmbed: true,
      filename: templateFile.file
    };

    // Use a placeholder image or the product image for preview
    const previewImage = templateFile.file === 'test-section.liquid' 
      ? 'https://cdn.shopify.com/s/files/1/0799/5880/2740/files/example_product_cropped.png?v=1718548170'
      : 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png';

    templates.push({
      name: templateFile.name,
      description: templateFile.description,
      category: 'product-page',
      previewImage: previewImage,
      isActive: true,
      isFeatured: templateFile.file === 'test-section.liquid' || templateFile.file === '1-text-section.liquid',
      settings: JSON.stringify(settings),
      liquidCode: liquidCode,
      sections: JSON.stringify({
        type: cleanName,
        schema: {
          name: templateFile.name,
          settings: {}
        }
      })
    });
  }

  // Create templates in database
  for (const template of templates) {
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
