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
    // App embed blocks are stored in settings.current.blocks, but current might be a string (theme name)
    let themeSettings = null;
    
    // Check if current is an object or a string
    if (typeof settings.current === 'object' && settings.current !== null) {
      themeSettings = settings.current;
    } else if (settings.current && typeof settings.current === 'string') {
      // If current is a string (theme name), we need to find the theme in presets
      const themeName = settings.current;
      if (settings.presets && settings.presets[themeName]) {
        themeSettings = settings.presets[themeName];
      } else {
        // Try to find any preset
        themeSettings = settings.presets ? Object.values(settings.presets)[0] : null;
      }
    }
    
    if (!themeSettings || !themeSettings.blocks) {
      return false;
    }
    
    const blocks = themeSettings.blocks;
    
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
          block.type?.includes('app-embed') ||
          blockKey.startsWith('app_embed_')) {
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

/**
 * Activates the Temply app embed in the current theme
 * Updates settings_data.json to enable the app embed block
 */
export async function activateAppEmbed(shop: string, accessToken: string): Promise<boolean> {
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
      console.error('Error parsing settings_data.json:', parseError);
      return false;
    }
    
    // Debug: Log the full structure to understand where app embeds are stored
    console.log('Full settings structure (first 2000 chars):', JSON.stringify(settings, null, 2).substring(0, 2000));
    
    // 4. Find and enable our app embed block
    // App embed blocks are stored in settings.current.blocks, but current might be a string (theme name)
    // We need to find the actual theme settings object
    let themeSettings = null;
    let currentThemeName = null;
    
    // Check if current is an object or a string
    if (typeof settings.current === 'object' && settings.current !== null) {
      themeSettings = settings.current;
    } else if (settings.current && typeof settings.current === 'string') {
      // If current is a string (theme name), we need to find the theme in presets
      currentThemeName = settings.current;
      if (settings.presets && settings.presets[currentThemeName]) {
        themeSettings = settings.presets[currentThemeName];
      } else {
        // Try to find any preset or use current directly
        themeSettings = settings.presets ? Object.values(settings.presets)[0] : null;
        if (settings.presets && Object.keys(settings.presets).length > 0) {
          currentThemeName = Object.keys(settings.presets)[0];
        }
      }
    }
    
    if (!themeSettings) {
      console.error('Could not find theme settings');
      return false;
    }
    
    // Initialize blocks if it doesn't exist
    if (!themeSettings.blocks) {
      themeSettings.blocks = {};
    }
    
    const blocks = themeSettings.blocks || {};
    let blockKey = null;
    
    // Find our app embed block - check all possible patterns
    console.log('Searching for app embed block in', Object.keys(blocks).length, 'blocks');
    console.log('All block keys:', Object.keys(blocks));
    
    // First, check if blocks object exists and has any entries
    // Also search in the entire settings structure, not just blocks
    if (Object.keys(blocks).length === 0) {
      console.log('No blocks found in themeSettings.blocks, searching entire settings structure...');
      
      // Search recursively in the entire settings object
      const searchForAppEmbed = (obj: any, path: string = ''): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          // Check if this key or value matches our app embed
          if (key.toLowerCase().includes('temply') ||
              key.toLowerCase().includes('social-proof') ||
              key.toLowerCase().includes('app_embed') ||
              key.toLowerCase().includes('app-embed')) {
            console.log('Found potential app embed at path:', currentPath, 'value:', JSON.stringify(value));
            if (typeof value === 'object' && value !== null && 'type' in value) {
              return currentPath;
            }
          }
          
          // Recursively search nested objects
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const found = searchForAppEmbed(value, currentPath);
            if (found) return found;
          }
        }
        return null;
      };
      
      const foundPath = searchForAppEmbed(settings);
      if (foundPath) {
        console.log('Found app embed at path:', foundPath);
      }
    }
    
    for (const [key, blockValue] of Object.entries(blocks)) {
      const block = blockValue as { disabled?: boolean; type?: string };
      
      // Log all blocks for debugging
      console.log('Checking block:', key, 'type:', block.type, 'disabled:', block.disabled, 'full:', JSON.stringify(block));
      
      // Check if this is our app embed block - be more lenient in matching
      if (key.toLowerCase().includes('temply') ||
          key.toLowerCase().includes('social-proof') || 
          key.toLowerCase().includes('social_proof') ||
          key.toLowerCase().includes('app_embed') ||
          key.toLowerCase().includes('app-embed') ||
          block.type?.toLowerCase().includes('temply') ||
          block.type?.toLowerCase().includes('social-proof') ||
          block.type?.toLowerCase().includes('social_proof') ||
          block.type?.toLowerCase().includes('app-embed') ||
          block.type === '7f820c13-e006-c1c8-55e9-35b6dfe53c194a8f708d' ||
          key.startsWith('app_embed_')) {
        blockKey = key;
        console.log('Found app embed block:', blockKey, 'Current disabled status:', block.disabled);
        break;
      }
    }

    // If block not found, we need to add it
    if (!blockKey) {
      // App Embed blocks are stored in themeSettings.blocks
      // The block key format is usually: "app_embed_<extension_uid>"
      // Extension UID from shopify.extension.toml: 7f820c13-e006-c1c8-55e9-35b6dfe53c194a8f708d
      const extensionUid = '7f820c13-e006-c1c8-55e9-35b6dfe53c194a8f708d';
      const newBlockKey = `app_embed_${extensionUid}`;
      
      // Add the app embed block
      // App embed blocks structure: type should be the extension UID
      // We explicitly do NOT set disabled - if disabled is missing, the block is enabled
      themeSettings.blocks[newBlockKey] = {
        type: extensionUid,
        settings: {}
      };
      
      blockKey = newBlockKey;
      console.log('Created new app embed block:', blockKey, 'with structure:', JSON.stringify(themeSettings.blocks[newBlockKey]));
    } else {
      // Enable the existing block by removing disabled property entirely
      if (themeSettings.blocks[blockKey]) {
        const block = themeSettings.blocks[blockKey];
        const wasDisabled = block.disabled;
        
        // Remove disabled property - if it doesn't exist, block is enabled
        delete block.disabled;
        
        console.log('Enabled existing app embed block:', blockKey, 'was disabled:', wasDisabled, 'now enabled');
        console.log('Block structure after activation:', JSON.stringify(block));
      }
    }

    // 5. Update both current and preset if needed
    if (currentThemeName && settings.presets && settings.presets[currentThemeName]) {
      // Update the preset
      settings.presets[currentThemeName] = themeSettings;
      console.log('Updated preset:', currentThemeName);
    } else if (typeof settings.current === 'object' && settings.current !== null) {
      // If current is an object, update it directly
      settings.current = themeSettings;
      console.log('Updated settings.current directly');
    }
    
    // 6. Update the settings_data.json
    try {
      const updateResponse = await shopifyREST(
        `themes/${mainTheme.id}/assets.json`,
        shop,
        accessToken,
        {
          method: 'PUT',
          body: JSON.stringify({
            asset: {
              key: 'config/settings_data.json',
              value: JSON.stringify(settings)
            }
          })
        }
      );

      if (updateResponse?.asset) {
        console.log('Successfully updated settings_data.json with block:', blockKey);
        
        // Verify that the block was actually saved by checking the status
        // Wait a moment for Shopify to process the update
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check if the embed is now enabled
        const isEnabled = await checkAppEmbedStatus(shop, accessToken);
        console.log('App embed status after activation:', isEnabled);
        
        return isEnabled;
      } else {
        console.error('Failed to update settings_data.json:', updateResponse);
        return false;
      }
    } catch (updateError) {
      console.error('Error updating settings_data.json:', updateError);
      return false;
    }
  } catch (error) {
    console.error('Error activating app embed:', error);
    return false;
  }
}

