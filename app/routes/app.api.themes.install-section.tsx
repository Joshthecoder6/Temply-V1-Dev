import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin, session } = await authenticate.admin(request);

    try {
        const { themeId, sectionCode, sectionName, themeRole } = await request.json();

        if (!themeId || !sectionCode || !sectionName) {
            return {
                success: false,
                error: "Missing required parameters"
            };
        }

        let targetThemeId = themeId;
        let wasThemeDuplicated = false;
        let newThemeName = '';

        // If theme is published (role === 'main'), create a duplicate first
        if (themeRole === 'main') {
            console.log('📋 Theme is published - creating duplicate...');

            const duplicateResponse = await admin.graphql(`
        mutation {
          themeDuplicate(id: "${themeId}") {
            theme {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }
      `);

            const duplicateData = await duplicateResponse.json();

            if (duplicateData.data?.themeDuplicate?.userErrors?.length > 0) {
                return {
                    success: false,
                    error: duplicateData.data.themeDuplicate.userErrors[0].message
                };
            }

            targetThemeId = duplicateData.data?.themeDuplicate?.theme?.id;
            newThemeName = duplicateData.data?.themeDuplicate?.theme?.name;
            wasThemeDuplicated = true;

            console.log('✅ Theme duplicated:', newThemeName, targetThemeId);
        }

        // Install section to theme (original or duplicate)
        const filename = `sections/${sectionName}.liquid`;

        const mutation = `
      mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

        const variables = {
            themeId: targetThemeId,
            files: [{
                filename,
                body: {
                    type: "TEXT",
                    value: sectionCode
                }
            }]
        };

        const response = await admin.graphql(mutation, { variables });
        const data = await response.json();

        if (data.data?.themeFilesUpsert?.userErrors?.length > 0) {
            return {
                success: false,
                error: data.data.themeFilesUpsert.userErrors[0].message
            };
        }

        console.log('✅ Section installed:', filename, 'to theme:', targetThemeId);

        // Return success with info about duplication
        return {
            success: true,
            message: wasThemeDuplicated
                ? `Section installed to duplicate theme: ${newThemeName}`
                : 'Section installed successfully',
            wasThemeDuplicated,
            newThemeName: wasThemeDuplicated ? newThemeName : undefined,
            newThemeId: wasThemeDuplicated ? targetThemeId : undefined
        };
    } catch (error) {
        console.error("Error installing section:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to install section"
        };
    }
};
