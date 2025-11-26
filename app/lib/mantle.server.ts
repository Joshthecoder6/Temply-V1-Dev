/**
 * Mantle API Client Helper Functions
 * Documentation: https://appapi.heymantle.dev/docs/introduction-to-mantle-documentation
 */

const MANTLE_API_BASE_URL = 'https://appapi.heymantle.dev/v1';

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
  checkout_url?: string;
}

/**
 * Initialize Mantle API headers for app-level requests
 */
function getMantleAppHeaders(): HeadersInit {
  const apiKey = process.env.MANTLE_API_KEY;
  const appId = process.env.MANTLE_APP_ID;

  if (!apiKey || !appId) {
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
function getMantleCustomerHeaders(customerApiToken: string): HeadersInit {
  const appId = process.env.MANTLE_APP_ID;

  if (!appId) {
    throw new Error('Mantle App ID not configured.');
  }

  return {
    'X-Mantle-App-Id': appId,
    'X-Mantle-Customer-Api-Token': customerApiToken,
    'Content-Type': 'application/json',
  };
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
  }
): Promise<MantleCustomer> {
  try {
    const headers = getMantleAppHeaders();
    const body = {
      customer_id: customerId,
      ...customerData,
    };

    console.log('Mantle identify request:', {
      url: `${MANTLE_API_BASE_URL}/identify`,
      headers: { ...headers, 'X-Mantle-App-Api-Key': headers['X-Mantle-App-Api-Key'] ? '[REDACTED]' : undefined },
      body,
    });

    const response = await fetch(`${MANTLE_API_BASE_URL}/identify`, {
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
      });
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Mantle identify response:', data);
    
    // Handle different response structures
    if (data.customer) {
      return data.customer;
    }
    if (data.customerApiToken) {
      return { id: data.id || customerId, customerApiToken: data.customerApiToken, ...data };
    }
    return { id: data.id || customerId, customerApiToken: data.customerApiToken || '', ...data };
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

    const response = await fetch(`${MANTLE_API_BASE_URL}/plans`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Error fetching plans from Mantle:', error);
    throw error;
  }
}

/**
 * Create a subscription checkout link for a customer
 * @param customerId - Customer identifier
 * @param planName - Name of the plan (e.g., "Beginner Plan" or "Growth Plan")
 * @param customerApiToken - Customer API token from identify step
 * @param returnUrl - URL to redirect after checkout
 */
export async function createSubscriptionCheckout(
  customerId: string,
  planName: string,
  customerApiToken: string,
  returnUrl?: string
): Promise<string> {
  try {
    // First, get the plan ID by name using customer token
    const plans = await getPlans(customerApiToken);
    const plan = plans.find(p => p.name === planName);

    if (!plan) {
      throw new Error(`Plan "${planName}" not found in Mantle`);
    }

    // Create subscription checkout using customer token
    const response = await fetch(`${MANTLE_API_BASE_URL}/subscriptions/checkout`, {
      method: 'POST',
      headers: getMantleCustomerHeaders(customerApiToken),
      body: JSON.stringify({
        plan_id: plan.id,
        return_url: returnUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mantle API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.checkout_url || data.url || data.subscription?.checkout_url || '';
  } catch (error) {
    console.error('Error creating subscription checkout:', error);
    throw error;
  }
}

/**
 * Plan name constants
 */
export const MANTLE_PLANS = {
  BEGINNER: 'Beginner Plan',
  GROWTH: 'Growth Plan',
} as const;

