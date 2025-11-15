import { shopifyREST } from "./shopify-direct.server";

/**
 * Checks if the Temply app embed is enabled in the current theme
 * Using REST API which handles JSON better than GraphQL
 */
export async function checkAppEmbedStatus(shop: string, accessToken: string): Promise<boolean> {
  try {
    // 1. Get the main (published) theme using REST API
    const themesResponse = await shopifyREST('themes.json', shop, accessToken);
    
    if (!themesResponse?.themes) {
      return false;
    }

    // Find the main/published theme
    const mainTheme = themesResponse.themes.find((theme: any) => theme.role === 'main');
    
    if (!mainTheme) {
      return false;
    }

    // 2. Get settings_data.json using REST API
    const assetResponse = await shopifyREST(
      `themes/${mainTheme.id}/assets.json?asset[key]=config/settings_data.json`,
      shop,
      accessToken
    );

    if (!assetResponse?.asset?.value) {
      return false;
    }

    // 3. Parse the settings
    let settings;
    try {
      settings = JSON.parse(assetResponse.asset.value);
    } catch (parseError) {
      return false;
    }
    
    // 4. Find our app embed block
    const blocks = settings.current?.blocks || {};
    
    // Find our app embed by checking for "social-proof" or app embed patterns
    let appEmbedEnabled = false;
    let blockFound = false;
    
    for (const [blockKey, blockValue] of Object.entries(blocks)) {
      const block = blockValue as { disabled?: boolean; type?: string };
      
      // Check if this is our app embed block (Temply or old social-proof name)
      if (blockKey.toLowerCase().includes('temply') ||
          blockKey.toLowerCase().includes('social-proof') || 
          block.type?.includes('temply') ||
          block.type?.includes('social-proof') ||
          block.type?.includes('app-embed')) {
        blockFound = true;
        // If disabled is false or undefined, the embed is enabled
        appEmbedEnabled = !block.disabled;
        break;
      }
    }

    if (!blockFound) {
      return false;
    }

    return appEmbedEnabled;
  } catch (error) {
    console.error('Error checking app embed status:', error);
    return false;
  }
}

