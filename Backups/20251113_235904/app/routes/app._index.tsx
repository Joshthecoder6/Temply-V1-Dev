import type {
  HeadersFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "react-router";
import { useLoaderData, useFetcher, useRevalidator, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { useState, useEffect } from "react";
import { shopifyGraphQL } from "../lib/shopify-direct.server";
import prisma from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  // Fetch all pages to see their template suffix
  const pagesData = await shopifyGraphQL(
    `query {
      pages(first: 50, sortKey: UPDATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            handle
            updatedAt
            templateSuffix
            isPublished
            metafield(namespace: "temply", key: "preview_image") {
              value
            }
            templateIdMetafield: metafield(namespace: "temply", key: "template_id") {
              value
            }
          }
        }
      }
    }`,
    {},
    session.shop,
    session.accessToken
  );

  // Filter only pages created by our plugin (all Temply pages with our metafield)
  const allPages = pagesData?.pages?.edges?.map((edge: any) => edge.node) || [];
  const pages = allPages.filter((page: any) => 
    // Show all pages that have our temply metafield (created by our app)
    page.templateIdMetafield?.value
  );

  // Load templates from database to get preview images
  const templates = await prisma.template.findMany({
    select: {
      id: true,
      previewImage: true
    }
  });

  // Create a map of template ID to preview image
  const templateImageMap = new Map(
    templates.map(t => [t.id, t.previewImage])
  );

  // Enrich pages with preview images from templates
  const enrichedPages = pages.map((page: any) => {
    const templateId = page.templateIdMetafield?.value;
    const previewImage = templateId ? templateImageMap.get(templateId) : page.metafield?.value;
    
    return {
      ...page,
      previewImage: previewImage || null
    };
  });

  // Debug: Log pages to check preview images
  console.log('📄 Enriched pages:', JSON.stringify(enrichedPages.map((p: any) => ({ 
    title: p.title, 
    templateId: p.templateIdMetafield?.value,
    previewImage: p.previewImage 
  })), null, 2));

  return { shop: session.shop, pages: enrichedPages };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('actionType') as string;
  const pageIds = formData.get('pageIds') as string; // Can be comma-separated list
  const pageId = formData.get('pageId') as string; // Single page (for backwards compatibility)

  try {
    // Handle bulk actions (multiple pageIds)
    if (pageIds) {
      const pageIdArray = pageIds.split(',');
      const results = [];
      
      for (const id of pageIdArray) {
        if (actionType === 'togglePublish') {
          const isPublished = formData.get('isPublished') === 'true';
          
          const updateResult = await shopifyGraphQL(
            `mutation pageUpdate($id: ID!, $input: PageUpdateInput!) {
              pageUpdate(id: $id, page: $input) {
                page {
                  id
                  isPublished
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              id,
              input: {
                isPublished: !isPublished
              }
            },
            session.shop,
            session.accessToken
          );

          if (updateResult?.pageUpdate?.userErrors?.length > 0) {
            results.push({ id, error: updateResult.pageUpdate.userErrors[0].message });
          } else {
            results.push({ id, success: true });
          }

        } else if (actionType === 'delete') {
          const deleteResult = await shopifyGraphQL(
            `mutation pageDelete($id: ID!) {
              pageDelete(id: $id) {
                deletedPageId
                userErrors {
                  field
                  message
                }
              }
            }`,
            {
              id
            },
            session.shop,
            session.accessToken
          );

          if (deleteResult?.pageDelete?.userErrors?.length > 0) {
            results.push({ id, error: deleteResult.pageDelete.userErrors[0].message });
          } else {
            results.push({ id, success: true });
          }
        }
      }
      
      return Response.json({ success: true, results });
    }
    
    // Handle single page action (backwards compatibility)
    if (actionType === 'togglePublish') {
      const isPublished = formData.get('isPublished') === 'true';
      
      const updateResult = await shopifyGraphQL(
        `mutation pageUpdate($id: ID!, $input: PageUpdateInput!) {
          pageUpdate(id: $id, page: $input) {
            page {
              id
              isPublished
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          id: pageId,
          input: {
            isPublished: !isPublished
          }
        },
        session.shop,
        session.accessToken
      );

      if (updateResult?.pageUpdate?.userErrors?.length > 0) {
        return Response.json({ 
          error: updateResult.pageUpdate.userErrors[0].message 
        }, { status: 400 });
      }

      return Response.json({ success: true });

    } else if (actionType === 'delete') {
      const deleteResult = await shopifyGraphQL(
        `mutation pageDelete($id: ID!) {
          pageDelete(id: $id) {
            deletedPageId
            userErrors {
              field
              message
            }
          }
        }`,
        {
          id: pageId
        },
        session.shop,
        session.accessToken
      );

      if (deleteResult?.pageDelete?.userErrors?.length > 0) {
        return Response.json({ 
          error: deleteResult.pageDelete.userErrors[0].message 
        }, { status: 400 });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
};

export default function Dashboard() {
  const { shop, pages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [bannerVisible, setBannerVisible] = useState(false);
  const [appEmbedEnabled, setAppEmbedEnabled] = useState<boolean | null>(null); // null = loading
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());

  // Sort by date (newest first)
  const sortedPages = [...pages].sort((a: any, b: any) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Check app embed status on mount
  useEffect(() => {
    const checkEmbedStatus = async () => {
      try {
        const response = await fetch('/app/api/check-embed');
        const data = await response.json();
        
        setAppEmbedEnabled(data.enabled);
        // Always show banner if embed is disabled (consistent with Funnels page)
        setBannerVisible(!data.enabled);
      } catch (error) {
        console.error('Failed to check app embed status:', error);
        setAppEmbedEnabled(false);
      }
    };

    checkEmbedStatus();
  }, []);

  // Revalidate data after successful action
  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data) {
      revalidator.revalidate();
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(new Set(sortedPages.map(p => p.id)));
    } else {
      setSelectedPages(new Set());
    }
  };

  const handleSelectPage = (pageId: string, checked: boolean) => {
    const newSelected = new Set(selectedPages);
    if (checked) {
      newSelected.add(pageId);
    } else {
      newSelected.delete(pageId);
    }
    setSelectedPages(newSelected);
  };

  const handleBulkAction = (action: 'publish' | 'hide' | 'delete') => {
    if (selectedPages.size === 0) return;

    // Send all pageIds in a single request
    const pageIdsArray = Array.from(selectedPages);
    const pageIdsString = pageIdsArray.join(',');

    if (action === 'delete') {
      fetcher.submit(
        { 
          actionType: 'delete', 
          pageIds: pageIdsString 
        },
        { method: 'post' }
      );
    } else {
      const shouldPublish = action === 'publish';
      fetcher.submit(
        { 
          actionType: 'togglePublish',
          pageIds: pageIdsString,
          isPublished: String(!shouldPublish)
        },
        { method: 'post' }
      );
    }

    setSelectedPages(new Set());
  };

  return (
    <s-page heading="Dashboard">
      {/* Theme Editor Banner */}
      {bannerVisible && (
        <div 
          data-banner="theme-editor"
          style={{
            border: '1px solid #E5E5E5',
            borderRadius: '8px',
            marginBottom: '20px',
            overflow: 'hidden'
          }}
        >
        {/* Orange Header */}
        <div style={{
          background: '#FFC453',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>⚠️</span>
          <span style={{
            fontWeight: 600,
            fontSize: '14px',
            color: '#000'
          }}>
            Enable Temply in your theme
          </span>
        </div>

        {/* White Content */}
        <div style={{
          background: '#fff',
          padding: '16px 20px'
        }}>
          <div style={{
            fontSize: '13px',
            color: '#616161',
            marginBottom: '12px',
            lineHeight: '1.5'
          }}>
            The app embed needs to be activated in your theme for sections to display correctly on your store.
          </div>
          <s-button
            href={`https://${shop}/admin/themes/current/editor?context=apps`}
            target="_blank"
            variant="primary"
          >
            Turn on Theme Editor
          </s-button>
        </div>
      </div>
      )}

      {/* Recent Pages Section */}
      <div style={{
        background: 'white',
        border: '1px solid #e1e3e5',
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e1e3e5'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            margin: 0,
            color: '#202223'
          }}>
            Your recent pages
          </h2>
        </div>

        {/* Header with actions */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #e1e3e5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span style={{
            fontSize: '13px',
            color: '#6d7175'
          }}>
            {selectedPages.size > 0 ? `${selectedPages.size} selected` : `All pages (${pages.length})`}
          </span>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleBulkAction('publish')}
              disabled={selectedPages.size === 0}
              style={{
                padding: '7px 12px',
                background: 'white',
                border: '1px solid #c9cccf',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: selectedPages.size === 0 ? 'not-allowed' : 'pointer',
                color: selectedPages.size === 0 ? '#b5b5b5' : '#303030',
                opacity: selectedPages.size === 0 ? 0.5 : 1
              }}
            >
              Make visible
            </button>
            <button
              onClick={() => handleBulkAction('hide')}
              disabled={selectedPages.size === 0}
              style={{
                padding: '7px 12px',
                background: 'white',
                border: '1px solid #c9cccf',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: selectedPages.size === 0 ? 'not-allowed' : 'pointer',
                color: selectedPages.size === 0 ? '#b5b5b5' : '#303030',
                opacity: selectedPages.size === 0 ? 0.5 : 1
              }}
            >
              Make hidden
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={selectedPages.size === 0}
              style={{
                padding: '7px 12px',
                background: 'white',
                border: '1px solid #c9cccf',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: selectedPages.size === 0 ? 'not-allowed' : 'pointer',
                color: selectedPages.size === 0 ? '#b5b5b5' : '#bf0711',
                opacity: selectedPages.size === 0 ? 0.5 : 1
              }}
            >
              Delete pages
            </button>
          </div>
        </div>

        {/* Pages List */}
        {sortedPages.length > 0 ? (
          <div>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '40px 1fr 120px 200px',
              padding: '12px 16px',
              background: '#f6f6f7',
              fontSize: '11px',
              fontWeight: 600,
              color: '#6d7175',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div>
                <input 
                  type="checkbox" 
                  style={{ cursor: 'pointer' }} 
                  checked={selectedPages.size === sortedPages.length && sortedPages.length > 0}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </div>
              <div>Title</div>
              <div>Visibility</div>
              <div>Updated</div>
            </div>

            {/* Table Rows */}
            {sortedPages.map((page: any) => {
              const pageNumericId = page.id.split('/').pop();
              const storeName = shop.replace('.myshopify.com', '');
              const pageAdminUrl = `https://admin.shopify.com/store/${storeName}/pages/${pageNumericId}`;
              
              return (
                <div
                  key={page.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 120px 200px',
                    padding: '12px 16px',
                    borderTop: '1px solid #e1e3e5',
                    alignItems: 'center',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                  }}
                  onClick={(e) => {
                    // Don't navigate if clicking on checkbox
                    if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                      window.open(pageAdminUrl, '_blank');
                    }
                  }}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer' }}
                      checked={selectedPages.has(page.id)}
                      onChange={(e) => handleSelectPage(page.id, e.target.checked)}
                    />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    {page.previewImage ? (
                      <img 
                        src={page.previewImage} 
                        alt={page.title}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '32px',
                        height: '32px',
                        background: '#95BF47',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 700,
                        color: 'white'
                      }}>
                        S
                      </div>
                    )}
                    <span style={{
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#303030'
                    }}>
                      {page.title}
                    </span>
                  </div>
                  
                  <div>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      background: page.isPublished ? '#e3f5e8' : '#fef3c7',
                      color: page.isPublished ? '#108043' : '#6c5817',
                      borderRadius: '4px',
                      fontWeight: 500
                    }}>
                      {page.isPublished ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '13px',
                    color: '#6d7175'
                  }}>
                    {new Date(page.updatedAt).toLocaleDateString('en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    }).replace(',', ' at')}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#6d7175'
          }}>
            <p style={{ margin: 0, fontSize: '13px' }}>
              No pages found. Create your first page by installing a template!
            </p>
          </div>
        )}
      </div>

      {/* Action Boxes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginTop: '24px'
      }}>
        {/* Box 1: Create new funnel */}
        <div
          onClick={() => navigate('/app/funnels')}
          style={{
            background: 'white',
            border: '1px solid #e1e3e5',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = '#c9cccf';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = '#e1e3e5';
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            background: '#f0f0f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0
          }}>
            📊
          </div>
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#202223'
            }}>
              Create new funnel
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#6d7175',
              lineHeight: '1.5'
            }}>
              Build Sales Funnel & Post-purchase Offer
            </p>
          </div>
        </div>

        {/* Box 2: Need Help */}
        <div
          onClick={() => navigate('/app/help')}
          style={{
            background: 'white',
            border: '1px solid #e1e3e5',
            borderRadius: '12px',
            padding: '20px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
            e.currentTarget.style.borderColor = '#c9cccf';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = '#e1e3e5';
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            background: '#f0f0f0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            flexShrink: 0
          }}>
            💬
          </div>
          <div>
            <h3 style={{
              margin: '0 0 4px 0',
              fontSize: '14px',
              fontWeight: 600,
              color: '#202223'
            }}>
              Need Help?
            </h3>
            <p style={{
              margin: 0,
              fontSize: '13px',
              color: '#6d7175',
              lineHeight: '1.5'
            }}>
              Get support and answers to your questions
            </p>
          </div>
        </div>
      </div>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
