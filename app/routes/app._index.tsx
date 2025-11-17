import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useEffect } from "react";
import {
  Page,
  Card,
  Text,
  Button,
  InlineStack,
  BlockStack,
  Banner,
  Icon,
} from "@shopify/polaris";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  QuestionCircleIcon,
  ChevronRightIcon,
  XIcon,
} from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return { shop: session.shop };
};


export default function Dashboard() {
  const { shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [appEmbedEnabled, setAppEmbedEnabled] = useState<boolean | null>(null);
  const [showReviewBanner, setShowReviewBanner] = useState<boolean>(true);
  const [showFeedbackSection, setShowFeedbackSection] = useState<boolean>(true);
  const [starRating, setStarRating] = useState<number>(0);

  // Check app embed status on mount
  useEffect(() => {
    const checkEmbedStatus = async () => {
      try {
        const response = await fetch('/app/api/check-embed');
        const data = await response.json();
        
        setAppEmbedEnabled(data.enabled);
      } catch (error) {
        console.error('Failed to check app embed status:', error);
        setAppEmbedEnabled(false);
      }
    };

    checkEmbedStatus();
  }, []);

  // Konfetti-Effekt
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Konfetti von zwei Seiten
      const confetti = (window as any).confetti;
      if (confetti) {
        confetti(Object.assign({}, defaults, { 
          particleCount, 
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } 
        }));
        confetti(Object.assign({}, defaults, { 
          particleCount, 
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } 
        }));
      }
    }, 250);
  };

  const handleStarClick = (rating: number) => {
    setStarRating(rating);
    if (rating === 5) {
      triggerConfetti();
    }
  };

  return (
    <Page>
      <style>{`
        .dashboard-section {
          background: white !important;
          padding: 20px !important;
          border-radius: 12px !important;
          border: none !important;
          box-shadow: none !important;
        }
        .dashboard-card-wrapper {
          border-radius: 12px !important;
          overflow: hidden !important;
        }
        .review-banner-section {
          background: white !important;
          padding: 20px !important;
          border: 1px solid #E5E7EB !important;
          border-radius: 12px !important;
        }
        .feedback-section {
          background: white !important;
          border-radius: 12px !important;
          padding: 40px !important;
          border: 1px solid #E5E7EB !important;
        }
      `}</style>
      <div style={{ paddingBottom: '60px' }}>
        <BlockStack gap="500">
        {/* Theme Editor Banner */}
        {appEmbedEnabled === false && (
          <Banner
            title="Enable Temply in your theme"
            tone="warning"
            action={{
              content: 'Open Theme Editor',
              url: `https://${shop}/admin/themes/current/editor?context=apps`,
              external: true,
            }}
          >
            <p>
              The app embed needs to be activated in your theme for sections to display correctly on your store.
            </p>
          </Banner>
        )}

        {/* Support Hub Section */}
        <div className="dashboard-section">
          <BlockStack gap="500">
            <Text as="h2" variant="headingMd" fontWeight="semibold">
              Support Hub
            </Text>

            {/* Inner Card for Founder Support */}
            <Card>
              <InlineStack gap="600" blockAlign="start" wrap={false}>
                <div style={{ flex: '1' }}>
                  <BlockStack gap="400">
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        Get Support from us founders
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Feel free to reach out — we reply fast. The quickest way is our chat support in the bottom-right corner. Prefer another channel? That's fine too.
                      </Text>
                    </BlockStack>

                    <InlineStack gap="300">
                      <Button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = 'mailto:support@temply.dev';
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        icon={
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ marginRight: '-4px' }}>
                              <path d="M10 5L10 15M10 5L6 9M10 5L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                              <path d="M10 15L10 5M10 15L14 11M10 15L6 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        }
                      >
                        Write a email
                      </Button>
                      <Button 
                        url="https://www.linkedin.com/in/levgieseler/"
                        target="_blank"
                        icon={
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ marginRight: '-4px' }}>
                              <path d="M10 5L10 15M10 5L6 9M10 5L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                              <path d="M10 15L10 5M10 15L14 11M10 15L6 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                        }
                      >
                        Connect on LinkedIn
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </div>

                {/* Founder Image - Temporarily disabled for staging
                <div style={{ flexShrink: 0, width: '200px' }}>
                  <img 
                    src="/dashboard-img/founder-profile-new.png" 
                    alt="Founder"
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '12px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/dashboard-img/founder-profile-new.png';
                    }}
                  />
                </div>
                */}
              </InlineStack>
            </Card>

            {/* Additional Support Cards */}
            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1 }}>
                <div 
                  onClick={() => navigate('/app/help')}
                  className="dashboard-card-wrapper"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Card>
                    <InlineStack gap="400" blockAlign="start" wrap={false}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ 
                          background: '#F6F6F7', 
                          borderRadius: '12px', 
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '56px',
                          height: '56px'
                        }}>
                          <Icon source={QuestionCircleIcon} tone="base" />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm" fontWeight="semibold">
                            Got questions?
                          </Text>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Check our FAQ — quick answers to the most common setup and usage topics.
                          </Text>
                        </BlockStack>
                      </div>
                      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                        <Icon source={ChevronRightIcon} />
                      </div>
                    </InlineStack>
                  </Card>
                </div>
              </div>

              <div style={{ flex: 1 }}>
                <div 
                  onClick={() => window.open('https://calendly.com/hi-lev-gieseler/30min', '_blank')}
                  className="dashboard-card-wrapper"
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <Card>
                    <InlineStack gap="400" blockAlign="start" wrap={false}>
                      <div style={{ flexShrink: 0 }}>
                        <div style={{ 
                          background: '#F6F6F7', 
                          borderRadius: '12px', 
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '56px',
                          height: '56px'
                        }}>
                          <Icon source={QuestionCircleIcon} tone="base" />
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <BlockStack gap="200">
                          <Text as="h3" variant="headingSm" fontWeight="semibold">
                            Need more shop customizations?
                          </Text>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Let's talk. We already support 20+ growing eCom brands with tailored solutions.
                          </Text>
                        </BlockStack>
                      </div>
                      <div style={{ flexShrink: 0, alignSelf: 'center' }}>
                        <Icon source={ChevronRightIcon} />
                      </div>
                    </InlineStack>
                  </Card>
                </div>
              </div>
            </InlineStack>
          </BlockStack>
        </div>

        {/* Welcome Section */}
        <div className="dashboard-section">
          <BlockStack gap="400">
            <InlineStack gap="300" blockAlign="center">
              <Text as="h2" variant="headingLg" fontWeight="semibold">
                Welcome to Temply, "{shop.replace('.myshopify.com', '')}"
              </Text>
              <div style={{
                background: '#F3F4F6',
                padding: '4px 12px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10B981'
                }} />
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  Free
                </Text>
              </div>
            </InlineStack>

            <Text as="p" variant="bodyMd" tone="subdued">
              Temply empowers you to seamlessly create, customize, and optimize pages that evolve with your business at every stage of growth, placing a strong emphasis on conversion rate optimization (CRO) to maximize your online success.
            </Text>

            <InlineStack gap="400" wrap={false}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div 
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'white',
                    padding: '20px',
                    border: 'none',
                    borderBottom: '1px solid #E5E7EB',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.borderRadius = '12px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderRadius = '8px';
                  }}
                >
                  <BlockStack gap="300">
                    <div style={{
                      background: '#EFF6FF',
                      borderRadius: '8px',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M1.31053 2.40263C1.31053 1.79947 1.79947 1.31053 2.40263 1.31053H4.80526V4.15C4.80526 4.99442 5.48979 5.67895 6.33421 5.67895H9.17368V6.77105C9.17368 7.13294 9.46707 7.42632 9.82895 7.42632C10.1908 7.42632 10.4842 7.13294 10.4842 6.77105V5.02368C10.4842 4.8499 10.4152 4.68323 10.2923 4.56034L5.92387 0.191922C5.80098 0.0690364 5.63431 0 5.46053 0H2.40263C1.0757 0 0 1.0757 0 2.40263V9.82895C0 11.1559 1.0757 12.2316 2.40263 12.2316H6.11579C6.47768 12.2316 6.77105 11.9382 6.77105 11.5763C6.77105 11.2144 6.47768 10.9211 6.11579 10.9211H2.40263C1.79947 10.9211 1.31053 10.4321 1.31053 9.82895V2.40263ZM8.247 4.36842L6.11579 2.23721V4.15C6.11579 4.27063 6.21358 4.36842 6.33421 4.36842H8.247Z" fill="#005BD3"/>
                        <path d="M9.1737 8.95525C9.1737 8.59336 9.46708 8.29999 9.82896 8.29999C10.1908 8.29999 10.4842 8.59336 10.4842 8.95525V10.0474H11.5763C11.9382 10.0474 12.2316 10.3407 12.2316 10.7026C12.2316 11.0645 11.9382 11.3579 11.5763 11.3579H10.4842V12.45C10.4842 12.8119 10.1908 13.1053 9.82896 13.1053C9.46708 13.1053 9.1737 12.8119 9.1737 12.45V11.3579H8.08159C7.7197 11.3579 7.42633 11.0645 7.42633 10.7026C7.42633 10.3407 7.7197 10.0474 8.08159 10.0474H9.1737V8.95525Z" fill="#005BD3"/>
                      </svg>
                    </div>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        Create a new Advertorial Page
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Start from scratch or choose from pre-designed templates
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div 
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'white',
                    padding: '20px',
                    border: 'none',
                    borderBottom: '1px solid #E5E7EB',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.borderRadius = '12px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderRadius = '8px';
                  }}
                >
                  <BlockStack gap="300">
                    <div style={{
                      background: '#EFF6FF',
                      borderRadius: '8px',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2.92342 0C1.25936 0 0.0991646 1.65075 0.662818 3.21645L3.33629 10.6428C3.67947 11.5961 4.58375 12.2316 5.5969 12.2316H6.77147C7.13336 12.2316 7.42673 11.9382 7.42673 11.5763C7.42673 11.2144 7.13336 10.9211 6.77147 10.9211H5.5969C5.13638 10.9211 4.72534 10.6321 4.56935 10.1989L3.96439 8.51842H7.20831C7.5702 8.51842 7.86357 8.22505 7.86357 7.86316C7.86357 7.50127 7.5702 7.20789 7.20831 7.20789H3.49512L3.4926 7.2079L2.62765 4.80526H9.60466L9.13418 6.11226C8.98041 6.53927 9.29686 6.98947 9.75074 6.98947C10.027 6.98947 10.2736 6.81614 10.3672 6.55616L11.5695 3.21645C12.1332 1.65075 10.973 0 9.30892 0H2.92342ZM1.89587 2.77255C1.63967 2.06086 2.16703 1.31053 2.92342 1.31053H9.30892C10.0654 1.31053 10.5927 2.06086 10.3365 2.77255L10.0765 3.49474H2.15586L1.89587 2.77255Z" fill="#005BD3"/>
                        <path d="M10.7031 8.29999C10.3412 8.29999 10.0478 8.59336 10.0478 8.95525V10.0474H8.95569C8.59379 10.0474 8.30042 10.3407 8.30042 10.7026C8.30042 11.0645 8.59379 11.3579 8.95569 11.3579H10.0478V12.45C10.0478 12.8119 10.3412 13.1053 10.7031 13.1053C11.0649 13.1053 11.3583 12.8119 11.3583 12.45V11.3579H12.4504C12.8123 11.3579 13.1057 11.0645 13.1057 10.7026C13.1057 10.3407 12.8123 10.0474 12.4504 10.0474H11.3583V8.95525C11.3583 8.59336 11.0649 8.29999 10.7031 8.29999Z" fill="#005BD3"/>
                      </svg>
                    </div>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        Create new Sales Page
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Start from scratch or choose from pre-designed templates
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div 
                  style={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'white',
                    padding: '20px',
                    border: 'none',
                    borderBottom: '1px solid #E5E7EB',
                    height: '100%'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.borderRadius = '12px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderRadius = '8px';
                  }}
                >
                  <BlockStack gap="300">
                    <div style={{
                      background: '#FFEDD5',
                      borderRadius: '8px',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="11" height="13" viewBox="0 0 11 13" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5.89737 8.77993C6.28909 8.55336 6.55263 8.12983 6.55263 7.64475C6.55263 6.92097 5.96589 6.33423 5.24211 6.33423C4.51832 6.33423 3.93158 6.92097 3.93158 7.64475C3.93158 8.12983 4.19513 8.55336 4.58684 8.77993V9.1737C4.58684 9.53558 4.88022 9.82897 5.24211 9.82897C5.60399 9.82897 5.89737 9.53558 5.89737 9.1737V8.77993Z" fill="#303030"/>
                        <path fillRule="evenodd" clipRule="evenodd" d="M1.96579 3.57731V3.27632C1.96579 1.46685 3.43264 0 5.24211 0C7.05157 0 8.51842 1.46685 8.51842 3.27632V3.57731C9.64888 3.86828 10.4842 4.89448 10.4842 6.11579V9.61053C10.4842 11.0581 9.31077 12.2316 7.86316 12.2316H2.62105C1.17349 12.2316 0 11.0581 0 9.61053V6.11579C0 4.89448 0.835312 3.86828 1.96579 3.57731ZM3.27632 3.27632C3.27632 2.19064 4.15643 1.31053 5.24211 1.31053C6.32778 1.31053 7.20789 2.19064 7.20789 3.27632V3.49474H3.27632V3.27632ZM1.31053 6.11579C1.31053 5.392 1.89727 4.80526 2.62105 4.80526H7.86316C8.58694 4.80526 9.17368 5.392 9.17368 6.11579V9.61053C9.17368 10.3343 8.58694 10.9211 7.86316 10.9211H2.62105C1.89727 10.9211 1.31053 10.3343 1.31053 9.61053V6.11579Z" fill="#303030"/>
                      </svg>
                    </div>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" fontWeight="semibold">
                        See your Pages
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Add any sections to your Shopify pages
                      </Text>
                    </BlockStack>
                  </BlockStack>
                </div>
              </div>
            </InlineStack>
          </BlockStack>
        </div>

        {/* Community & News Section */}
        <InlineStack gap="400" wrap={false} blockAlign="stretch">
          {/* Join our Community Card */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
              height: '100%',
              display: 'flex'
            }}>
              <div style={{ 
                flexShrink: 0, 
                width: '200px',
                background: '#E5E7EB'
              }} />
              <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <BlockStack gap="300">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd" fontWeight="semibold">
                      Join our Community
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      A community full of e-commerce enthusiasts. With valuable content and mutual support.
                    </Text>
                  </BlockStack>
                  <div>
                    <Button>Join the waiting list now</Button>
                  </div>
                </BlockStack>
              </div>
            </div>
          </div>

          {/* News Banner Card */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              background: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid #E5E7EB',
              height: '100%',
              display: 'flex'
            }}>
              <div style={{ 
                flexShrink: 0, 
                width: '200px',
                background: '#E5E7EB'
              }} />
              <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                <BlockStack gap="300">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingMd" fontWeight="semibold">
                      News Banner
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Soll genutzt werden wenn es was zu vekünden gibt
                    </Text>
                  </BlockStack>
                  <div>
                    <Button>Label</Button>
                  </div>
                </BlockStack>
              </div>
            </div>
          </div>
        </InlineStack>

        {/* Review Banner */}
        {showReviewBanner && (
          <div className="review-banner-section" style={{ 
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <Button 
                icon={XIcon} 
                variant="plain" 
                onClick={() => setShowReviewBanner(false)}
              />
            </div>
            <InlineStack gap="400" blockAlign="start" wrap={false}>
              <div style={{ flexShrink: 0 }}>
                <img 
                  src="/logo/ImageWithFallback.png" 
                  alt="Temply Logo"
                  style={{
                    width: '80px',
                    height: 'auto',
                    border: 'none',
                    borderRadius: '0',
                    display: 'block'
                  }}
                />
              </div>
              <div style={{ flex: 1, paddingRight: '40px' }}>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd" fontWeight="semibold">
                    Enjoying our app? Leave a review!
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    We celebrate every review! It helps our company grow and continue providing great customer support. Thank you in advance!
                  </Text>
                  <div>
                    <style>{`
                      .black-review-button button {
                        background: #000000 !important;
                        border-color: #000000 !important;
                        box-shadow: 0 0 0 0 transparent, 0 1px 0 0 rgba(0, 0, 0, 0.05) !important;
                      }
                      .black-review-button button:hover {
                        background: #2d2d2d !important;
                        border-color: #2d2d2d !important;
                      }
                      .black-review-button button:active {
                        background: #000000 !important;
                        border-color: #000000 !important;
                      }
                      .black-review-button button span {
                        color: white !important;
                      }
                    `}</style>
                    <div className="black-review-button">
                      <Button>Write a review</Button>
                    </div>
                  </div>
                </BlockStack>
              </div>
            </InlineStack>
          </div>
        )}

        {/* Feedback Section */}
        {showFeedbackSection && (
          <div className="feedback-section" style={{ 
            position: 'relative'
          }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <Button 
                icon={XIcon} 
                variant="plain" 
                onClick={() => setShowFeedbackSection(false)}
              />
            </div>
            <BlockStack gap="500">
              <Text as="h2" variant="headingLg" fontWeight="semibold">
                How easy did you find the onboarding?
              </Text>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                <Text as="span" variant="bodyMd" tone="subdued">
                  Difficult
                </Text>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div
                      key={star}
                      onClick={() => handleStarClick(star)}
                      style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path 
                          d="M24 4L28.8 18.4H44L31.6 27.2L36.4 41.6L24 32.8L11.6 41.6L16.4 27.2L4 18.4H19.2L24 4Z" 
                          fill={star <= starRating ? '#FFC107' : '#E5E7EB'}
                          stroke={star <= starRating ? '#FFC107' : '#E5E7EB'}
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  ))}
                </div>
                
                <Text as="span" variant="bodyMd" tone="subdued">
                  Very easy!
                </Text>
              </div>
            </BlockStack>
          </div>
        )}
        </BlockStack>
      </div>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
