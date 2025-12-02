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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    // Lade alle aktiven Sections aus der neuen Section-Tabelle
    const sections = await prisma.section.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        displayName: 'asc'
      }
    });

    // Lade AI-generierte Sections für diesen Shop (nur approved ones)
    const aiSections = await prisma.aISection.findMany({
      where: {
        shop: shop,
        status: 'applied' // Nur angewandte AI-Sections anzeigen
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`[Theme Sections Loader] Found ${sections.length} sections and ${aiSections.length} AI sections in database`);

    // Konvertiere normale Sections in das erwartete Format
    const formattedSections = sections.map((section) => ({
      id: section.id,
      name: section.displayName,
      description: section.description || 'A customizable section for your theme.',
      previewImage: section.previewImage || '/Product-Image/ComingSoon.png',
      filename: `${section.name}.liquid`,
      liquidCode: section.liquidCode,
      editorName: section.editorName,
      isAI: false
    }));

    // Konvertiere AI-Sections in das gleiche Format
    const formattedAISections = aiSections.map((aiSection) => ({
      id: aiSection.id,
      name: aiSection.sectionName,
      description: `AI-generated ${aiSection.sectionType} section`,
      previewImage: '/Product-Image/ComingSoon.png', // TODO: Generate preview from AI section
      filename: `${aiSection.sectionName}.liquid`,
      liquidCode: aiSection.liquidCode || '',
      editorName: `TP-AI: ${aiSection.sectionName}`,
      isAI: true
    }));

    // Kombiniere beide Listen
    const allSections = [...formattedSections, ...formattedAISections];

    console.log(`[Theme Sections Loader] Returning ${allSections.length} total sections (${formattedSections.length} normal + ${formattedAISections.length} AI)`);
    return { sections: allSections };
  } catch (error) {
    console.error('Error in theme-sections loader:', error);
    // Fallback: Leeres Array zurückgeben
    return { sections: [] };
  }
};

// Section Type Definition
type SectionType = {
  id: string;
  name: string;
  description: string;
  previewImage: string;
  filename: string;
  liquidCode?: string;
  editorName?: string;
  isAI?: boolean; // Flag for AI-generated sections
};

export default function ThemeSections() {
  const loaderData = useLoaderData<typeof loader>();
  const [showPremiumView, setShowPremiumView] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionType | null>(null);
  const [activeCarouselIndex, setActiveCarouselIndex] = useState(0);

  // Verwende Sections aus DB
  const sections = loaderData?.sections || [];
  const themeSections = sections;

  // Debug: Log sections
  console.log('[Theme Sections Component] Loaded sections:', sections.length);
  console.log('[Theme Sections Component] Section names:', sections.map(s => s.name));

  // Handler für "View section" Button
  const handleViewSection = (section: SectionType) => {
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
  const getCarouselImages = (section: SectionType) => {
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
        
        @keyframes rainbow-rotate {
          0% {
            background: linear-gradient(white, white) padding-box, 
                        linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #8a2be2, #ff0080) border-box;
          }
          25% {
            background: linear-gradient(white, white) padding-box, 
                        linear-gradient(90deg, #ff8c00, #40e0d0, #8a2be2, #ff0080, #ff8c00) border-box;
          }
          50% {
            background: linear-gradient(white, white) padding-box, 
                        linear-gradient(90deg, #40e0d0, #8a2be2, #ff0080, #ff8c00, #40e0d0) border-box;
          }
          75% {
            background: linear-gradient(white, white) padding-box, 
                        linear-gradient(90deg, #8a2be2, #ff0080, #ff8c00, #40e0d0, #8a2be2) border-box;
          }
          100% {
            background: linear-gradient(white, white) padding-box, 
                        linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #8a2be2, #ff0080) border-box;
          }
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
                  border: section.isAI
                    ? '3px solid transparent'
                    : '1px solid #e1e3e5',
                  backgroundImage: section.isAI
                    ? 'linear-gradient(white, white), linear-gradient(90deg, #ff0080, #ff8c00, #40e0d0, #8a2be2, #ff0080)'
                    : 'none',
                  backgroundOrigin: section.isAI ? 'padding-box, border-box' : undefined,
                  backgroundClip: section.isAI ? 'padding-box, border-box' : undefined,
                  background: section.isAI ? undefined : 'white',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: section.isAI ? 'rainbow-rotate 3s linear infinite' : 'none'
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
                  {/* AI Badge */}
                  {section.isAI && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="white" stroke="white" strokeWidth="0.5" />
                      </svg>
                      AI Generated
                    </div>
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
                          <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="white" stroke="white" strokeWidth="0.5" />
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
              {selectedSection.isAI ? (
                <Badge
                  tone="magic"
                  icon={() => (
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" fill="currentColor" />
                    </svg>
                  )}
                >
                  AI Generated
                </Badge>
              ) : (
                <Badge status="info">New</Badge>
              )}
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
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <Text as="span" variant="bodyMd">Add answers to common questions</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <Text as="span" variant="bodyMd">Reduce customer inquiries</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <Text as="span" variant="bodyMd">Boost buyer confidence</Text>
                          </InlineStack>
                        </List.Item>
                        <List.Item>
                          <InlineStack gap="200" blockAlign="center">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M13.5 4.5L6 12L2.5 8.5" stroke="#008060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
