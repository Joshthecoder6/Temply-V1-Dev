import type { LoaderFunctionArgs } from "react-router";
import { Page, Text, Card, BlockStack, Button, InlineStack, Grid } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState } from "react";
import { useLoaderData } from "react-router";
import prisma from "../db.server";
import { useMantle } from "@heymantle/react";
import { MANTLE_PLAN_IDS } from "../lib/mantle.server";
import { identifyCustomer } from "../lib/mantle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  return {
    planIds: MANTLE_PLAN_IDS,
  };
};

export default function PricingPage() {
  return <PricingContent />;
}

function PricingContent() {
  const { planIds } = useLoaderData<typeof loader>();
  const { subscribe, customer } = useMantle();
  const [yearlyPricing, setYearlyPricing] = useState(false);

  const isStarterActive = customer?.subscription?.plan?.id === planIds.BEGINNER;
  const isGrowthActive = customer?.subscription?.plan?.id === planIds.GROWTH;

  // Handle subscription with proper parameters
  const handleSubscribe = async (planId: string, discount?: string) => {
    try {
      console.log("DEBUG: handleSubscribe called with:", { planId, discount, customerId: customer?.id });

      // Call subscribe with planId and returnUrl (customerId and discount are handled by the provider)
      await subscribe({
        planId,
        returnUrl: "/app/pricing"
      });
    } catch (error) {
      console.error("Subscription error:", error);
    }
  };

  return (
    <Page>
      <style>{`
        [data-premium-card] p,
        [data-premium-card] h3,
        [data-premium-card] span {
          color: #FFFFFF !important;
        }
        [data-strikethrough-price] {
          color: #999999 !important;
          text-decoration: line-through !important;
        }
        [data-premium-card] [data-strikethrough-price] {
          color: #999999 !important;
          text-decoration: line-through !important;
        }
        [data-premium-card] button,
        [data-premium-card] button span,
        [data-premium-card] button div,
        [data-premium-card] button * {
          background-color: #FFFFFF !important;
          color: #272727 !important;
        }
        [data-premium-card] [data-discount-badge] span {
          color: #272727 !important;
        }
        [data-recommended-banner] span {
          color: #272727 !important;
        }
        button[data-discount-button],
        [data-discount-button],
        [data-discount-button]::part(base),
        s-button[data-discount-button]::part(base) {
          background-color: #E3E3E3 !important;
          background: #E3E3E3 !important;
        }
        [data-feature-card] {
          padding: 0 !important;
        }
      `}</style>
      <BlockStack gap="800">
        {/* Header Section */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '24px',
        }}>
          <Text as="h1" variant="headingLg" fontWeight="bold" style={{ color: '#272727' }}>
            Subscribe to plan that fits your needs
          </Text>
          <Button
            variant="secondary"
            tone="subdued"
            data-discount-button
          >
            <InlineStack gap="200" blockAlign="center">
              <img
                src="/pricing/Discount-Icon.svg"
                alt="Discount"
                style={{ width: '16px', height: '16px' }}
              />
              <span>Enter Discount Code</span>
            </InlineStack>
          </Button>
        </div>

        {/* Toggle Section */}
        <div style={{ marginBottom: '24px' }}>
          <Card>
            <div style={{
              height: '32px',
              padding: '0 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}>
              <InlineStack gap="300" blockAlign="center">
                <img src="/pricing/Discount-Icon.svg" alt="Discount" style={{ width: '24px', height: '24px' }} />
                <Text as="p" variant="bodyMd" style={{ color: '#272727' }}>
                  Enjoy 2 months for free with yearly pricing
                </Text>
              </InlineStack>
              <InlineStack gap="300" blockAlign="center">
                <div style={{
                  display: 'inline-block',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  backgroundColor: '#D5EBFF',
                }}>
                  <Text as="span" variant="bodySm" fontWeight="semibold" style={{ color: '#003A5A' }}>
                    2 months free
                  </Text>
                </div>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={yearlyPricing}
                      onChange={(e) => setYearlyPricing(e.target.checked)}
                      style={{
                        width: '44px',
                        height: '24px',
                        appearance: 'none',
                        backgroundColor: yearlyPricing ? '#008060' : '#e1e3e5',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        margin: 0,
                      }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        left: yearlyPricing ? '22px' : '2px',
                        transition: 'left 0.2s',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                        pointerEvents: 'none',
                      }}
                    />
                  </label>
                </div>
              </InlineStack>
            </div>
          </Card>
        </div>

        {/* Who Choose Us Section */}
        <BlockStack gap="600">
          <Grid>
            {/* Starter Plan */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <div style={{
                display: 'flex',
                height: '488px',
                padding: '32px 24px 24px 24px',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '32px',
                alignSelf: 'stretch',
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                position: 'relative',
                boxShadow: '0 -5px 7.7px 0 rgba(0, 0, 0, 0.25)',
              }}>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <img src="/pricing/plan/Ohne Hintergrund.svg" alt="Temply Logo" style={{ width: '48px', height: '48px' }} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: '#272727' }}>
                          Temply
                        </Text>
                        <div style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(0, 0, 0, 0.07)',
                        }}>
                          <Text as="span" variant="bodySm" style={{ color: '#272727' }}>
                            Starter
                          </Text>
                        </div>
                      </BlockStack>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {yearlyPricing ? (
                        <>
                          <div style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            backgroundColor: '#FFC210',
                            marginBottom: '8px',
                          }}>
                            <Text as="span" variant="bodySm" fontWeight="semibold" style={{ color: '#272727' }}>
                              Save -20% per month
                            </Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '8px' }}>
                            <p data-strikethrough-price style={{ color: '#999999', textDecoration: 'line-through', margin: 0, fontSize: '14px' }}>
                              $29,95
                            </p>
                            <Text as="p" variant="headingLg" fontWeight="bold" style={{ color: '#272727' }}>
                              $24,96
                            </Text>
                          </div>
                          <Text as="p" variant="bodySm" style={{ color: '#666666' }}>
                            per month
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text as="p" variant="headingLg" fontWeight="bold" style={{ color: '#272727' }}>
                            $29,95
                          </Text>
                          <Text as="p" variant="bodySm" style={{ color: '#666666' }}>
                            per month
                          </Text>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flex: 1 }}>
                    {[
                      'Access to all advertorial & listicle templates',
                      'Unlimited pages & sections live',
                      'Regularly updated template library',
                      'Built-in analytics',
                      'Email support included',
                    ].map((feature, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src="/pricing/plan/check.svg" alt="Check" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <Text as="p" variant="bodyMd" style={{ color: '#272727' }}>
                          {feature}
                        </Text>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={() => handleSubscribe(planIds.BEGINNER)}
                    disabled={isStarterActive}
                  >
                    {isStarterActive ? "Current Plan" : "Try for free for 7 days"}
                  </Button>
                </div>
              </div>
            </Grid.Cell>

            {/* Premium Plan */}
            <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
              <div
                data-premium-card
                style={{
                  display: 'flex',
                  height: '488px',
                  padding: '32px 24px 24px 24px',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '32px',
                  alignSelf: 'stretch',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'visible',
                  boxShadow: '0 -5px 7.7px 0 rgba(0, 0, 0, 0.25)',
                  zIndex: 2,
                }}>
                {/* Recommended Banner - behind the card */}
                <div
                  data-recommended-banner
                  style={{
                    position: 'absolute',
                    top: '-28px',
                    left: 0,
                    right: 0,
                    width: '100%',
                    height: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    borderRadius: '16px 16px 0 0',
                    background: '#FFBF00',
                    boxShadow: '-1px 0 0 0 rgba(0, 0, 0, 0.13) inset, 0 -1px 0 0 rgba(0, 0, 0, 0.17) inset, 0 1px 0 0 rgba(204, 204, 204, 0.50) inset, 0 1px 0 0 rgba(26, 26, 26, 0.07)',
                    zIndex: 1,
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    paddingTop: '8px',
                    paddingBottom: '0px',
                  }}
                >
                  <Text as="span" variant="bodySm" fontWeight="semibold" style={{ color: '#272727' }}>
                    Recommended for you
                  </Text>
                </div>

                {/* Background Image with Dark Overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url(/pricing/plan/cba5da7d168771a6f55bd8f53fb6f9366f238562.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  borderRadius: '16px',
                  zIndex: 0,
                }} />

                {/* Dark Overlay to make image black */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#272727',
                  mixBlendMode: 'multiply',
                  borderRadius: '16px',
                  zIndex: 1,
                }} />

                {/* Additional Dark Layer */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: '#272727',
                  opacity: 0.6,
                  borderRadius: '16px',
                  zIndex: 1,
                }} />

                {/* Gradient Overlay */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(160deg, rgba(255, 191, 0, 0.00) 57.02%, rgba(255, 191, 0, 0.20) 100.14%)',
                  borderRadius: '16px',
                  zIndex: 2,
                }} />

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, position: 'relative', zIndex: 3, color: '#FFFFFF' }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '8px',
                        backgroundColor: '#272727',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <img src="/pricing/LogoPremium.svg" alt="Temply Premium Logo" style={{ width: '48px', height: '48px' }} />
                      </div>
                      <BlockStack gap="050">
                        <Text as="h3" variant="headingMd" fontWeight="bold" style={{ color: '#FFFFFF' }}>
                          Temply Premium
                        </Text>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }}>
                          <img src="/pricing/plan/sparkle.svg" alt="Sparkle" style={{ width: '16px', height: '16px' }} />
                          <Text as="span" variant="bodySm" style={{ color: '#FFFFFF' }}>
                            Unlimited
                          </Text>
                        </div>
                      </BlockStack>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      {yearlyPricing ? (
                        <>
                          <div
                            data-discount-badge
                            style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              backgroundColor: '#FFC210',
                              marginBottom: '8px',
                            }}
                          >
                            <Text as="span" variant="bodySm" fontWeight="semibold" style={{ color: '#272727' }}>
                              Save -20% per month
                            </Text>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '8px' }}>
                            <p data-strikethrough-price style={{ color: '#999999', textDecoration: 'line-through', margin: 0, fontSize: '14px' }}>
                              $44,95
                            </p>
                            <Text as="p" variant="headingLg" fontWeight="bold" style={{ color: '#FFFFFF' }}>
                              $37,46
                            </Text>
                          </div>
                          <Text as="p" variant="bodySm" style={{ color: '#FFFFFF' }}>
                            per month
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text as="p" variant="headingLg" fontWeight="bold" style={{ color: '#FFFFFF' }}>
                            $44,95
                          </Text>
                          <Text as="p" variant="bodySm" style={{ color: '#FFFFFF' }}>
                            per month
                          </Text>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', flex: 1 }}>
                    {[
                      { text: 'Access to all advertorial & listicle templates', premium: false },
                      { text: 'Unlimited pages & sections live', premium: false },
                      { text: 'Regularly updated template library', premium: false },
                      { text: 'Built-in analytics', premium: false },
                      { text: 'Premium E-Mail & Slack Support', premium: true },
                      { text: 'Access to all product page templates', premium: true },
                      { text: 'Access to all bundle offer landing page templates', premium: true },
                      { text: 'AI section builder', premium: true },
                    ].map((feature, index) => (
                      <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {feature.premium ? (
                          <img src="/pricing/plan/sparkle.svg" alt="Sparkle" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        ) : (
                          <img src="/pricing/plan/tick.svg" alt="Check" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        )}
                        <Text as="p" variant="bodyMd" style={{ color: '#FFFFFF' }}>
                          {feature.text}
                        </Text>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <Button
                    variant="primary"
                    size="large"
                    fullWidth
                    onClick={() => handleSubscribe(planIds.GROWTH)}
                    disabled={isGrowthActive}
                  >
                    {isGrowthActive ? "Current Plan" : "Try for free for 14 days"}
                  </Button>
                </div>
              </div>
            </Grid.Cell>
          </Grid>
        </BlockStack>

        {/* Why Choose Us Section */}
        <BlockStack gap="600">
          <BlockStack gap="200" align="center">
            <Text as="h2" variant="headingLg" fontWeight="bold" alignment="center">
              Why Choose Us
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
              Everything you need to grow your business
            </Text>
          </BlockStack>

          <Grid gap={{ xs: '600', sm: '600', md: '600', lg: '600', xl: '600' }}>
            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card data-feature-card>
                <div style={{
                  width: '100%',
                  height: '110px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#f0fdf4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img src="/pricing/Icon1.svg" alt="AOV & CVR" style={{ width: '32px', height: '32px' }} />
                  </div>
                  <div style={{ width: '100%' }}>
                    <Text as="h3" variant="headingSm" fontWeight="semibold" style={{ marginBottom: '4px', textAlign: 'left' }}>
                      AOV & CVR
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued" style={{ textAlign: 'left', margin: 0 }}>
                      Plug in ready sections that work effortlessly with your workflow.
                    </Text>
                  </div>
                </div>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card data-feature-card>
                <div style={{
                  width: '100%',
                  height: '110px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#fefce8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img src="/pricing/Icon2.svg" alt="Live Chat" style={{ width: '32px', height: '32px' }} />
                  </div>
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Live Chat
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Have a question? No tickets or bots - just direct help from the team.
                    </Text>
                  </BlockStack>
                </div>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card data-feature-card>
                <div style={{
                  width: '100%',
                  height: '110px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img src="/pricing/Icon3.svg" alt="Unlimited Updates" style={{ width: '32px', height: '32px' }} />
                  </div>
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Unlimited Updates
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      New features and designs added regularly — you stay current.
                    </Text>
                  </BlockStack>
                </div>
              </Card>
            </Grid.Cell>

            <Grid.Cell columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
              <Card data-feature-card>
                <div style={{
                  width: '100%',
                  height: '110px',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#faf5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <img src="/pricing/Icon4.svg" alt="Tested by Brands" style={{ width: '32px', height: '32px' }} />
                  </div>
                  <BlockStack gap="050">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Tested by Brands
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Proven by purpose-driven ecommerce stores pushing their limits.
                    </Text>
                  </BlockStack>
                </div>
              </Card>
            </Grid.Cell>
          </Grid>
        </BlockStack>

        {/* Why Brands Love Temply Section */}
        <BlockStack gap="600">
          <Text as="h2" variant="headingLg" fontWeight="bold" alignment="center">
            Why Brands Love Temply
          </Text>

          <Grid>
            {[1, 2, 3].map((index) => (
              <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }} key={index}>
                <Card>
                  <BlockStack gap="400">
                    {/* Stars */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} style={{ color: '#fbbf24', fontSize: '20px' }}>★</span>
                      ))}
                    </div>

                    {/* Testimonial Text */}
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="bold">
                        Boosted engagement by 250% in 3 months
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Temply has transformed how we create landing pages. The templates are beautiful, easy to use, and our conversion rates have never been better. The team support is incredible too!
                      </Text>
                    </BlockStack>

                    {/* Author */}
                    <InlineStack gap="300" blockAlign="center">
                      <img
                        src="/pricing/ImageWithFallback.png"
                        alt="Sarah Chen"
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                        }}
                      />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          Sarah Chen
                        </Text>
                        <Text as="span" variant="bodySm" tone="subdued">
                          Head of Marketing, TechFlow
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </BlockStack>
                </Card>
              </Grid.Cell>
            ))}
          </Grid>
        </BlockStack>

        {/* Fast, personal support & Trusted Brands Section */}
        <Grid>
          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <BlockStack gap="300">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd" fontWeight="bold">
                        Fast, personal support - straight from the founders
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Have questions? We're just a message away.
                      </Text>
                    </BlockStack>

                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'nowrap' }}>
                      <Button variant="primary" size="medium">
                        Book a call
                      </Button>
                      <Button variant="secondary" size="medium">
                        Write an E-Mail
                      </Button>
                    </div>
                  </BlockStack>
                </div>

                <div style={{ flexShrink: 0 }}>
                  <img
                    src="/pricing/Team Member.png"
                    alt="Founder"
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              </div>
            </Card>
          </Grid.Cell>

          <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
            <Card>
              <BlockStack gap="400">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#008060', fontSize: '24px' }}>✓</span>
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    Trusted by fast-growing brands
                  </Text>
                </div>
                <div style={{
                  overflow: 'hidden',
                  width: '100%',
                  position: 'relative',
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    animation: 'scroll 20s linear infinite',
                    width: 'fit-content',
                  }}>
                    {/* Duplicate logos for seamless loop */}
                    {[...Array(8)].map((_, index) => (
                      <img
                        key={index}
                        src="/pricing/Logo.svg"
                        alt="Trusted Brand"
                        style={{
                          height: '40px',
                          width: 'auto',
                          opacity: 0.7,
                          flexShrink: 0,
                        }}
                      />
                    ))}
                  </div>
                  <style>{`
                    @keyframes scroll {
                      0% {
                        transform: translateX(0);
                      }
                      100% {
                        transform: translateX(-50%);
                      }
                    }
                  `}</style>
                </div>
              </BlockStack>
            </Card>
          </Grid.Cell>
        </Grid>

        {/* Bottom Spacing */}
        <div style={{ height: '60px' }}></div>
      </BlockStack>
    </Page>
  );
}

