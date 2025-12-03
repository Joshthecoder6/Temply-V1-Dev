import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";
import {
  Page,
  Card,
  Text,
  BlockStack,
  Collapsible,
  InlineStack,
  Link,
  Button,
} from "@shopify/polaris";

// Custom Icons from Figma
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4.1665 10H15.8332" stroke="#303030" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 4.16699V15.8337" stroke="#303030" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path d="M4.1665 10H15.8332" stroke="#303030" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return { shop: session.shop };
};

export default function Help() {
  const { shop } = useLoaderData<typeof loader>();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: "What is Temply and why do I need it?",
      answer: "Temply is a powerful Shopify app that provides pre-built, customizable funnel templates designed to boost your conversion rates. It helps you create professional sales funnels without any coding knowledge, saving you time and increasing your revenue through optimized customer journeys."
    },
    {
      question: "Do I need technical skills to use Temply?",
      answer: "Not at all. Temply is 100% no-code and built for Shopify merchants without any development experience. All features are intuitive and easy to use directly from the Theme Editor."
    },
    {
      question: "How do I integrate Temply into my existing theme?",
      answer: "Right after installing the app, you'll be guided to the App Embed section in the Shopify Theme Editor. Just toggle Temply on – and you're good to go."
    },
    {
      question: "Is Temply compatible with my current Shopify theme?",
      answer: "Yes. Temply works with all major Shopify themes. Funnels are added and managed just like any other section – no theme modifications needed."
    },
    {
      question: "I have more questions – who can I contact?",
      answer: "Our support team is happy to help. You can reach us directly from within the app dashboard or via the contact form on our site."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <Page>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <BlockStack gap="500">
          {/* Header */}
          <BlockStack gap="200">
            <Text as="h1" variant="headingLg">
              Frequently asked questions
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Still have questions? Reach out to our support team directly from the app dashboard.
            </Text>
          </BlockStack>

          {/* FAQ Section */}
          <Card padding="0">
            <BlockStack gap="0">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <div
                    onClick={() => toggleFaq(index)}
                    style={{
                      padding: '16px 20px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <InlineStack align="space-between" blockAlign="center" gap="400">
                      <Text as="span" variant="bodyMd" fontWeight="medium">
                        {faq.question}
                      </Text>
                      <div style={{ flexShrink: 0 }}>
                        {openFaqIndex === index ? <MinusIcon /> : <PlusIcon />}
                      </div>
                    </InlineStack>
                  </div>

                  <Collapsible
                    open={openFaqIndex === index}
                    id={`faq-${index}`}
                    transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                  >
                    <div style={{
                      borderTop: '1px solid var(--p-color-border-subdued)',
                      padding: '16px 20px 20px 20px'
                    }}>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {faq.answer}
                      </Text>
                    </div>
                  </Collapsible>

                  {index < faqs.length - 1 && (
                    <div style={{
                      height: '1px',
                      backgroundColor: 'var(--p-color-border-subdued)',
                      margin: 0
                    }} />
                  )}
                </div>
              ))}
            </BlockStack>
          </Card>

          {/* Additional Help Section */}
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                Need more help?
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Check out the{' '}
                <Link url={`https://${shop}/admin/themes/current/editor?context=apps`} target="_blank">
                  Theme Editor
                </Link>
                {' '}to customize your funnels, or browse{' '}
                <s-link href="/app/funnels">
                  Prebuild Funnels
                </s-link>
                {' '}to explore more templates.
              </Text>
              <div style={{ marginTop: '8px' }}>
                <Button
                  variant="primary"
                  url="https://discord.gg/KJKF5eZXjs"
                  target="_blank"
                >
                  Support Ticket
                </Button>
              </div>
            </BlockStack>
          </Card>
        </BlockStack>
      </div>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
