import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import { useLoaderData } from "react-router";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  Modal,
  Badge,
  List,
} from "@shopify/polaris";
import { ChevronLeftIcon, ChevronRightIcon, ExternalIcon } from "@shopify/polaris-icons";
import prisma from "../db.server";
import * as fs from 'fs';
import * as path from 'path';

// Helper: Extrahiere Section-Name aus Liquid-Code
function extractSectionNameFromLiquid(liquidCode: string): string {
  const schemaRegex = /{%\s*schema\s*%}([\s\S]*?){%\s*endschema\s*%}/;
  const match = liquidCode.match(schemaRegex);
  
  if (!match) return 'Unknown Section';
  
  try {
    const schema = JSON.parse(match[1].trim());
    // Entferne "TP: " Präfix falls vorhanden
    const name = schema.name || 'Unknown Section';
    return name.replace(/^TP:\s*/, '').trim();
  } catch {
    return 'Unknown Section';
  }
}

// Helper: Extrahiere Section-Beschreibung aus Liquid-Code (falls vorhanden)
function extractSectionDescriptionFromLiquid(liquidCode: string): string {
  // Standard-Beschreibung basierend auf Dateiname
  return 'A customizable section for your theme.';
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  try {
    // Lade alle Templates aus der DB
    const templates = await prisma.template.findMany({
      where: {
        isActive: true
      }
    });

    // Sammle alle eindeutigen Sections
    const sectionsMap = new Map<string, {
      id: string;
      name: string;
      description: string;
      previewImage: string;
      filename: string;
    }>();

    const templatesDir = path.join(process.cwd(), 'prisma', 'templates');

    for (const template of templates) {
      try {
        const settings = template.settings ? JSON.parse(template.settings) : {};
        
        // Bundle Template: Extrahiere Sections aus sectionFiles
        if (settings.sectionFiles && Array.isArray(settings.sectionFiles)) {
          for (const sectionFile of settings.sectionFiles) {
            const sectionId = sectionFile.replace('.liquid', '');
            
            // Überspringe wenn bereits vorhanden
            if (sectionsMap.has(sectionId)) continue;
            
            // Lese Liquid-Datei
            const liquidPath = path.join(templatesDir, sectionFile);
            if (fs.existsSync(liquidPath)) {
              try {
                const liquidCode = fs.readFileSync(liquidPath, 'utf-8');
                const name = extractSectionNameFromLiquid(liquidCode);
                const description = extractSectionDescriptionFromLiquid(liquidCode);
                
                sectionsMap.set(sectionId, {
                  id: sectionId,
                  name: name,
                  description: description,
                  previewImage: template.previewImage || '/Product-Image/ComingSoon.png',
                  filename: sectionFile
                });
              } catch (error) {
                console.error(`Error reading section file ${sectionFile}:`, error);
              }
            }
          }
        }
        
        // Einzelne Section: Verwende liquidCode
        if (template.liquidCode) {
          try {
            const name = extractSectionNameFromLiquid(template.liquidCode);
            const description = extractSectionDescriptionFromLiquid(template.liquidCode);
            const sectionId = template.id;
            
            if (!sectionsMap.has(sectionId)) {
              sectionsMap.set(sectionId, {
                id: sectionId,
                name: name,
                description: description,
                previewImage: template.previewImage || '/Product-Image/ComingSoon.png',
                filename: template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.liquid'
              });
            }
          } catch (error) {
            console.error(`Error processing template ${template.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing template ${template.id}:`, error);
        // Weiter mit nächstem Template
      }
    }

    // Konvertiere Map zu Array
    const sections = Array.from(sectionsMap.values());

    return { sections };
  } catch (error) {
    console.error('Error in theme-sections loader:', error);
    // Fallback: Leeres Array zurückgeben
    return { sections: [] };
  }
};

// Fallback Sections (falls keine in DB gefunden)
const fallbackSections: Array<{
  id: string;
  name: string;
  description: string;
  previewImage: string;
  filename: string;
}> = [
  {
    id: '1',
    name: 'Frequently Asked Questions (FAQ)',
    description: 'Provide clear answers to common questions, making it easier for users to find the information they need.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: '5-faq.liquid',
  },
  {
    id: '2',
    name: 'Featured Products Carousel',
    description: 'Create a Featured Products Carousel by handpicking the ones you want to promote and place it on any page.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'featured-products-carousel.liquid',
  },
  {
    id: '3',
    name: 'Collection Products Carousel',
    description: 'Feature products from a collection in a highly customizable carousel. Place it on homepage or any page.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'collection-products-carousel.liquid',
  },
  {
    id: '4',
    name: 'Image & Text - Simple',
    description: 'Showcase specific content along eye-catching images. Highlight offers or product benefits using Image & Text sections.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: '4-text-image.liquid',
  },
  {
    id: '5',
    name: 'Collection Banners',
    description: 'Promote your popular collections with attractive banners and guide customers through your store.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'collection-banners.liquid',
  },
  {
    id: '6',
    name: 'Image & Text - Overlap',
    description: 'Make your content stand out with overlapping images and text. Highlight promotions, product features, or brand stories.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'image-text-overlap.liquid',
  },
  {
    id: '7',
    name: 'Product Bundles & Quantity Tiers',
    description: 'Create bundle offers and volume discounts that encourage customers to buy more. Perfect for Black Friday deals.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'product-bundles.liquid',
  },
  {
    id: '8',
    name: 'Two Images & Text',
    description: 'Showcase content with a balanced layout of two images and text. Ideal for highlighting product features, sales, or brand stories.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'two-images-text.liquid',
  },
  {
    id: '9',
    name: 'Collection Circles',
    description: 'Display your collections in a stylish circular layout. A perfect way to guide customers through categories, especially on mobile.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'collection-circles.liquid',
  },
  {
    id: '10',
    name: 'Media Gallery',
    description: 'Showcase images in a beautiful gallery layout. Perfect for displaying product photos, brand visuals, or customer highlights.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'media-gallery.liquid',
  },
  {
    id: '11',
    name: 'Flash Sale Countdown',
    description: 'Create urgency and boost sales with a countdown timer. Highlight limited-time offers and encourage quick purchases.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'flash-sale-countdown.liquid',
  },
  {
    id: '12',
    name: 'Countdown Timer Banner',
    description: 'Grab attention with a countdown timer over a custom background. Highlight flash sales, special events, or limited-time offers.',
    previewImage: '/Product-Image/ComingSoon.png',
    filename: 'countdown-timer-banner.liquid',
  },
];

export default function ThemeSections() {
  const loaderData = useLoaderData<typeof loader>();
  const [showPremiumView, setShowPremiumView] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<typeof fallbackSections[0] | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);
  
  // Verwende Sections aus DB oder Fallback
  const sections = loaderData?.sections || [];
  const themeSections = sections && sections.length > 0 ? sections : fallbackSections;

  // Handler für "View section" Button
  const handleViewSection = (section: typeof fallbackSections[0]) => {
    setSelectedSection(section);
    setActiveCarouselIndex(0);
    setIsModalOpen(true);
  };

  // Carousel Navigation
  const handleCarouselNext = () => {
    if (selectedSection) {
      const carouselImages = getCarouselImages(selectedSection);
      setActiveCarouselIndex((prev) => (prev + 1) % carouselImages.length);
    }
  };

  const handleCarouselPrev = () => {
    if (selectedSection) {
      const carouselImages = getCarouselImages(selectedSection);
      setActiveCarouselIndex((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);
    }
  };

  // Platzhalter für Carousel-Bilder (später dynamisch)
  const getCarouselImages = (section: typeof fallbackSections[0]) => {
    // Erstmal 5 Platzhalter-Bilder zurückgeben
    return [
      section.previewImage,
      section.previewImage,
      section.previewImage,
      section.previewImage,
      section.previewImage,
    ];
  };

  // Modal-Breite direkt im DOM setzen - nur für unser Modal
  useEffect(() => {
    if (isModalOpen) {
      const setModalWidth = () => {
        // Finde nur Modal-Dialog-Elemente, die zu unserem Modal gehören
        const modalDialogs = document.querySelectorAll('[role="dialog"]');
        modalDialogs.forEach((dialog: any) => {
          // Prüfe ob es unser Modal ist (enthält unseren Content)
          const hasOurContent = dialog.querySelector('[style*="f6f6f7"]') || 
                                dialog.textContent?.includes(selectedSection?.name || '');
          if (hasOurContent && dialog.style) {
            dialog.style.maxWidth = '1100px';
            dialog.style.width = '1100px';
            dialog.style.margin = '0 auto';
          }
        });

        // Finde nur Container-Elemente, die zu unserem Modal gehören
        const containers = document.querySelectorAll('[class*="Polaris-Modal"]');
        containers.forEach((container: any) => {
          const hasOurContent = container.querySelector('[style*="f6f6f7"]') ||
                               container.textContent?.includes(selectedSection?.name || '');
          if (hasOurContent && container.style) {
            const computedStyle = window.getComputedStyle(container);
            if (computedStyle.maxWidth && parseInt(computedStyle.maxWidth) < 1100) {
              container.style.maxWidth = '1100px';
              container.style.width = '1100px';
              container.style.margin = '0 auto';
            }
          }
        });
      };

      // Sofort setzen
      setModalWidth();
      
      // Und nach kurzer Verzögerung nochmal (falls Modal noch nicht vollständig gerendert)
      const timeout = setTimeout(setModalWidth, 100);
      const interval = setInterval(setModalWidth, 200);

      return () => {
        clearTimeout(timeout);
        clearInterval(interval);
      };
    }
  }, [isModalOpen, selectedSection]);

  return (
    <Page 
      title="Theme Sections"
      primaryAction={
        <Button
          variant={showPremiumView ? "primary" : "secondary"}
          onClick={() => setShowPremiumView(!showPremiumView)}
        >
          {showPremiumView ? "Show Basic View" : "Show Premium View"}
        </Button>
      }
    >
      <style>{`
        .black-button-override button {
          background-color: #1a1a1a !important;
          color: white !important;
        }
        .black-button-override button:hover {
          background-color: #2a2a2a !important;
        }
      `}</style>
      
      {showPremiumView ? (
        // Premium View: Grid mit Sections
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '60px 40px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }}>
          {/* Header */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: 600,
            textAlign: 'center',
            margin: '0 0 60px 0',
            color: '#202223'
          }}>
            Choose a section for your page
          </h1>

          {/* Sections Grid */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '20px',
            marginBottom: '40px'
          }}>
            {themeSections.map((section) => (
              <div
                key={section.id}
                style={{
                  width: '300.66px',
                  height: '351.89px',
                  background: 'white',
                  border: '1px solid #e1e3e5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                {/* Preview Image */}
                <div style={{ 
                  width: '100%', 
                  height: '280px',
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {section.previewImage && (
                    <img 
                      src={section.previewImage} 
                      alt={section.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  )}
                </div>

                {/* Content */}
                <div style={{ 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1
                }}>
                  <h3 style={{ 
                    margin: '0 0 12px 0', 
                    fontSize: '16px', 
                    fontWeight: 600,
                    color: '#202223'
                  }}>
                    {section.name}
                  </h3>
                  
                  <Text as="p" variant="bodyMd" tone="subdued" style={{ 
                    margin: '0 0 16px 0',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    flex: 1
                  }}>
                    {section.description}
                  </Text>

                  {/* Button - kleiner, linksbündig */}
                  <div style={{ width: 'auto' }}>
                    <Button 
                      variant="secondary"
                      onClick={() => handleViewSection(section)}
                    >
                      View section
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Basic View: Aktuelle Ansicht
        <BlockStack gap="500">
        {/* Introduction Card */}
        <Card>
          <InlineStack gap="500" align="start" blockAlign="center">
            {/* Illustration Image */}
            <div style={{
              flexShrink: 0,
              maxWidth: '400px'
            }}>
              <img 
                src="/theme-sections/picture-firsz.jpg" 
                alt="Theme Section Illustration"
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>

            {/* Text Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <BlockStack gap="400">
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  Templys' Theme Section: An introduction
                </Text>
                <Text as="p" variant="bodyMd">
                  All you need to do is edit the section once, and the information automatically updates across every page that uses that section including GemPages & Shopify pages.
                </Text>
                <div>
                  <Button variant="secondary">
                    Learn more
                  </Button>
                </div>
              </BlockStack>
            </div>
          </InlineStack>
        </Card>

        {/* Video Section */}
        <Card>
          <BlockStack gap="500" align="center">
            {/* Video Thumbnail */}
            <div style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <img 
                src="/theme-sections/video-mockup.png" 
                alt="Video Tutorial"
                style={{
                  width: '100%',
                  maxWidth: '600px',
                  height: 'auto',
                  display: 'block'
                }}
              />
            </div>

            {/* Text Content */}
            <BlockStack gap="400" align="center">
              <div style={{ textAlign: 'center', maxWidth: '800px' }}>
                <Text as="h2" variant="headingLg" fontWeight="semibold">
                  Create once, use everywhere with Theme Section
                </Text>
              </div>
              <div style={{ textAlign: 'center', maxWidth: '800px' }}>
                <Text as="p" variant="bodyMd">
                  Theme Section lets you design a global section that can be used on all your GemPages & Shopify pages. Any changes you make will be automatically updated on all pages that use it.
                </Text>
              </div>
              <InlineStack gap="300" align="center">
                <Button variant="secondary">
                  Learn more
                </Button>
                <div className="black-button-override">
                  <Button variant="primary">
                    <InlineStack gap="200" align="center" blockAlign="center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="white" stroke="white" strokeWidth="0.5"/>
                      </svg>
                      <span>Upgrade to create Theme Section</span>
                    </InlineStack>
                  </Button>
                </div>
              </InlineStack>
            </BlockStack>
          </BlockStack>
        </Card>

        {/* Bottom Spacing */}
        <div style={{ paddingBottom: '60px' }} />
      </BlockStack>
      )}

      {/* Section Detail Modal */}
      {selectedSection && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title=""
          large
        >
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            height: 'calc(100vh - 120px)',
            maxHeight: 'calc(100vh - 120px)',
            backgroundColor: '#f6f6f7',
            padding: '20px',
            width: '100%',
            overflowY: 'auto'
          }}>
            {/* Header with Back Button and Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Button
                icon={ChevronLeftIcon}
                variant="plain"
                onClick={() => setIsModalOpen(false)}
              />
              <Text as="h2" variant="headingLg" fontWeight="semibold">
                {selectedSection.name}
              </Text>
              <Badge status="info">New</Badge>
            </div>

            {/* Main Content: Two Columns Layout - Top Section */}
            <div style={{
              display: 'flex',
              gap: '24px',
              alignItems: 'flex-start'
            }}>
              {/* Left Side: Preview Image and Carousel */}
              <div style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <Card>
                  <div style={{
                    width: '590.68px',
                    height: '360px',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {selectedSection && (
                      <img 
                        src={getCarouselImages(selectedSection)[activeCarouselIndex]} 
                        alt={selectedSection.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    )}
                  </div>
                </Card>

                {/* Carousel Thumbnails - Under the image */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '590.68px',
                  justifyContent: 'center'
                }}>
                  <Button
                    icon={ChevronLeftIcon}
                    variant="plain"
                    onClick={handleCarouselPrev}
                    disabled={!selectedSection}
                  />
                  
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flex: 1,
                    justifyContent: 'center'
                  }}>
                    {selectedSection && getCarouselImages(selectedSection).map((img, index) => (
                      <div
                        key={index}
                        onClick={() => setActiveCarouselIndex(index)}
                        style={{
                          width: '80px',
                          height: '60px',
                          border: index === activeCarouselIndex ? '2px solid #008060' : '1px solid #e1e3e5',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          background: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <img 
                          src={img} 
                          alt={`Preview ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <Button
                    icon={ChevronRightIcon}
                    variant="plain"
                    onClick={handleCarouselNext}
                    disabled={!selectedSection}
                  />
                </div>
              </div>

              {/* Right Side: First 3 Cards */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                flexShrink: 0
              }}>
                {/* Card 1: Section Overview */}
                <Card>
                  <div style={{
                    width: '311.34px',
                    height: '283.95px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd" fontWeight="semibold">
                          {selectedSection.name}
                        </Text>
                        <Badge status="success">Installed</Badge>
                      </InlineStack>
                      
                      <List>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <Text as="span" variant="bodyMd">Add answers to common questions</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <Text as="span" variant="bodyMd">Reduce customer inquiries</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <Text as="span" variant="bodyMd">Boost buyer confidence</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <Text as="span" variant="bodyMd">Generate content with AI</Text>
                          </InlineStack>
                        </List.Item>
                      </List>

                      <BlockStack gap="200">
                        <Button variant="secondary" icon={ExternalIcon} size="slim">
                          View demo store
                        </Button>
                        <div className="black-button-override">
                          <Button variant="primary" fullWidth size="slim">
                            Customize section
                          </Button>
                        </div>
                      </BlockStack>
                    </BlockStack>
                  </div>
                </Card>

                {/* Card 2: How to add section */}
                <Card>
                  <div style={{
                    width: '311.34px',
                    height: '283.95px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="semibold">
                        How to add section
                      </Text>
                      <List type="number">
                        <List.Item>Click Install on my theme</List.Item>
                        <List.Item>Go to Shopify Editor</List.Item>
                        <List.Item>Search and add the section</List.Item>
                        <List.Item>Customize the section</List.Item>
                      </List>
                      <Button variant="plain" size="slim">
                        Learn more
                      </Button>
                    </BlockStack>
                  </div>
                </Card>

                {/* Card 3: Where can you add it */}
                <Card>
                  <div style={{
                    width: '311.34px',
                    height: '283.95px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="semibold">
                        Where can you add it
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        You can insert a section anywhere in a Shopify theme, using the Shopify Editor. You can add the section on any page, including homepages, products, collections, and articles. Sections can be inserted only in Online Store 2.0 compatible themes.
                      </Text>
                    </BlockStack>
                  </div>
                </Card>
              </div>
            </div>

            {/* Bottom Section: Last 2 Cards - Aligned with left column (under image) */}
            <div style={{
              display: 'flex',
              gap: '12px',
              marginTop: '24px'
            }}>
                {/* Card 4: Check our Help Center */}
                <Card>
                  <div style={{
                    width: '467px',
                    height: '137.44px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="semibold">
                        Check our Help Center
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        If you need help with setting up the Theme Sections & AI Page Generator app, please check our exhaustive Help Center for details.
                      </Text>
                      <Button variant="secondary" icon={ExternalIcon} size="slim">
                        Get help
                      </Button>
                    </BlockStack>
                  </div>
                </Card>

                {/* Card 5: We're here for you, 24/7 */}
                <Card>
                  <div style={{
                    width: '467px',
                    height: '137.44px',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingMd" fontWeight="semibold">
                        We're here for you, 24/7
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        We understand how powerful Theme Sections & AI Pages is - that's why we are available 24/7 to support you in setting it up.
                      </Text>
                      <Button variant="secondary" size="slim">
                        Contact us
                      </Button>
                    </BlockStack>
                  </div>
                </Card>
            </div>
          </div>
        </Modal>
      )}
    </Page>
  );
}
