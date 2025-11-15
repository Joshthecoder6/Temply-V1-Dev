import type {
  HeadersFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import prisma from "../db.server";
import { useState, useEffect } from "react";
import { shopifyGraphQL } from "../lib/shopify-direct.server";
import { checkAppEmbedStatus } from "../lib/theme-embed-checker.server";
import * as fs from 'fs';
import * as path from 'path';



export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  // Load templates from database
  const templates = await prisma.template.findMany({
    where: {
      isActive: true
    }
  });

  // Sort: Real templates first (with liquidCode OR bundle), then Coming Soon (without)
  const sortedTemplates = templates.sort((a, b) => {
    // Check if template is "real" (has code or is a bundle)
    const aSettings = a.settings ? JSON.parse(a.settings) : {};
    const bSettings = b.settings ? JSON.parse(b.settings) : {};
    const aIsReal = !!a.liquidCode || !!aSettings.sectionFiles;
    const bIsReal = !!b.liquidCode || !!bSettings.sectionFiles;
    
    // First priority: Real templates ALWAYS come before Coming Soon templates
    if (aIsReal && !bIsReal) return -1;
    if (!aIsReal && bIsReal) return 1;
    
    // Within the same group (both real OR both coming soon):
    // Second: Featured templates first
    if (a.isFeatured !== b.isFeatured) {
      return b.isFeatured ? 1 : -1;
    }
    
    // Third: Newest first
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Check if app embed is enabled (live check from theme)
  const appEmbedEnabled = await checkAppEmbedStatus(session.shop, session.accessToken);

  // Update database with current status for caching
  await prisma.appSettings.upsert({
    where: {
      shop: session.shop
    },
    update: {
      appEmbedEnabled
    },
    create: {
      shop: session.shop,
      appEmbedEnabled,
      enabled: true
    }
  });

  return { 
    templates: sortedTemplates, 
    shop: session.shop,
    appEmbedEnabled
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  console.log('🚀 Install section action called');
  
  const { admin, session } = await authenticate.admin(request);
  console.log('✅ Authentication successful for shop:', session.shop);
  
  const formData = await request.formData();
  const templateId = formData.get("templateId") as string;
  console.log('📦 Template ID:', templateId);

  if (!templateId) {
    console.error('❌ No template ID provided');
    return Response.json({ error: "Template ID is required" }, { status: 400 });
  }

  // Check if app embed is enabled before allowing installation (live check)
  const appEmbedEnabled = await checkAppEmbedStatus(session.shop, session.accessToken);

  if (!appEmbedEnabled) {
    console.error('❌ App embed is not enabled');
    return Response.json({ 
      error: "App Embed not enabled",
      details: "Please enable the Temply app embed in your Theme Editor before installing templates."
    }, { status: 403 });
  }

  try {
    // Load template from database
    console.log('📚 Loading template from database...');
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: { 
        liquidCode: true, 
        name: true,
        id: true,
        previewImage: true,
        settings: true
      }
    });

    if (!template) {
      console.error('❌ Template not found');
      return Response.json({ error: "Template not found" }, { status: 404 });
    }
    console.log('✅ Template loaded:', template.name);

    // Parse settings to check if this is a bundle template
    const settings = template.settings ? JSON.parse(template.settings) : {};
    const isBundle = !!settings.sectionFiles;
    console.log('📦 Is Bundle Template:', isBundle);

    // Get the live theme ID
    console.log('🎨 Fetching live theme...');
    const themesData = await shopifyGraphQL(
      `query {
        themes(first: 1, roles: MAIN) {
          nodes {
            id
            name
          }
        }
      }`,
      {},
      session.shop,
      session.accessToken
    );
    console.log('✅ Themes query completed');
    console.log('Themes Response:', JSON.stringify(themesData, null, 2));
    
    if (!themesData?.themes?.nodes || themesData.themes.nodes.length === 0) {
      console.error('No themes found:', themesData);
      return Response.json({ 
        error: "No live theme found",
        details: "No themes available in the shop"
      }, { status: 404 });
    }

    const liveTheme = themesData.themes.nodes[0];

    if (!liveTheme) {
      console.error('❌ No live theme in response');
      return Response.json({ error: "No live theme found" }, { status: 404 });
    }
    console.log('✅ Live theme found:', liveTheme.name, 'ID:', liveTheme.id);

    let filesToUpload = [];
    let sectionTypes = [];

    if (isBundle) {
      // Bundle template: Read and upload all section files
      console.log('📦 Processing bundle template with', settings.sectionFiles.length, 'sections');
      
      for (const sectionFile of settings.sectionFiles) {
        // sectionFile is like "1-text-section.liquid"
        const liquidPath = path.join(process.cwd(), 'prisma', 'templates', sectionFile);
        console.log('📖 Reading:', liquidPath);
        
        const liquidCode = fs.readFileSync(liquidPath, 'utf-8');
        
        // Generate nice section name for Shopify (temply-text-section instead of 1-text-section)
        const cleanName = sectionFile.replace(/^\d+-/, '').replace('.liquid', ''); // "text-section"
        const uploadFilename = `temply-${cleanName}.liquid`; // "temply-text-section.liquid"
        const sectionType = `temply-${cleanName}`; // "temply-text-section"
        
        filesToUpload.push({
          filename: `sections/${uploadFilename}`,
          body: {
            type: "TEXT",
            value: liquidCode
          }
        });
        
        sectionTypes.push(sectionType);
      }
      
      console.log('✅ Loaded', filesToUpload.length, 'section files');
    } else {
      // Regular template: Single section
      if (!template.liquidCode) {
        console.error('❌ Template has no liquid code');
        return Response.json({ error: "Template has no liquid code" }, { status: 404 });
      }
      
      const baseFilename = settings.filename || `temply-${template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.liquid`;
      const sectionType = baseFilename.replace('.liquid', '');
      
      filesToUpload.push({
        filename: `sections/${baseFilename}`,
        body: {
          type: "TEXT",
          value: template.liquidCode
        }
      });
      
      sectionTypes.push(sectionType);
    }

    console.log('📤 Uploading', filesToUpload.length, 'section(s) to theme...');

    // Upload all section files
    const uploadData = await shopifyGraphQL(
      `mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
            size
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        themeId: liveTheme.id,
        files: filesToUpload
      },
      session.shop,
      session.accessToken
    );
    
    console.log('Upload GraphQL Response:', JSON.stringify(uploadData, null, 2));

    if (uploadData?.themeFilesUpsert?.userErrors?.length > 0) {
      console.error('Theme upload errors:', uploadData.themeFilesUpsert.userErrors);
      return Response.json({ 
        error: "Failed to upload files to theme",
        details: uploadData.themeFilesUpsert.userErrors.map((e: any) => `${e.field}: ${e.message}`).join(', ')
      }, { status: 400 });
    }

    console.log('✅ Files uploaded successfully!');

    // Upload verifier.js script to theme assets
    console.log('📤 Uploading verifier.js script...');
    try {
      const verifierJsPath = path.join(process.cwd(), 'public', 'verifier.js');
      const verifierJsContent = fs.readFileSync(verifierJsPath, 'utf-8');

      const verifierUploadData = await shopifyGraphQL(
        `mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
          themeFilesUpsert(files: $files, themeId: $themeId) {
            upsertedThemeFiles {
              filename
              size
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          themeId: liveTheme.id,
          files: [
            {
              filename: "assets/verifier.js",
              body: {
                type: "TEXT",
                value: verifierJsContent
              }
            }
          ]
        },
        session.shop,
        session.accessToken
      );

      if (verifierUploadData?.themeFilesUpsert?.userErrors?.length > 0) {
        console.warn('⚠️ Warning: Failed to upload verifier.js:', verifierUploadData.themeFilesUpsert.userErrors);
      } else {
        console.log('✅ verifier.js uploaded successfully!');
      }
    } catch (verifierError) {
      console.warn('⚠️ Warning: Failed to upload verifier.js:', verifierError);
      // Don't fail the entire operation if verifier.js upload fails
    }

    console.log('✅ Section uploaded successfully!');

    // Create a demo page with the section (unique for each installation)
    console.log('📄 Creating demo page with section...');
    
    // Get existing pages with this template to find the next number
    const baseHandle = template.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existingPagesData = await shopifyGraphQL(
      `query getPages($query: String!) {
        pages(first: 250, query: $query) {
          edges {
            node {
              id
              handle
              title
            }
          }
        }
      }`,
      {
        query: `handle:${baseHandle}*`
      },
      session.shop,
      session.accessToken
    );

    // Count existing pages with this base handle
    const existingPages = existingPagesData?.pages?.edges || [];
    let pageNumber = 1;
    let pageTitle = template.name;
    let pageHandle = baseHandle;

    // Find the next available number
    if (existingPages.length > 0) {
      const existingNumbers = existingPages
        .map((edge: any) => {
          const handle = edge.node.handle;
          const match = handle.match(new RegExp(`^${baseHandle}(?:-(\\d+))?$`));
          return match ? (match[1] ? parseInt(match[1]) : 1) : 0;
        })
        .filter((num: number) => num > 0);
      
      if (existingNumbers.length > 0) {
        pageNumber = Math.max(...existingNumbers) + 1;
      }
    }

    if (pageNumber > 1) {
      pageTitle = `${template.name} (${pageNumber})`;
      pageHandle = `${baseHandle}-${pageNumber}`;
    }

    console.log('📝 Creating page:', pageTitle, 'with handle:', pageHandle);
    
    // Create page template JSON
    let pageTemplateFilename;
    let pageTemplateContent;
    let templateSuffix;
    
    if (isBundle) {
      // Bundle: Create template with all sections
      templateSuffix = 'product-page-bundle';
      pageTemplateFilename = `templates/page.${templateSuffix}.json`;
      
      const sections = {};
      const order = [];
      
      sectionTypes.forEach((type, index) => {
        const sectionId = `section${index + 1}`;
        sections[sectionId] = {
          type: type,
          settings: {}
        };
        order.push(sectionId);
      });
      
      pageTemplateContent = JSON.stringify({
        sections,
        order
      }, null, 2);
      
      console.log('📦 Bundle template with', order.length, 'sections:', order);
    } else {
      // Regular: Single section template
      const sectionType = sectionTypes[0];
      templateSuffix = sectionType.replace('temply-', '');
      pageTemplateFilename = `templates/page.${templateSuffix}.json`;
      
      pageTemplateContent = JSON.stringify({
        sections: {
          main: {
            type: sectionType,
            settings: {}
          }
        },
        order: ["main"]
      }, null, 2);
    }

    // Upload the page template
    console.log('📤 Uploading page template:', pageTemplateFilename);
    const templateUploadData = await shopifyGraphQL(
      `mutation themeFilesUpsert($files: [OnlineStoreThemeFilesUpsertFileInput!]!, $themeId: ID!) {
        themeFilesUpsert(files: $files, themeId: $themeId) {
          upsertedThemeFiles {
            filename
            size
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        themeId: liveTheme.id,
        files: [
          {
            filename: pageTemplateFilename,
            body: {
              type: "TEXT",
              value: pageTemplateContent
            }
          }
        ]
      },
      session.shop,
      session.accessToken
    );

    if (templateUploadData?.themeFilesUpsert?.userErrors?.length > 0) {
      console.warn('⚠️ Warning: Failed to upload page template:', templateUploadData.themeFilesUpsert.userErrors);
    }
    
    const createPageData = await shopifyGraphQL(
      `mutation createPage($input: PageCreateInput!) {
        pageCreate(page: $input) {
          page {
            id
            title
            handle
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        input: {
          title: pageTitle,
          handle: pageHandle,
          body: isBundle 
            ? `<p>Diese Seite zeigt das ${template.name} mit ${sectionTypes.length} Sections.</p>`
            : `<p>Diese Seite zeigt die Section: ${template.name}</p>`,
          isPublished: true,
          templateSuffix: templateSuffix,
          metafields: [
            {
              namespace: "temply",
              key: "template_id",
              value: template.id,
              type: "single_line_text_field"
            },
            {
              namespace: "temply",
              key: "preview_image",
              value: template.previewImage || "",
              type: "single_line_text_field"
            }
          ]
        }
      },
      session.shop,
      session.accessToken
    );

    console.log('Page creation response:', JSON.stringify(createPageData, null, 2));

    if (createPageData?.pageCreate?.userErrors?.length > 0) {
      console.error('⚠️ Page creation errors:', createPageData.pageCreate.userErrors);
      // Don't fail completely, just log the error
    }

    const demoPage = createPageData?.pageCreate?.page;
    
    if (!demoPage?.id) {
      console.error('❌ Page was not created successfully');
      return Response.json({ 
        error: "Page creation failed",
        details: "Could not create demo page"
      }, { status: 500 });
    }

    // Get the numeric page ID
    const pageId = demoPage.id.split('/').pop();
    
    // URL to the page in Shopify Admin (edit mode)
    const pageAdminUrl = `https://${session.shop}/admin/pages/${pageId}`;
    
    // URL to preview the page in the theme customizer
    const themeNumericId = liveTheme.id.split('/').pop();
    const pagePreviewUrl = `https://${session.shop}/admin/themes/${themeNumericId}/editor?previewPath=/pages/${pageHandle}`;

    console.log('✅ Installation complete!');
    console.log('📄 Page ID:', pageId);
    console.log('📄 Page Handle:', pageHandle);
    console.log('🔗 Admin URL:', pageAdminUrl);
    console.log('👁️ Preview URL:', pagePreviewUrl);

    return Response.json({
      success: true,
      message: isBundle 
        ? `${sectionTypes.length} sections successfully installed`
        : "Section successfully installed",
      themeName: liveTheme.name,
      pageAdminUrl,
      pagePreviewUrl,
      pageTitle: demoPage.title,
      pageHandle,
      filesUploaded: uploadData?.themeFilesUpsert?.upsertedThemeFiles?.length || 0,
      isBundle,
      sectionsCount: sectionTypes.length
    });

  } catch (error) {
    console.error('❌ Error installing section:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return Response.json({ 
      error: "Failed to install section",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
};

export default function Funnels() {
  const { templates, appEmbedEnabled: initialEmbedStatus, shop } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [appEmbedEnabled, setAppEmbedEnabled] = useState(initialEmbedStatus);

  // Check app embed status every 10 seconds
  useEffect(() => {
    const checkEmbedStatus = async () => {
      try {
        const response = await fetch('/app/api/check-embed');
        const data = await response.json();
        setAppEmbedEnabled(data.enabled);
      } catch (error) {
        console.error('Failed to check app embed status:', error);
      }
    };

    // Check immediately
    checkEmbedStatus();

    // Then check every 10 seconds
    const interval = setInterval(checkEmbedStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  // Helper: Check if template is "real" (has code or is a bundle)
  const isRealTemplate = (template: any) => {
    if (template.liquidCode) return true;
    try {
      const settings = template.settings ? JSON.parse(template.settings) : {};
      return !!settings.sectionFiles;
    } catch {
      return false;
    }
  };

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data) {
      const data = fetcher.data as any;
      if ('error' in data) {
        const errorMessage = data.details || data.error;
        setToast({ message: errorMessage, type: 'error' });
        setLoadingTemplateId(null);
      } else if ('success' in data && data.success) {
        setToast({
          message: `Page "${data.pageTitle}" created successfully!`,
          type: 'success'
        });
        setLoadingTemplateId(null);

        // Open the page preview in Theme Editor
        if (data.pagePreviewUrl) {
          setTimeout(() => {
            window.open(data.pagePreviewUrl, '_blank');
          }, 1500);
        }
      }
    }
  }, [fetcher.data]);

  // Auto-hide toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleInstallSection = (templateId: string) => {
    if (!appEmbedEnabled) {
      setToast({ 
        message: 'Please enable the Temply app embed in your Theme Editor before installing templates.', 
        type: 'error' 
      });
      return;
    }
    
    setToast(null);
    setLoadingTemplateId(templateId);
    
    fetcher.submit(
      { templateId },
      { method: "post" }
    );
  };

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
      
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '60px 40px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        {/* Toast Notification */}
        {toast && (
          <div style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            padding: '16px 24px',
            background: toast.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${toast.type === 'success' ? '#10b981' : '#ef4444'}`,
            borderRadius: '8px',
            color: toast.type === 'success' ? '#065f46' : '#991b1b',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            animation: 'slideDown 0.3s ease-out',
            minWidth: '300px',
            maxWidth: '500px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 500
          }}>
            {toast.type === 'success' ? '✓' : '✗'} {toast.message}
          </div>
        )}

      {/* App Embed Warning Banner */}
      {!appEmbedEnabled && (
        <div style={{
          background: '#fff4e5',
          border: '1px solid #ffd79d',
          borderRadius: '8px',
          padding: '16px 20px',
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <strong style={{ display: 'block', marginBottom: '4px', color: '#663c00' }}>
              App Embed nicht aktiviert
            </strong>
            <p style={{ margin: 0, fontSize: '14px', color: '#663c00' }}>
              Bitte aktiviere das Temply App Embed in deinem Theme Editor → App embeds, 
              bevor du Templates installierst.
            </p>
          </div>
          <a
            href={`https://${shop}/admin/themes/current/editor?context=apps`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              background: '#000',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap'
            }}
          >
            Theme Editor öffnen
          </a>
        </div>
      )}

      {/* Header */}
      <h1 style={{
        fontSize: '28px',
        fontWeight: 600,
        textAlign: 'center',
        margin: '0 0 60px 0',
        color: '#202223'
      }}>
        Choose a template for your page
      </h1>

      {/* Template Grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(3, 1fr)', 
        gap: '32px',
        marginBottom: '40px'
      }}>
        {templates.map((template, index) => (
          <div
            key={template.id}
            style={{
              background: 'white',
              border: '1px solid #e1e3e5',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'box-shadow 0.2s ease'
            }}
          >
            {/* Preview Image */}
            <div style={{ 
              width: '100%', 
              height: '280px',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {template.previewImage && (
                <img 
                  src={template.previewImage} 
                  alt={template.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '20px' }}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '16px', 
                fontWeight: 600,
                color: !isRealTemplate(template) ? '#6d7175' : '#202223'
              }}>
                {!isRealTemplate(template) ? 'Coming Soon' : template.name}
              </h3>

              {/* Buttons */}
              <div style={{ 
                display: 'flex', 
                gap: '12px'
              }}>
                {template.demoUrl && (
                  <button
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: !isRealTemplate(template) ? '#f6f6f7' : 'white',
                      border: '1px solid #c9cccf',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: !isRealTemplate(template) ? '#9ca3af' : '#202223',
                      cursor: !isRealTemplate(template) ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s',
                      opacity: !isRealTemplate(template) ? 0.7 : 1
                    }}
                    onClick={() => {
                      if (isRealTemplate(template) && template.demoUrl) {
                        window.open(template.demoUrl, '_blank');
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (isRealTemplate(template)) {
                        e.currentTarget.style.background = '#f6f6f7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (isRealTemplate(template)) {
                        e.currentTarget.style.background = 'white';
                      } else {
                        e.currentTarget.style.background = '#f6f6f7';
                      }
                    }}
                    disabled={!isRealTemplate(template)}
                  >
                    Live Preview
                  </button>
                )}
                <button
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: (!appEmbedEnabled || !isRealTemplate(template)) ? '#9ca3af' : (loadingTemplateId === template.id ? '#333333' : '#000000'),
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'white',
                    cursor: (!appEmbedEnabled || !isRealTemplate(template) || loadingTemplateId === template.id) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: (!appEmbedEnabled || !isRealTemplate(template) || loadingTemplateId === template.id) ? 0.7 : 1
                  }}
                  onClick={() => {
                    if (!appEmbedEnabled) {
                      setToast({ 
                        message: 'Please enable the Temply app embed in your Theme Editor before installing templates.', 
                        type: 'error' 
                      });
                    } else if (!isRealTemplate(template)) {
                      setToast({ 
                        message: 'This template is coming soon. Stay tuned!', 
                        type: 'error' 
                      });
                    } else {
                      handleInstallSection(template.id);
                    }
                  }}
                  disabled={!appEmbedEnabled || !isRealTemplate(template) || loadingTemplateId === template.id}
                  onMouseEnter={(e) => {
                    if (appEmbedEnabled && isRealTemplate(template) && loadingTemplateId !== template.id) {
                      e.currentTarget.style.background = '#1a1a1a';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (appEmbedEnabled && isRealTemplate(template) && loadingTemplateId !== template.id) {
                      e.currentTarget.style.background = '#000000';
                    }
                  }}
                  title={!appEmbedEnabled ? 'Enable app embed first' : (!isRealTemplate(template) ? 'Coming soon' : '')}
                >
                  {loadingTemplateId === template.id ? 'Installing...' : (!isRealTemplate(template) ? 'Coming Soon' : (appEmbedEnabled ? 'Install Theme' : 'App Embed Required'))}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    </>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};

