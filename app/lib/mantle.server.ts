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
 * @param accessToken - Shopify access token (required for subscription creation)
 */
export async function identifyCustomer(
  customerId: string,
  customerData?: {
    email?: string;
    name?: string;
    metadata?: Record<string, any>;
    myshopifyDomain?: string;
  },
  accessToken?: string
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
      ...(accessToken && { accessToken }), // OPTIONAL - Shopify access token for subscription creation
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
      body: { ...body, accessToken: accessToken ? '[REDACTED]' : undefined },
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
 * Plan ID constants (fallback if getPlans() fails)
 * These IDs are the actual plan IDs from your Mantle account.
 * Retrieved from customer.plans in MantleProvider.
 * 
 * You can override these via environment variables if needed:
 * MANTLE_PLAN_ID_BEGINNER and MANTLE_PLAN_ID_GROWTH
 */
export const MANTLE_PLAN_IDS = {
  BEGINNER: process.env.MANTLE_PLAN_ID_BEGINNER || 'bdb0a7e1-55ae-42d2-b051-e546c0fa8509',
  GROWTH: process.env.MANTLE_PLAN_ID_GROWTH || 'dd16fe78-ba82-4ec8-a418-dc16e826828d',
};



/**
 * Create subscription checkout URL using Mantle API
 * @param customerId - The customer identifier (shop domain)
 * @param planName - The plan name (e.g., "Beginner Plan")
 * @param customerApiToken - The customer's API token from Mantle
 * @param returnUrl - Optional return URL after successful checkout
 */
export async function createSubscriptionCheckout(
  customerId: string,
  planName: string,
  customerApiToken: string,
  returnUrl?: string
): Promise<string> {
  try {
    // Fetch available plans from Mantle to get the correct plan ID
    console.log('Fetching plans from Mantle to get correct plan ID...');
    const plans = await getPlans(customerApiToken);

    console.log('Available plans from Mantle:', {
      count: plans.length,
      plans: plans.map((p: any) => ({ id: p.id, name: p.name })),
    });

    // Find the plan by name
    let selectedPlan = plans.find((p: any) =>
      p.name?.toLowerCase() === planName.toLowerCase()
    );

    // If not found by exact match, try partial match
    if (!selectedPlan) {
      selectedPlan = plans.find((p: any) =>
        p.name?.toLowerCase().includes(planName.toLowerCase().replace(' plan', ''))
      );
    }

    if (!selectedPlan || !selectedPlan.id) {
      console.error('Plan not found in Mantle:', {
        requestedPlanName: planName,
        availablePlans: plans.map((p: any) => p.name),
      });

      // Fallback to hardcoded plan IDs if plans can't be fetched
      console.log('Trying fallback to hardcoded plan IDs...');
      let planId: string;
      if (planName === "Beginner Plan") {
        planId = MANTLE_PLAN_IDS.BEGINNER;
      } else if (planName === "Growth Plan") {
        planId = MANTLE_PLAN_IDS.GROWTH;
      } else {
        throw new Error(`Plan "${planName}" not found in Mantle. Available plans: ${plans.map((p: any) => p.name).join(', ')}`);
      }

      console.log('Using fallback plan ID:', { planName, planId });
      selectedPlan = { id: planId, name: planName };
    }

    const planId = selectedPlan.id;

    console.log('Creating subscription checkout:', {
      planId,
      planName: selectedPlan.name,
      returnUrl,
      customerId,
    });

    // Create subscription using customer token - Mantle API expects /subscriptions endpoint
    const requestBody: any = {
      planId: planId,  // Mantle API uses camelCase
    };

    if (returnUrl) {
      requestBody.returnUrl = returnUrl;  // Mantle API uses camelCase
    }

    const endpoint = `${MANTLE_API_BASE_URL}/subscriptions`;

    console.log('Mantle subscription request:', {
      url: endpoint,
      method: 'POST',
      hasCustomerToken: !!customerApiToken,
      body: requestBody,
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getMantleCustomerHeaders(customerApiToken),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mantle subscription API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        endpoint,
        customerId,
        hasCustomerToken: !!customerApiToken,
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle subscription response:', data);

    // Handle different response structures - Mantle returns confirmationUrl
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
 * Verify Mantle Webhook Signature
 * @param request - The request object
 * @param secret - The webhook secret from Mantle
 */
export async function verifyMantleWebhook(request: Request, secret: string): Promise<boolean> {
  const signature = request.headers.get('X-Mantle-Signature');
  if (!signature) return false;

  const payload = await request.clone().text();

  // Dynamic import for crypto to avoid issues in some environments if not needed elsewhere
  const crypto = await import('crypto');

  const digest = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return digest === signature;
}




