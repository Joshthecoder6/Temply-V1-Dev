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
  Button,
  InlineStack,
} from "@shopify/polaris";
import { ChevronDownIcon } from "@shopify/polaris-icons";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return { shop: session.shop };
};

export default function Help() {
  const { shop } = useLoaderData<typeof loader>();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "What is Temply and why do I need it?",
      answer: "Temply is a funnel builder designed specifically for Shopify. It lets you create high-converting landing pages like VSLs, listicles, advertorials, and quiz funnels – directly inside the Shopify Theme Editor. No external pagebuilders or third-party tools required."
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
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingSm">
              FAQ
            </Text>

            {/* FAQ Items */}
            <BlockStack gap="0">
              {faqs.map((faq, index) => (
                <div key={index}>
                  <Button
                    plain
                    fullWidth
                    onClick={() => toggleFaq(index)}
                    textAlign="left"
                  >
                    <InlineStack align="space-between" blockAlign="center" gap="400">
                      <Text as="span" variant="bodyMd" fontWeight="medium">
                        {faq.question}
                      </Text>
                      <div
                        style={{
                          transform: openFaqIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <ChevronDownIcon />
                      </div>
                    </InlineStack>
                  </Button>
                  
                  <Collapsible
                    open={openFaqIndex === index}
                    id={`faq-${index}`}
                    transition={{ duration: '200ms', timingFunction: 'ease' }}
                  >
                    <div style={{ padding: '0 16px 16px 16px' }}>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {faq.answer}
                      </Text>
                    </div>
                  </Collapsible>
                  
                  {index < faqs.length - 1 && (
                    <div style={{ borderTop: '1px solid var(--p-border-subdued)' }} />
                  )}
                </div>
              ))}
            </BlockStack>
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
              <s-link href={`https://${shop}/admin/themes/current/editor?context=apps`} target="_blank">
                Theme Editor
              </s-link>
              {' '}to customize your funnels, or browse{' '}
              <s-link href="/app/funnels">
                Prebuild Funnels
              </s-link>
              {' '}to explore more templates.
            </Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

