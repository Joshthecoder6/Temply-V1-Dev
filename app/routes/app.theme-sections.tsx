import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  Page,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
} from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function ThemeSections() {
  return (
    <Page title="Theme Sections">
      <style>{`
        .black-button-override button {
          background-color: #1a1a1a !important;
          color: white !important;
        }
        .black-button-override button:hover {
          background-color: #2a2a2a !important;
        }
      `}</style>
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
    </Page>
  );
}
