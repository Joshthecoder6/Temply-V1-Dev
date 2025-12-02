import type { ActionFunctionArgs } from "react-router";

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

    if (!planType || !["beginner", "growth", "beginner_yearly", "growth_yearly"].includes(planType)) {
      return Response.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Map plan type to Mantle plan name
    let mantlePlanName: string;
    if (planType === "beginner") mantlePlanName = "Beginner Plan";
    else if (planType === "growth") mantlePlanName = "Growth Plan";
    else if (planType === "beginner_yearly") mantlePlanName = "Beginner Plan Yearly";
    else if (planType === "growth_yearly") mantlePlanName = "Growth Plan Yearly";
    else mantlePlanName = "Beginner Plan";

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
    let planId: string;
    switch (planType) {
      case "beginner":
        planId = MANTLE_PLAN_IDS.BEGINNER;
        break;
      case "growth":
        planId = MANTLE_PLAN_IDS.GROWTH;
        break;
      case "beginner_yearly":
        planId = MANTLE_PLAN_IDS.BEGINNER_YEARLY;
        break;
      case "growth_yearly":
        planId = MANTLE_PLAN_IDS.GROWTH_YEARLY;
        break;
      default:
        planId = MANTLE_PLAN_IDS.BEGINNER; // Fallback
    }

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
      ? `/app/onboarding?success=true&shop=${session.shop}`
      : `/app/pricing?success=true&shop=${session.shop}`;


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

    // Return confirmation URL for client-side redirect
    return Response.json({ confirmationUrl });
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
