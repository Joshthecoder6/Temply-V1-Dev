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
import {
  Page,
  Button,
  Banner,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  Icon,
  Checkbox,
  ButtonGroup,
} from "@shopify/polaris";
import { SearchIcon, FilterIcon, SortIcon } from "@shopify/polaris-icons";

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
            pageTypeMetafield: metafield(namespace: "temply", key: "page_type") {
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

  // Filter only pages created by our plugin
  const allPages = pagesData?.pages?.edges?.map((edge: any) => edge.node) || [];
  const pages = allPages.filter((page: any) => 
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
    const pageType = page.pageTypeMetafield?.value || 'Page';
    
    return {
      ...page,
      previewImage: previewImage || null,
      pageType: pageType
    };
  });

  return { shop: session.shop, pages: enrichedPages };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get('actionType') as string;
  const pageIds = formData.get('pageIds') as string;

  try {
    if (pageIds) {
      const pageIdArray = pageIds.split(',');
      const results = [];
      
      for (const id of pageIdArray) {
        if (actionType === 'publish') {
          const mutation = `mutation {
            pagePublish(id: "${id}") {
              page {
                id
                isPublished
              }
            }
          }`;
          const result = await shopifyGraphQL(mutation, {}, session.shop, session.accessToken);
          results.push(result);
        }

        if (actionType === 'unpublish') {
          const mutation = `mutation {
            pageUnpublish(id: "${id}") {
              page {
                id
                isPublished
              }
            }
          }`;
          const result = await shopifyGraphQL(mutation, {}, session.shop, session.accessToken);
          results.push(result);
        }

        if (actionType === 'delete') {
          const result = await shopifyGraphQL(
            `mutation {
              pageDelete(id: "${id}") {
                deletedPageId
              }
            }`,
            {},
            session.shop,
            session.accessToken
          );
          results.push(result);
        }
      }

      return { success: true, results };
    }

    return { success: false, error: 'Invalid action' };
  } catch (error) {
    console.error('Action error:', error);
    return { success: false, error: String(error) };
  }
};

export default function MyPages() {
  const { shop, pages } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const revalidator = useRevalidator();
  const navigate = useNavigate();
  const [appEmbedEnabled, setAppEmbedEnabled] = useState<boolean | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Sort by date (newest first)
  const sortedPages = [...pages].sort((a: any, b: any) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Filter pages based on active filter
  const filteredPages = sortedPages.filter((page: any) => {
    if (activeFilter === 'All') return true;
    return page.pageType?.toLowerCase() === activeFilter.toLowerCase();
  });

  // Check app embed status on mount
  useEffect(() => {
    const checkEmbedStatus = async () => {
      try {
        const response = await fetch('/app/api/check-embed');
        const data = await response.json();
        
        setAppEmbedEnabled(data.enabled);
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
      setSelectedPages(new Set());
    }
  }, [fetcher.state, fetcher.data, revalidator]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPages(new Set(filteredPages.map(p => p.id)));
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

  const handleBulkAction = (action: 'publish' | 'unpublish' | 'delete') => {
    if (selectedPages.size === 0) return;

    const pageIds = Array.from(selectedPages).join(',');
    
    if (action === 'delete') {
      if (!confirm(`Are you sure you want to delete ${selectedPages.size} page(s)?`)) {
        return;
      }
    }
    
    fetcher.submit(
      { actionType: action, pageIds },
      { method: 'post' }
    );
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'today';
    if (diffInDays === 1) return 'yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  // Empty State
  if (sortedPages.length === 0) {
    return (
      <Page 
        title="My Pages"
        primaryAction={{
          content: 'Create new page',
          onAction: () => navigate('/app/funnels'),
        }}
      >
        {appEmbedEnabled === false && (
          <div style={{ marginBottom: '20px' }}>
            <Banner
              title="Enable Temply in your theme"
              tone="warning"
              action={{ content: 'Go to theme editor', onAction: () => navigate('/app/themes') }}
            >
              <p>
                The app embed needs to be activated in your theme for sections to display correctly on your store.
              </p>
            </Banner>
          </div>
        )}
        
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0px 1px 0px 0px rgba(0, 0, 0, 0.05)',
          padding: '80px 20px',
          textAlign: 'center',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Document Icon */}
          <div style={{
            width: '120px',
            height: '120px',
            marginBottom: '24px',
            opacity: 0.5
          }}>
            <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="60" fill="#F6F6F7"/>
              <path d="M50 40C50 37.7909 51.7909 36 54 36H66V48C66 50.2091 67.7909 52 70 52H82V76C82 78.2091 80.2091 80 78 80H54C51.7909 80 50 78.2091 50 76V40Z" fill="white"/>
              <path d="M68 36.4142L81.5858 50H70C68.8954 50 68 49.1046 68 48V36.4142Z" fill="white"/>
              <rect x="56" y="60" width="16" height="2" rx="1" fill="#005BD3"/>
              <rect x="56" y="66" width="20" height="2" rx="1" fill="#005BD3"/>
              <rect x="56" y="72" width="18" height="2" rx="1" fill="#005BD3"/>
              <circle cx="74" cy="74" r="12" fill="#005BD3"/>
              <path d="M74 68V74M74 74V80M74 74H68M74 74H80" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          <h2 style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 600,
            fontSize: '12px',
            lineHeight: '16px',
            color: '#202223',
            marginBottom: '8px'
          }}>
            The building blocks of your funnel strategy
          </h2>

          <p style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            fontSize: '12px',
            color: '#303030',
            maxWidth: '616px',
            marginBottom: '24px',
            lineHeight: '1.4'
          }}>
            Create and manage all your funnel types. Adjust settings for each page to better guide your visitors and improve engagement.
          </p>

          <Button onClick={() => navigate('/app/funnels')}>
            Create new Page
          </Button>
        </div>
      </Page>
    );
  }

  // Pages List View
  return (
    <Page 
      title="My Pages"
      primaryAction={{
        content: 'Create new page',
        onAction: () => navigate('/app/funnels'),
      }}
    >
      {appEmbedEnabled === false && (
        <div style={{ marginBottom: '20px' }}>
          <Banner
            title="Enable Temply in your theme"
            tone="warning"
            action={{ content: 'Go to theme editor', onAction: () => navigate('/app/themes') }}
          >
            <p>
              The app embed needs to be activated in your theme for sections to display correctly on your store.
            </p>
          </Banner>
        </div>
      )}

      <div style={{ 
        background: 'white',
        borderRadius: '8px',
        boxShadow: '0px 1px 0px 0px rgba(0, 0, 0, 0.05)',
        padding: '20px'
      }}>
        <BlockStack gap="400">
          <Text as="h2" variant="headingMd" fontWeight="semibold">
            Your recent pages
          </Text>

          {/* Filter Tabs and Bulk Actions */}
          <div style={{ 
            display: 'flex', 
            gap: '16px',
            borderBottom: '1px solid #E1E3E5',
            paddingBottom: '8px',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', gap: '16px', flex: 1 }}>
              {['All', 'Landing', 'Home', 'Product', 'Collection', 'Blog post'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    fontSize: '13px',
                    fontWeight: activeFilter === filter ? 600 : 400,
                    color: activeFilter === filter ? '#303030' : '#6D7175',
                    cursor: 'pointer',
                    borderBottom: activeFilter === filter ? '2px solid #303030' : '2px solid transparent',
                    marginBottom: '-10px',
                    transition: 'all 0.2s'
                  }}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Bulk Actions or Icons */}
            {selectedPages.size > 0 ? (
              <ButtonGroup>
                <Button size="slim" onClick={() => handleBulkAction('publish')}>
                  Visible
                </Button>
                <Button size="slim" onClick={() => handleBulkAction('unpublish')}>
                  Hidden
                </Button>
                <Button size="slim" tone="critical" onClick={() => handleBulkAction('delete')}>
                  Delete
                </Button>
              </ButtonGroup>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6D7175'
                }}>
                  <Icon source={SearchIcon} />
                </button>
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6D7175'
                }}>
                  <Icon source={FilterIcon} />
                </button>
                <button style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6D7175'
                }}>
                  <Icon source={SortIcon} />
                </button>
              </div>
            )}
          </div>

          {/* Instant landing page link */}
          <Text as="p" variant="bodySm" tone="subdued">
            Instant landing page
          </Text>

          {/* Select All */}
          <div style={{ paddingBottom: '12px', borderBottom: '1px solid #E1E3E5' }}>
            <Checkbox
              label="Select all"
              checked={selectedPages.size === filteredPages.length && filteredPages.length > 0}
              onChange={handleSelectAll}
            />
          </div>

          {/* Page Cards */}
          <BlockStack gap="300">
            {filteredPages.map((page: any) => {
              const pageNumericId = page.id.split('/').pop();
              const storeName = shop.replace('.myshopify.com', '');
              const pageAdminUrl = `https://admin.shopify.com/store/${storeName}/pages/${pageNumericId}`;
              
              return (
                <div
                  key={page.id}
                  style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px',
                    border: '1px solid #E1E3E5',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    alignItems: 'center'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('.checkbox-wrapper') && !target.closest('input[type="checkbox"]')) {
                      window.open(pageAdminUrl, '_blank');
                    }
                  }}
                >
                  {/* Checkbox */}
                  <div 
                    className="checkbox-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      label=""
                      labelHidden
                      checked={selectedPages.has(page.id)}
                      onChange={(checked) => handleSelectPage(page.id, checked)}
                    />
                  </div>

                  {/* Thumbnail */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    flexShrink: 0,
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #E1E3E5'
                  }}>
                    {page.previewImage ? (
                      <img 
                        src={page.previewImage}
                        alt={page.title}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        background: 'repeating-conic-gradient(#E1E3E5 0% 25%, transparent 0% 50%) 50% / 10px 10px'
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <BlockStack gap="100">
                      {/* Title and Badge */}
                      <InlineStack gap="200" blockAlign="center" wrap={false}>
                        <div style={{ 
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <Text as="h3" variant="bodyMd" fontWeight="semibold">
                            {page.title}
                          </Text>
                        </div>
                        <Badge tone="success">Default</Badge>
                      </InlineStack>

                      {/* Page Type */}
                      <Text as="p" variant="bodySm" tone="subdued">
                        {page.pageType} page
                      </Text>

                      {/* Meta Info */}
                      <Text as="p" variant="bodySm" tone="subdued">
                        Assigned the rest of {page.pageType?.toLowerCase()}s • Last modified {getRelativeTime(page.updatedAt)}
                      </Text>
                    </BlockStack>
                  </div>
                </div>
              );
            })}
          </BlockStack>
        </BlockStack>
      </div>
    </Page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
