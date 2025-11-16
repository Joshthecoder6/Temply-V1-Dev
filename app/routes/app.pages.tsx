import type { HeadersFunction } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { Page, Text, BlockStack } from "@shopify/polaris";

export default function MyPages() {
  return (
    <Page>
      <BlockStack gap="500">
        <Text as="h1" variant="headingLg">
          My Pages
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Content kommt bald...
        </Text>
      </BlockStack>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

