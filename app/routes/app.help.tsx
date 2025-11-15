import type {
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState } from "react";

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
    <div style={{ 
      maxWidth: '900px', 
      margin: '0 auto',
      padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: '#202223'
        }}>
          Frequently asked questions
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6d7175',
          margin: 0
        }}>
          Still have questions? Reach out to our support team directly from the app dashboard.
        </p>
      </div>

      {/* FAQ Section */}
      <div style={{
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e1e3e5',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '20px 24px' }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            margin: '0 0 16px 0',
            color: '#202223'
          }}>
            FAQ
          </h2>
        </div>

        {/* FAQ Items */}
        <div>
          {faqs.map((faq, index) => (
            <div key={index}>
              <div
                onClick={() => toggleFaq(index)}
                style={{
                  padding: '16px 24px',
                  borderTop: '1px solid #e1e3e5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                  backgroundColor: openFaqIndex === index ? '#f9fafb' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (openFaqIndex !== index) {
                    e.currentTarget.style.backgroundColor = '#fafbfc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (openFaqIndex !== index) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span style={{
                  fontSize: '14px',
                  color: '#202223',
                  fontWeight: 500
                }}>
                  {faq.question}
                </span>
                <span style={{
                  fontSize: '18px',
                  color: '#6d7175',
                  transform: openFaqIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  display: 'inline-block',
                  marginLeft: '16px',
                  flexShrink: 0
                }}>
                  ▼
                </span>
              </div>
              
              {/* Answer */}
              {openFaqIndex === index && (
                <div style={{
                  padding: '0 24px 20px 24px',
                  fontSize: '14px',
                  color: '#6d7175',
                  lineHeight: '1.6',
                  backgroundColor: '#f9fafb',
                  borderTop: '1px solid #e1e3e5'
                }}>
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Additional Help Section */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: 'white',
        borderRadius: '8px',
        border: '1px solid #e1e3e5'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          margin: '0 0 8px 0',
          color: '#202223'
        }}>
          Need more help?
        </h3>
        <p style={{
          fontSize: '14px',
          color: '#6d7175',
          margin: '0 0 16px 0',
          lineHeight: '1.6'
        }}>
          Check out the{' '}
          <s-link href={`https://${shop}/admin/themes/current/editor?context=apps`} target="_blank">
            Theme Editor
          </s-link>
          {' '}to customize your funnels, or browse{' '}
          <s-link href="/app/funnels">
            Prebuild Funnels
          </s-link>
          {' '}to explore more templates.
        </p>
      </div>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

