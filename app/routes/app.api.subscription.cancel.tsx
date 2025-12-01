import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { identifyCustomer, cancelSubscription } from "../lib/mantle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    try {
        const { session } = await authenticate.admin(request);
        const { shop } = session;

        const formData = await request.formData();
        const subscriptionId = formData.get("subscriptionId") as string;

        if (!subscriptionId) {
            return Response.json({ error: "Subscription ID is required" }, { status: 400 });
        }

        // Identify customer to get token
        const customer = await identifyCustomer(shop, {
            myshopifyDomain: shop,
        });

        if (!customer.customerApiToken) {
            return Response.json({ error: "Could not authenticate with Mantle" }, { status: 500 });
        }

        // Cancel subscription
        await cancelSubscription(subscriptionId, customer.customerApiToken);

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error cancelling subscription:", error);
        return Response.json(
            { error: "Failed to cancel subscription" },
            { status: 500 }
        );
    }
};
