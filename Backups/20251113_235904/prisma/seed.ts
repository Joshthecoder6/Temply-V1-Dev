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

  // Read the test section liquid code
  const liquidCodePath = path.join(__dirname, 'templates', 'test-section.liquid');
  const liquidCode = fs.readFileSync(liquidCodePath, 'utf-8');

  // Create test templates with realistic JSON structures
  const templates = [
    {
      name: 'Test Section - Image with Benefits',
      description: 'A test section displaying a central image with benefit boxes on both sides. Includes customizable icons, text, and styling options.',
      category: 'product-page',
      previewImage: 'https://cdn.shopify.com/s/files/1/0799/5880/2740/files/example_product_cropped.png?v=1718548170',
      demoUrl: 'https://demo.temply.app/test-section',
      isActive: true,
      isFeatured: true,
      sections: JSON.stringify({
        type: 'test-section',
        schema: {
          name: '🖼️: Image with Benefits',
          settings: {
            headline_text: 'Why Temply?',
            max_block_width: 140,
            headline_text_size: 70,
            icon_size_desktop: 50,
            icon_size_mobile: 35
          }
        }
      }),
      settings: JSON.stringify({
        sectionType: 'test-section',
        requiresAppEmbed: true,
        filename: 'test-section.liquid'
      }),
      liquidCode: liquidCode
    },
    {
      name: 'Blank template',
      description: 'Start from scratch with a clean slate. Perfect for custom designs.',
      category: 'blank',
      previewImage: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      demoUrl: 'https://demo.sectionstore.com/blank',
      isActive: true,
      isFeatured: true,
      sections: JSON.stringify({
        page: {
          title: "Blank Page",
          handle: "blank-page",
          sections: []
        }
      }),
      settings: JSON.stringify({
        pageType: 'blank',
        layout: 'default'
      })
    },
    {
      name: 'BFCM Home Page',
      description: 'Optimized Black Friday & Cyber Monday homepage with conversion-focused sections.',
      category: 'home-page',
      previewImage: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      demoUrl: 'https://demo.sectionstore.com/bfcm',
      isActive: true,
      isFeatured: true,
      sections: JSON.stringify({
        page: {
          title: "Black Friday Sale",
          handle: "bfcm-home",
          sections: [
            {
              type: "hero-banner",
              order: 1,
              settings: {
                heading: "BLACK FRIDAY MEGA SALE",
                subheading: "Up to 75% OFF Everything",
                buttonText: "Shop Now",
                backgroundColor: "#000000",
                textColor: "#FFFFFF"
              }
            },
            {
              type: "countdown-timer",
              order: 2,
              settings: {
                endDate: "2024-11-29T23:59:59",
                timerStyle: "flip",
                backgroundColor: "#FF0000"
              }
            },
            {
              type: "featured-products",
              order: 3,
              settings: {
                productsPerRow: 4,
                showPrices: true,
                showComparePrice: true
              }
            },
            {
              type: "testimonials",
              order: 4,
              settings: {
                layout: "carousel",
                showRatings: true,
                backgroundColor: "#F5F5F5"
              }
            }
          ]
        }
      }),
      settings: JSON.stringify({
        pageType: 'home-page',
        theme: 'dark',
        primaryColor: '#FF0000',
        layout: 'full-width'
      })
    },
    {
      name: 'Food Dog Freedom Landing',
      description: 'Complete landing page for pet food products with trust signals and benefits.',
      category: 'landing-page',
      previewImage: 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png',
      demoUrl: 'https://demo.sectionstore.com/pet-food',
      isActive: true,
      isFeatured: true,
      sections: JSON.stringify({
        page: {
          title: "Premium Dog Food",
          handle: "dog-food-landing",
          sections: [
            {
              type: "hero-section",
              order: 1,
              settings: {
                heading: "Fresh, Healthy Meals for Your Best Friend",
                subheading: "Quality you can trust, taste they'll love",
                image: "hero-dog-food.jpg",
                buttonText: "Shop Now",
                buttonSecondaryText: "Learn More",
                backgroundColor: "#FEF3C7"
              }
            },
            {
              type: "benefits-grid",
              order: 2,
              settings: {
                columns: 3,
                benefits: [
                  { icon: "🥩", title: "100% Natural", description: "All-natural ingredients" },
                  { icon: "🚚", title: "Free Delivery", description: "On orders over $50" },
                  { icon: "❤️", title: "Vet Approved", description: "Recommended by vets" }
                ]
              }
            },
            {
              type: "product-showcase",
              order: 3,
              settings: {
                featuredProduct: "dog-food-chicken",
                showIngredients: true,
                showNutrition: true
              }
            },
            {
              type: "social-proof",
              order: 4,
              settings: {
                showReviews: true,
                showTestimonials: true,
                trustBadges: ["money-back", "secure-checkout", "free-shipping"]
              }
            }
          ]
        }
      }),
      settings: JSON.stringify({
        pageType: 'landing-page',
        theme: 'light',
        primaryColor: '#F5A623',
        layout: 'centered',
        maxWidth: '1200px'
      })
    }
  ];

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

