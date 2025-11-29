import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { identifyCustomer, createSubscriptionCheckout, MANTLE_PLANS } from "../lib/mantle.server";

// Resource route - only handles POST requests
export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Return 405 Method Not Allowed for GET requests
  return new Response("Method Not Allowed", { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    console.log('Subscribe action - Session:', {
      shop: session?.shop,
      hasSession: !!session,
      url: request.url,
    });

    if (!session?.shop || !session?.accessToken) {
      console.error('Subscribe action - No shop or access token in session');
      return Response.json({ error: "Unauthorized - Missing shop or access token" }, { status: 401 });
    }

    // Normalize shop to lowercase - ALL strings must be lowercase
    const shop = session.shop.toLowerCase();

    const formData = await request.formData();
    const planType = formData.get("plan") as string;
    const source = formData.get("source") as string || "pricing"; // Track where the request came from

    console.log('Subscribe action - Plan selection:', {
      planType,
      source,
      shop,
    });

    if (!planType || (planType !== "beginner" && planType !== "growth")) {
      return Response.json({ error: "Invalid plan type. Must be 'beginner' or 'growth'" }, { status: 400 });
    }

    // Map plan type to Mantle plan name
    const mantlePlanName = planType === "beginner"
      ? MANTLE_PLANS.BEGINNER
      : MANTLE_PLANS.GROWTH;

    console.log('Subscribe action - Identifying customer in Mantle:', {
      shop,
      planName: mantlePlanName,
    });

    const customer = await identifyCustomer(shop, {
      email: `${shop}@shopify.com`, // DYNAMIC - based on shop
      name: shop, // DYNAMIC - shop domain
      myshopifyDomain: shop, // DYNAMIC - shop domain (required for Shopify platform)
      metadata: {
        shop: shop, // DYNAMIC - shop domain
        source: source === "onboarding" ? "onboarding_page" : "pricing_page",
      },
    });

    if (!customer.customerApiToken) {
      console.error('Subscribe action - No customer API token received from Mantle:', customer);
      return Response.json({ error: "Failed to get customer API token from Mantle" }, { status: 500 });
    }

    console.log('Subscribe action - Customer identified:', {
      customerId: customer.id,
      hasToken: !!customer.customerApiToken,
    });

    // Create subscription checkout link
    // Improved app URL detection
    const appUrl = process.env.SHOPIFY_APP_URL ||
      (process.env.APP_URL_HOST ? `https://${process.env.APP_URL_HOST}` : null) ||
      (process.env.HOST ? `https://${process.env.HOST}` : null) ||
      "https://temply-developer.joshuajeske.de";

    console.log('Subscribe action - Resolved App URL:', appUrl);

    // Determine return URL based on source
    const returnUrl = source === "onboarding"
      ? `${appUrl}/app/onboarding?success=true`
      : `${appUrl}/app/pricing?success=true`;

    console.log('Subscribe action - Creating subscription checkout:', {
      planName: mantlePlanName,
      returnUrl,
    });

    const confirmationUrl = await createSubscriptionCheckout(
      shop, // Use normalized lowercase shop
      mantlePlanName,
      customer.customerApiToken,
      returnUrl,
      session.accessToken // Pass Shopify store access token (required for Shopify apps)
    );

    if (!confirmationUrl) {
      console.error('Subscribe action - No confirmation URL received from Mantle');
      return Response.json({ error: "Failed to create checkout link - no confirmation URL received" }, { status: 500 });
    }

    console.log('Subscribe action - Subscription created successfully, redirecting to:', confirmationUrl);

    // Redirect to Mantle confirmation page
    return redirect(confirmationUrl);
  } catch (error) {
    console.error("Error creating Mantle subscription:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to create subscription",
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
};

