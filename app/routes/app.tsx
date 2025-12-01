import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useRouteError, useLocation } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-react-router/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { MantleAppProvider } from "../components/MantleAppProvider";
import { useEffect } from "react";

import { authenticate } from "../shopify.server";
import { identifyCustomer } from "../lib/mantle.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const customer = await identifyCustomer(shop, {
    email: `${shop}@shopify.com`,
    name: shop,
    myshopifyDomain: shop,
    metadata: { shop, source: 'app_root' }
  });

  // eslint-disable-next-line no-undef
  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    appId: process.env.MANTLE_APP_ID || "",
    customerApiToken: customer.customerApiToken
  };
};

export default function App() {
  const { apiKey, appId, customerApiToken } = useLoaderData<typeof loader>();
  const location = useLocation();

  // Load Shopify UI components
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.shopify.com/shopifycloud/app-bridge/shopify-ui-react-router/shopify-ui-react-router.latest.js';
    script.type = 'module';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <PolarisAppProvider i18n={{}}>
      <ShopifyAppProvider embedded apiKey={apiKey}>
        <MantleAppProvider appId={appId} customerApiToken={customerApiToken}>
          <s-app-nav>
            <s-link href="/app">Dashboard</s-link>
            <s-link href="/app/funnels">Prebuild Funnels</s-link>
            <s-link href="/app/my-pages">My Pages</s-link>
            <s-link href="/app/theme-sections">Theme Sections</s-link>
            <s-link href="/app/ai-generator">✨ Temply AI</s-link>
            <s-link href="/app/features-vote">Features Vote</s-link>
            <s-link href="/app/pricing">Pricing</s-link>
            <s-link href="/app/settings">Settings</s-link>
            <s-link href="/app/help">Help</s-link>
            <s-link href="/app/onboarding">Onboarding</s-link>
          </s-app-nav>
          <Outlet />
        </MantleAppProvider>
      </ShopifyAppProvider>
    </PolarisAppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
