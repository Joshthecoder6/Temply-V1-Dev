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
    });

    if (!session?.shop) {
      console.error('Subscribe action - No shop in session');
      return Response.json({ error: "Unauthorized - No shop in session" }, { status: 401 });
    }

    const formData = await request.formData();
    const planType = formData.get("plan") as string;

    if (!planType || (planType !== "beginner" && planType !== "growth")) {
      return Response.json({ error: "Invalid plan type" }, { status: 400 });
    }

    // Map plan type to Mantle plan name
    const mantlePlanName = planType === "beginner" 
      ? MANTLE_PLANS.BEGINNER 
      : MANTLE_PLANS.GROWTH;

    // Identify customer in Mantle (using shop domain as customer ID)
    const customer = await identifyCustomer(session.shop, {
      email: `${session.shop}@shopify.com`, // Placeholder email
      name: session.shop,
      metadata: {
        shop: session.shop,
        source: "pricing_page",
      },
    });

    if (!customer.customerApiToken) {
      return Response.json({ error: "Failed to get customer API token from Mantle" }, { status: 500 });
    }

    // Create subscription checkout link
    const appUrl = process.env.SHOPIFY_APP_URL || process.env.APP_URL_HOST 
      ? `https://${process.env.APP_URL_HOST}` 
      : "https://temply-developer.joshuajeske.de";
    
    const returnUrl = `${appUrl}/app/pricing?success=true`;
    
    const checkoutUrl = await createSubscriptionCheckout(
      session.shop,
      mantlePlanName,
      customer.customerApiToken,
      returnUrl
    );

    if (!checkoutUrl) {
      return Response.json({ error: "Failed to create checkout link" }, { status: 500 });
    }

    // Redirect to Mantle checkout
    return redirect(checkoutUrl);
  } catch (error) {
    console.error("Error creating Mantle subscription:", error);
    return Response.json(
      { 
        error: error instanceof Error ? error.message : "Failed to create subscription",
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
};

