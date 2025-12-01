import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// Helper: Extract editor name from Liquid schema
function extractEditorNameFromLiquid(liquidCode: string): string {
  const schemaRegex = /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/;
  const match = liquidCode.match(schemaRegex);
  
  if (!match) return 'Unknown Section';
  
  try {
    const schema = JSON.parse(match[1].trim());
    return schema.name || 'Unknown Section';
  } catch {
    return 'Unknown Section';
  }
}

// Helper: Create display name from editor name (remove "TP - " prefix)
function createDisplayName(editorName: string): string {
  return editorName.replace(/^TP\s*[-:]\s*/i, '').trim();
}

// Helper: Create internal name from filename
function createInternalName(filename: string): string {
  return filename
    .replace(/^tp-/, '')
    .replace(/\.txt$/, '')
    .replace(/-/g, '-');
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing sections
  await prisma.section.deleteMany({});
  console.log('🗑️  Cleared existing sections');

  // Clear existing templates (except Coming Soon and Test Product)
  await prisma.template.deleteMany({
    where: {
      NOT: {
        OR: [
          { name: { contains: 'Coming Soon' } },
          { name: { contains: 'Complete Product Page Bundle' } }
        ]
      }
    }
  });
  console.log('🗑️  Cleared existing templates (kept Coming Soon and Test Product)');

  // Get the app URL from environment or use a default
  const appUrl = process.env.SHOPIFY_APP_URL || process.env.HOST || 'https://temply-staging-bf8d15314778.herokuapp.com';
  const baseUrl = appUrl.replace(/\/$/, '');

  // Section files mapping: filename -> display name
  const sectionFiles = [
    { filename: 'tp-article-body.txt', displayName: 'Article Body' },
    { filename: 'tp-auther-summary.txt', displayName: 'Author Summary' },
    { filename: 'tp-benefits.txt', displayName: 'Benefits' },
    { filename: 'tp-countdown-timer.txt', displayName: 'Countdown Timer' },
    { filename: 'tp-cta-banner.txt', displayName: 'CTA Banner' },
    { filename: 'tp-custom-richt-text.txt', displayName: 'Custom Rich Text' },
    { filename: 'tp-faq.txt', displayName: 'FAQ' },
    { filename: 'tp-flexible-promo-bar.txt', displayName: 'Flexible Promo Bar' },
    { filename: 'tp-flexible-row.txt', displayName: 'Flexible Row' },
    { filename: 'tp-landing-page-full-image.txt', displayName: 'Landing Page Full Image' },
    { filename: 'tp-landing-page-hero.txt', displayName: 'Landing Page Hero' },
    { filename: 'tp-offer-box.txt', displayName: 'Offer Box' },
    { filename: 'tp-product-features.txt', displayName: 'Product Features' },
    { filename: 'tp-reviews.txt', displayName: 'Reviews' },
    { filename: 'tp-trustpilot.txt', displayName: 'Trustpilot' },
  ];

  // Path to sections directory
  const sectionsDir = path.join(process.env.HOME || '', 'Downloads', 'Sections');

  // Create sections from files
  for (const sectionFile of sectionFiles) {
    const filePath = path.join(sectionsDir, sectionFile.filename);
    
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️  File not found: ${filePath}`);
        continue;
      }

      const liquidCode = fs.readFileSync(filePath, 'utf-8');
      const editorName = extractEditorNameFromLiquid(liquidCode);
      const displayName = createDisplayName(editorName);
      const internalName = createInternalName(sectionFile.filename);

      // Determine category based on filename
      let category: string | null = null;
      if (sectionFile.filename.includes('landing-page')) {
        category = 'landing-page';
      } else if (sectionFile.filename.includes('product')) {
        category = 'product-page';
      } else {
        category = 'general';
      }

      const section = await prisma.section.create({
        data: {
          name: internalName,
          displayName: displayName,
          editorName: editorName,
          liquidCode: liquidCode,
          category: category,
          previewImage: `${baseUrl}/Product-Image/ComingSoon.png`,
          description: `A customizable ${displayName} section for your theme.`,
          isActive: true,
        },
      });

      console.log(`✅ Created section: ${section.displayName} (${section.name})`);
    } catch (error) {
      console.error(`❌ Error processing ${sectionFile.filename}:`, error);
    }
  }

  // Keep existing "Coming Soon" templates and Test Product Bundle
  const existingTemplates = await prisma.template.findMany();
  if (existingTemplates.length === 0) {
    // Create "Coming Soon" placeholder templates if they don't exist
    const comingSoonTemplates = [
      {
        name: 'Coming Soon',
        description: 'This template is coming soon. Stay tuned!',
        category: 'coming-soon',
        previewImage: `${baseUrl}/Product-Image/ComingSoon.png`,
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
        previewImage: `${baseUrl}/Product-Image/ComingSoon.png`,
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

    // Create Test Product Bundle if it doesn't exist
    const bundleSectionFiles = [
      '1-text-section.liquid',
      '2-text-image-accordion.liquid',
      '3-full-width-image.liquid'
    ];

    const bundleTemplate = {
      name: 'Complete Product Page Bundle',
      description: 'Vollständige Produktseite mit 3 Sektionen: Text Section, Text + Image + Accordion, und Full Width Image.',
      category: 'product-page',
      previewImage: `${baseUrl}/product-bundle-preview.png`,
      isActive: true,
      isFeatured: true,
      settings: JSON.stringify({
        sectionFiles: bundleSectionFiles,
        requiresAppEmbed: true
      }),
      liquidCode: null,
      sections: null
    };

    const createdBundle = await prisma.template.create({
      data: bundleTemplate
    });
    console.log(`✅ Created template: ${createdBundle.name}`);
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
