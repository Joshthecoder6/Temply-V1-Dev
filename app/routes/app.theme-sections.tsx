import type { LoaderFunctionArgs } from "react-router";
import { Page, Text } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function ThemeSections() {
  return (
    <Page title="Theme Sections">
      <Text as="p" variant="bodyMd">
        Content wird noch erstellt
      </Text>
    </Page>
  );
}

