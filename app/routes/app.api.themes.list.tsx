import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
    const { admin } = await authenticate.admin(request);

    try {
        const response = await admin.graphql(`
      query {
        themes(first: 50) {
          edges {
            node {
              id
              name
              role
              createdAt
              updatedAt
            }
          }
        }
      }
    `);

        const data = await response.json();
        const themes = data.data?.themes?.edges?.map((edge: any) => edge.node) || [];

        // Sort: main theme first, then by name
        const sortedThemes = themes.sort((a: any, b: any) => {
            if (a.role === 'main') return -1;
            if (b.role === 'main') return 1;
            return a.name.localeCompare(b.name);
        });

        return { success: true, themes: sortedThemes };
    } catch (error) {
        console.error("Error fetching themes:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to fetch themes"
        };
    }
};
