import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../shopify.server";
import { identifyCustomer, createSubscriptionCheckout, MANTLE_PLAN_IDS } from "../lib/mantle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);

    console.log('Subscribe action - Session:', {
      shop: session?.shop,
      hasSession: !!session,
      url: request.url,
    });

    if (!session?.shop) {
      console.error('Subscribe action - No shop in session');
      return Response.json({ error: "Unauthorized - No shop in session" }, { status: 401 });
    }

    const formData = await request.formData();
    const planType = formData.get("plan") as string;
    const source = formData.get("source") as string || "pricing"; // Track where the request came from

    console.log('Subscribe action - Plan selection:', {
      planType,
      source,
    });

    if (!planType || (planType !== "beginner" && planType !== "growth")) {
      return Response.json({ error: "Invalid plan type. Must be 'beginner' or 'growth'" }, { status: 400 });
    }

    // Map plan type to Mantle plan name
    const mantlePlanName = planType === "beginner"
      ? "Beginner Plan"
      : "Growth Plan";

    console.log('Subscribe action - Identifying customer in Mantle:', {
      shop: session.shop,
      planName: mantlePlanName,
    });

    // Identify customer in Mantle (using shop domain as customer ID)
    // For Shopify apps, Mantle requires:
    // - platformId: MANTLE_APP_ID (set automatically in identifyCustomer)
    // - myshopifyDomain: shop domain from session
    // - accessToken: Shopify access token (required for subscription creation)
    const customer = await identifyCustomer(session.shop, {
      email: `${session.shop}@shopify.com`,
      name: session.shop,
      myshopifyDomain: session.shop, // Required for Shopify platform
      metadata: {
        shop: session.shop,
        source: source === "onboarding" ? "onboarding_page" : "pricing_page",
      },
    }, session.accessToken); // Pass Shopify access token

    if (!customer.customerApiToken) {
      console.error('Subscribe action - No customer API token received from Mantle');
      return Response.json({ error: "Failed to get customer API token from Mantle" }, { status: 500 });
    }

    console.log('Subscribe action - Customer identified:', {
      customerId: customer.id,
      hasToken: !!customer.customerApiToken,
    });

    // Get the correct plan ID from MANTLE_PLAN_IDS
    const planId = planType === "beginner" ? MANTLE_PLAN_IDS.BEGINNER : MANTLE_PLAN_IDS.GROWTH;

    console.log('Subscribe action - Creating subscription checkout:', {
      planId,
      planName: mantlePlanName,
    });

    // Create subscription checkout using the plan ID
    const appUrl = process.env.SHOPIFY_APP_URL ||
      (process.env.APP_URL_HOST ? `https://${process.env.APP_URL_HOST}` : null) ||
      "https://temply-developer.joshuajeske.de";

    // Determine return URL based on source
    const returnUrl = source === "onboarding"
      ? `${appUrl}/app/onboarding?success=true`
      : `${appUrl}/app/pricing?success=true`;

    console.log('Subscribe action - Creating subscription checkout:', {
      planName: mantlePlanName,
      planId,
      returnUrl,
    });

    const confirmationUrl = await createSubscriptionCheckout(
      session.shop,
      mantlePlanName,
      customer.customerApiToken,
      returnUrl
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
