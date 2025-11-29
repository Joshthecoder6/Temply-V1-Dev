/**
 * Mantle API Client Helper Functions
 * Documentation: https://appapi.heymantle.dev/docs/introduction-to-mantle-documentation
 */

import dotenv from 'dotenv';
dotenv.config();


console.log("DEBUG ENV:", {
  MANTLE_APP_ID: process.env.MANTLE_APP_ID,
  MANTLE_API_KEY: process.env.MANTLE_API_KEY ? "EXISTS" : "MISSING",
});


// ENV CHECK SERVER
console.log("ENV CHECK SERVER:", {
  APP_ID: process.env.MANTLE_APP_ID,
  API_KEY: process.env.MANTLE_API_KEY ? '[REDACTED]' : undefined,
  HAS_APP_ID: !!process.env.MANTLE_APP_ID,
  HAS_API_KEY: !!process.env.MANTLE_API_KEY,
  MANTLE_API_BASE_URL: 'https://appapi.heymantle.com/v1'
});

const MANTLE_API_BASE_URL = 'https://appapi.heymantle.com/v1';

interface MantleCustomer {
  id: string;
  customerApiToken: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

interface MantlePlan {
  id: string;
  name: string;
}

interface MantleSubscription {
  id: string;
  confirmationUrl?: string;
  checkout_url?: string; // Legacy support
}

/**
 * Initialize Mantle API headers for app-level requests
 */
function getMantleAppHeaders(): HeadersInit {
  const apiKey = process.env.MANTLE_API_KEY;
  // platformId MUST always be MANTLE_APP_ID, not dynamic
  const appId = process.env.MANTLE_APP_ID;

  if (!apiKey || !appId) {
    console.error('Mantle API credentials missing:', {
      hasApiKey: !!apiKey,
      hasAppId: !!appId,
    });
    throw new Error('Mantle API credentials not configured. Please set MANTLE_API_KEY and MANTLE_APP_ID in environment variables.');
  }

  return {
    'X-Mantle-App-Id': appId,
    'X-Mantle-App-Api-Key': apiKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Initialize Mantle API headers for customer-level requests
 */
function getMantleCustomerHeaders(customerApiToken: string, shopifyAccessToken?: string): HeadersInit {
  const appId = process.env.MANTLE_APP_ID;

  if (!appId) {
    throw new Error('Mantle App ID not configured.');
  }

  const headers: HeadersInit = {
    'X-Mantle-App-Id': appId,
    'X-Mantle-Customer-Api-Token': customerApiToken,
    'Content-Type': 'application/json',
  };

  // Add Shopify access token as header if provided (required for Shopify apps)
  if (shopifyAccessToken) {
    (headers as Record<string, string>)['X-Shopify-Access-Token'] = shopifyAccessToken;
  }

  return headers;
}

/**
 * Identify or create a customer in Mantle
 * @param customerId - Unique identifier for the customer (e.g., shop domain)
 * @param customerData - Additional customer data
 */
export async function identifyCustomer(
  customerId: string,
  customerData?: {
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
    myshopifyDomain?: string;
  }
): Promise<MantleCustomer> {
  try {
    const headers = getMantleAppHeaders();
    const appId = process.env.MANTLE_APP_ID;

    if (!appId) {
      console.error('ENV CHECK FAILED: MANTLE_APP_ID is undefined');
      throw new Error('MANTLE_APP_ID is required for identifying customers');
    }

    // Normalize customerId and myshopifyDomain to lowercase
    const shop = (customerData?.myshopifyDomain || customerId).toLowerCase();
    const normalizedCustomerId = customerId.toLowerCase();

    const body = {
      platform: 'shopify', // STATIC - same for all Shopify apps
      platformId: appId, // STATIC - MANTLE_APP_ID (identifies your app, NOT the shop!)
      myshopifyDomain: shop, // DYNAMIC - shop domain from session (changes per customer)
      customer_id: normalizedCustomerId, // DYNAMIC - shop domain (changes per customer)
      email: customerData?.email || `${normalizedCustomerId}@shopify.com`, // DYNAMIC - based on shop
      name: customerData?.name || normalizedCustomerId, // DYNAMIC - based on shop
      ...(customerData?.metadata && { metadata: customerData.metadata }), // DYNAMIC - can include shop-specific data
    };

    console.log("IDENTIFY REQUEST BODY (FINAL) →", JSON.stringify(body, null, 2));

    const endpoint = `${MANTLE_API_BASE_URL}/identify`;

    // Log headers safely (redact API key)
    const safeHeaders = { ...headers } as Record<string, string>;
    if (safeHeaders['X-Mantle-App-Api-Key']) {
      safeHeaders['X-Mantle-App-Api-Key'] = '[REDACTED]';
    }

    console.log('Mantle identify request:', {
      url: endpoint,
      headers: safeHeaders,
      body,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle identify response:', data);

    // Handle different response structures
    if (data.customer) {
      return {
        id: data.customer.id || customerId,
        customerApiToken: data.customer.customerApiToken || data.customer.apiToken || '',
        email: data.customer.email,
        name: data.customer.name,
        metadata: data.customer.metadata,
      };
    }
    if (data.customerApiToken || data.apiToken) {
      return {
        id: data.id || customerId,
        customerApiToken: data.customerApiToken || data.apiToken || '',
        email: data.email,
        name: data.name,
        metadata: data.metadata,
      };
    }
    return {
      id: data.id || customerId,
      customerApiToken: data.customerApiToken || data.apiToken || '',
      email: data.email,
      name: data.name,
      metadata: data.metadata,
    };
  } catch (error) {
    console.error('Error identifying customer in Mantle:', error);
    throw error;
  }
}

/**
 * Get available plans from Mantle
 */
export async function getPlans(customerApiToken?: string): Promise<MantlePlan[]> {
  try {
    const headers = customerApiToken
      ? getMantleCustomerHeaders(customerApiToken)
      : getMantleAppHeaders();

    const endpoint = `${MANTLE_API_BASE_URL}/plans`;

    // Log headers safely (redact sensitive data)
    const safeHeaders = { ...headers } as Record<string, string>;
    if (safeHeaders['X-Mantle-Customer-Api-Token']) {
      safeHeaders['X-Mantle-Customer-Api-Token'] = '[REDACTED]';
    }
    if (safeHeaders['X-Mantle-App-Api-Key']) {
      safeHeaders['X-Mantle-App-Api-Key'] = '[REDACTED]';
    }

    console.log('Mantle getPlans request:', {
      url: endpoint,
      method: 'GET',
      hasCustomerToken: !!customerApiToken,
      headers: safeHeaders,
    });

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle getPlans API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
        hasCustomerToken: !!customerApiToken,
      });
      // Do not throw immediately, return empty array to allow fallback logic in createSubscriptionCheckout to work
      return [];
    }

    const data = await response.json();
    console.log('Mantle getPlans response (SUMMARY):', {
      hasData: !!data,
      plansCount: data.plans?.length || data.data?.length || 0,
      plans: (data.plans || data.data || []).map((p: any) => ({ id: p.id, name: p.name })),
    });

    // Handle different response structures
    const plans = data.plans || data.data || [];
    return plans;
  } catch (error) {
    console.error('Error fetching plans from Mantle:', error);
    // Return empty array to allow fallback
    return [];
  }
}

/**
 * Create a subscription checkout link for a customer
 * @param customerId - Customer identifier
 * @param planName - Name of the plan (e.g., "Beginner Plan" or "Growth Plan")
 * @param customerApiToken - Customer API token from identify step
 * @param returnUrl - URL to redirect after checkout
 * @param shopifyAccessToken - Optional Shopify store access token (required for Shopify apps)
 */
export async function createSubscriptionCheckout(
  customerId: string,
  planName: string,
  customerApiToken: string,
  returnUrl?: string,
  shopifyAccessToken?: string
): Promise<string> {
  try {
    // Try to get plan ID - multiple fallback strategies
    let planId: string | undefined;

    // Strategy 1: Try to fetch plans from API (preferred method)
    let plans: MantlePlan[] = [];
    let plan: MantlePlan | undefined;

    try {
      console.log('Attempting to get plans with customer token...');
      plans = await getPlans(customerApiToken);
      if (plans.length === 0) {
        console.log('No plans returned with customer token, trying app headers...');
        plans = await getPlans();
      }

      plan = plans.find(p => p.name === planName);
      if (plan) {
        planId = plan.id;
        console.log(`Found plan "${planName}" via API with ID: ${planId}`);
      } else {
        console.warn(`Plan "${planName}" not found in API response. Available: ${plans.map(p => p.name).join(', ')}`);
      }
    } catch (error) {
      console.warn('Failed to get plans from API:', error);
    }

    // Strategy 2: Use Plan IDs from environment variables (if getPlans() fails)
    if (!planId) {
      console.log('getPlans() failed or plan not found, trying to use Plan IDs from environment variables...');
      if (planName === MANTLE_PLANS.BEGINNER) {
        planId = process.env.MANTLE_PLAN_ID_BEGINNER || MANTLE_PLAN_IDS.BEGINNER;
        console.log('Using Beginner Plan ID from environment/constants:', planId);
      } else if (planName === MANTLE_PLANS.GROWTH) {
        planId = process.env.MANTLE_PLAN_ID_GROWTH || MANTLE_PLAN_IDS.GROWTH;
        console.log('Using Growth Plan ID from environment/constants:', planId);
      }
    }

    // Strategy 3: If still no plan ID, throw error
    if (!planId) {
      const availablePlans = plans.length > 0
        ? plans.map(p => `${p.name} (ID: ${p.id})`).join(', ')
        : 'none (could not fetch from API)';
      const envPlanIds = `Environment Plan IDs: Beginner=${process.env.MANTLE_PLAN_ID_BEGINNER || 'not set'}, Growth=${process.env.MANTLE_PLAN_ID_GROWTH || 'not set'}`;

      throw new Error(
        `Failed to get plan ID for "${planName}". ` +
        `Available plans from API: ${availablePlans}. ` +
        `${envPlanIds}. ` +
        `Please either fix the /v1/plans endpoint or set MANTLE_PLAN_ID_BEGINNER and MANTLE_PLAN_ID_GROWTH in your .env file.`
      );
    }

    console.log('Creating subscription checkout:', {
      planId,
      planName,
      returnUrl,
      source: plan ? 'API' : 'Environment variable',
    });

    const endpoint = `${MANTLE_API_BASE_URL}/subscriptions`;

    // STRATEGY: Send strict headers as requested by user
    // 1. X-Mantle-App-Id
    // 2. X-Mantle-Customer-Api-Token
    // 3. X-Shopify-Access-Token
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Mantle-App-Id': process.env.MANTLE_APP_ID || '',
      'X-Mantle-Customer-Api-Token': customerApiToken,
      'X-Shopify-Access-Token': shopifyAccessToken || '',
    };

    // Update request body to match user requirement: camelCase and billingProvider
    const requestBody: any = {
      planId: planId,
      customerId: customerId,
      billingProvider: 'shopify',
    };

    if (returnUrl) {
      requestBody.returnUrl = returnUrl;
    }

    console.log('SUBSCRIPTION REQUEST BODY (FINAL - USER FORMAT) →', JSON.stringify(requestBody, null, 2));

    // Log headers safely
    const safeHeaders = { ...headers } as Record<string, string>;
    if (safeHeaders['X-Mantle-Customer-Api-Token']) {
      safeHeaders['X-Mantle-Customer-Api-Token'] = '[REDACTED]';
    }
    if (safeHeaders['X-Shopify-Access-Token']) {
      safeHeaders['X-Shopify-Access-Token'] = '[REDACTED]';
    }

    console.log('Mantle subscription request:', {
      url: endpoint,
      method: 'POST',
      headers: safeHeaders,
      body: requestBody,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle subscription API error (FINAL):', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
        planIdUsed: planId,
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle subscription response (SUCCESS):', JSON.stringify(data, null, 2));

    const confirmationUrl =
      data.confirmationUrl ||
      data.confirmation_url ||
      data.subscription?.confirmationUrl ||
      data.subscription?.confirmation_url ||
      data.checkout_url ||
      data.url ||
      '';

    if (!confirmationUrl) {
      console.error('No confirmation URL in Mantle response:', data);
      throw new Error('Mantle API did not return a confirmation URL');
    }

    return confirmationUrl;
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    throw error;
  }
}

/**
 * Plan name constants
 * These must match exactly the plan names in your Mantle dashboard
 */
export const MANTLE_PLANS = {
  BEGINNER: 'Beginner Plan',
  GROWTH: 'Growth Plan',
} as const;

/**
 * Plan ID constants (fallback if getPlans() fails)
 * These IDs are extracted from Mantle dashboard URLs:
 * - Beginner Plan: https://app.heymantle.com/apps/.../plans/b6c3c289-2f34-404c-b3c1-a553e6935756
 * - Growth Plan: https://app.heymantle.com/apps/.../plans/a5331f09-bc03-4709-8af6-f2f45c515bf7
 * 
 * You can override these via environment variables if needed:
 * MANTLE_PLAN_ID_BEGINNER and MANTLE_PLAN_ID_GROWTH
 */
export const MANTLE_PLAN_IDS = {
  BEGINNER: process.env.MANTLE_PLAN_ID_BEGINNER || 'bdb0a7e1-55ae-42d2-b051-e546c0fa8509',
  GROWTH: process.env.MANTLE_PLAN_ID_GROWTH || 'a5331f09-bc03-4709-8af6-f2f45c515bf7',
} as const;

