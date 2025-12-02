import type { LoaderFunctionArgs } from "react-router";
import { Page, Text, Card, BlockStack, Button, InlineStack, Grid } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useState, useEffect } from "react";
import { useLoaderData, Form, useFetcher } from "react-router";
import prisma from "../db.server";
import { useMantle } from "../components/MantleAppProvider";
import { MANTLE_PLAN_IDS, getPlans, identifyCustomer } from "../lib/mantle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  // Identify customer to get API token for fetching plans
  const customer = await identifyCustomer(shop, {
    email: `${shop}@shopify.com`,
    name: shop,
    myshopifyDomain: shop,
    metadata: { shop, source: 'pricing_page_loader' }
  });

  // Fetch available plans to log them
  console.log('=== PRICING PAGE LOADER: Fetching available Mantle plans ===');
  const plans = await getPlans(customer.customerApiToken);

  console.log('=== AVAILABLE MANTLE PLANS ===');
  console.log('Total plans:', plans.length);
  plans.forEach((plan: any) => {
    console.log(`  - ${plan.name}`);
    console.log(`    ID: ${plan.id}`);
    console.log(`    Public: ${plan.public}`);
    console.log(`    Active: ${plan.active}`);
    console.log('---');
  });
  console.log('=== END PLANS LIST ===');

  return {
    planIds: MANTLE_PLAN_IDS,
    availablePlans: plans,
  };
};

export default function PricingPage() {
  return <PricingContent />;
}

function PricingContent() {
  // Subscribe/cancel functions from Mantle
  const { planIds, availablePlans } = useLoaderData<typeof loader>();
  const { subscribe, cancel, customer, plans } = useMantle();
  const [yearlyPricing, setYearlyPricing] = useState(false);
  const fetcher = useFetcher<any>();
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    if (fetcher.data?.confirmationUrl) {
      // Redirect to confirmation URL in top window
      window.top!.location.href = fetcher.data.confirmationUrl;
    }
  }, [fetcher.data]);

  // Auto-select yearly toggle if customer has yearly subscription
  useEffect(() => {
    if (customer?.subscription?.plan?.id) {
      const isYearly = customer.subscription.plan.id === planIds.BEGINNER_YEARLY ||
        customer.subscription.plan.id === planIds.GROWTH_YEARLY;
      if (isYearly) {
        setYearlyPricing(true);
      }
    }
  }, [customer, planIds]);

  // Log plans from useMantle hook on mount
  useEffect(() => {
    console.log('=== PLANS FROM useMantle() HOOK ===');
    console.log('Total plans from hook:', plans?.length || 0);
    console.log('Plans from customer.plans:', customer?.plans?.length || 0);

    // Log from customer.plans (this is where Mantle actually provides plans)
    if (customer?.plans && customer.plans.length > 0) {
      console.log('=== PLANS FROM customer.plans ===');
      customer.plans.forEach((plan: any) => {
        console.log(`  - ${plan.name}`);
        console.log(`    ID: ${plan.id}`);
        console.log(`    Amount: ${plan.amount} ${plan.currency}`);
        console.log(`    Interval: ${plan.interval}`);
        console.log(`    Public: ${plan.public}`);
        console.log(`    Active: ${plan.active}`);
        console.log('---');
      });
    }

    // Also log from plans if it exists
    if (plans && plans.length > 0) {
      console.log('=== PLANS FROM plans property ===');
      plans.forEach((plan: any) => {
        console.log(`  - ${plan.name}`);
        console.log(`    ID: ${plan.id}`);
        console.log(`    Public: ${plan.public}`);
        console.log(`    Active: ${plan.active}`);
        console.log('---');
      });
    } else if (!customer?.plans || customer.plans.length === 0) {
      console.log('No plans available from useMantle hook or customer');
    }
    console.log('=== END HOOK PLANS LIST ===');
  }, [plans, customer]);

  const isStarterActive = customer?.subscription?.plan?.id === planIds.BEGINNER ||
    customer?.subscription?.plan?.id === planIds.BEGINNER_YEARLY;
  const isGrowthActive = customer?.subscription?.plan?.id === planIds.GROWTH ||
    customer?.subscription?.plan?.id === planIds.GROWTH_YEARLY;

  // Debug: Log subscription structure to find correct ID
  useEffect(() => {
    if (customer?.subscription) {
      console.log('=== SUBSCRIPTION DEBUG ===');
      console.log('Full subscription object:', customer.subscription);
      console.log('Subscription ID:', customer.subscription.id);
      console.log('Subscription plan:', customer.subscription.plan);
      console.log('=== END SUBSCRIPTION DEBUG ===');
    }
  }, [customer]);

  // Handle subscription cancellation via our API endpoint
  const handleCancelSubscription = async () => {
    if (!customer?.subscription?.id || !customer?.id) return;

    // Use fetcher to call our cancel endpoint
    fetcher.submit(
      {
        subscriptionId: customer.subscription.id,
        customerId: customer.id
      },
      { method: 'post', action: '/app/api/subscription/cancel' }
    );
  };

  // Debug: Test if useMantle works
  console.log("DEBUG: useMantle result:", { subscribe: typeof subscribe, customer, plansCount: plans?.length });


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
      < BlockStack gap="500">
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <Text variant="headingXl" as="h1">
                  Choose the plan that's right for you
                </Text>
                <Text variant="bodyLg" as="p" tone="subdued">
                  Simple pricing. No hidden fees. Cancel anytime.
                </Text>
              </div>

              {/* Pricing Toggle */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                <div style={{
                  background: '#f1f2f4',
                  padding: '4px',
                  borderRadius: '8px',
                  display: 'inline-flex',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setYearlyPricing(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: !yearlyPricing ? 'white' : 'transparent',
                      boxShadow: !yearlyPricing ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      fontWeight: !yearlyPricing ? 600 : 400,
                      fontSize: '14px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setYearlyPricing(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      background: yearlyPricing ? 'white' : 'transparent',
                      boxShadow: yearlyPricing ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      cursor: 'pointer',
                      fontWeight: yearlyPricing ? 600 : 400,
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    Yearly <span style={{ color: '#2C6ECB', fontSize: '12px', fontWeight: 600 }}>-20%</span>
                  </button>
                </div>
              </div>

              <Grid>
                {/* Starter Plan */}
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                  <Card>
                    <BlockStack gap="400">
                      <div style={{ minHeight: '160px' }}>
                        <Text variant="headingLg" as="h2">Starter</Text>
                        <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                          <span style={{ fontSize: '32px', fontWeight: 'bold' }}>
                            {yearlyPricing ? '$24.90' : '$29.90'}
                          </span>
                          <span style={{ color: '#6D7175' }}>/month</span>
                        </div>
                        {yearlyPricing && (
                          <Text variant="bodySm" as="p" tone="success">
                            Billed $299 yearly (save $60)
                          </Text>
                        )}
                        <div style={{ marginTop: '16px' }}>
                          <Text variant="bodyMd" as="p" tone="subdued">
                            Perfect for small businesses just getting started with social proof.
                          </Text>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid #E1E3E5', paddingTop: '16px' }}>
                        <BlockStack gap="300">
                          <InlineStack gap="200" align="start">
                            <div style={{ color: '#2C6ECB' }}>✓</div>
                            <Text variant="bodyMd" as="span">Up to 5,000 monthly visitors</Text>
                          </InlineStack>
                          <InlineStack gap="200" align="start">
                            <div style={{ color: '#2C6ECB' }}>✓</div>
                            <Text variant="bodyMd" as="span">Basic Social Proof Widgets</Text>
                          </InlineStack>
                          <InlineStack gap="200" align="start">
                            <div style={{ color: '#2C6ECB' }}>✓</div>
                            <Text variant="bodyMd" as="span">Standard Support</Text>
                          </InlineStack>
                          <InlineStack gap="200" align="start">
                            <div style={{ color: '#2C6ECB' }}>✓</div>
                            <Text variant="bodyMd" as="span">Remove Branding</Text>
                          </InlineStack>
                        </BlockStack>
                      </div>

                      <div style={{ marginTop: '16px' }}>
                        {isStarterActive ? (
                          <Button fullWidth disabled>Current Plan</Button>
                        ) : (
                          <Button
                            fullWidth
                            variant="primary"
                            onClick={() => handleSubscribe(yearlyPricing ? planIds.BEGINNER_YEARLY : planIds.BEGINNER)}
                          >
                            Choose Starter
                          </Button>
                        )}
                        {isStarterActive && customer?.subscription?.id && (
                          <div style={{ textAlign: 'center', marginTop: '8px' }}>
                            <button
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
                              <fetcher.Form action="/app/api/subscribe" method="post">
                                <input type="hidden" name="plan" value={yearlyPricing ? "growth_yearly" : "growth"} />
                                <input type="hidden" name="source" value="pricing" />
                                <Button
                                  variant="primary"
                                  size="large"
                                  fullWidth
                                  submit
                                  disabled={isGrowthActive || fetcher.state !== "idle"}
                                  loading={fetcher.state !== "idle" && fetcher.formData?.get("plan") === "growth"}
                                >
                                  {isGrowthActive ? "Current Plan" : "Try for free for 14 days"}
                                </Button>
                              </fetcher.Form>
                              {isGrowthActive && customer?.subscription?.id && (
                                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                                  <button
                                    onClick={handleCancelSubscription}
                                    disabled={fetcher.state !== 'idle'}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#D72C0D',
                                      cursor: fetcher.state !== 'idle' ? 'not-allowed' : 'pointer',
                                      fontSize: '14px',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      padding: 0,
                                      opacity: fetcher.state !== 'idle' ? 0.6 : 1,
                                    }}
                                  >
                                    {fetcher.state !== 'idle' ? 'Cancelling...' : 'Cancel'}
                                  </button>
                                </div>
                              )}
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

