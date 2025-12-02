import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { identifyCustomer, cancelSubscription, getSubscription } from "../lib/mantle.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    try {
        const { session } = await authenticate.admin(request);
        const { shop } = session;

        const formData = await request.formData();
        const submittedSubscriptionId = formData.get("subscriptionId") as string;

        // Identify customer to get token
        const customer = await identifyCustomer(shop, {
            myshopifyDomain: shop,
        });

        if (!customer.customerApiToken) {
            return Response.json({ error: "Could not authenticate with Mantle" }, { status: 500 });
        }

        // Fetch the REAL active subscription from Mantle
        const activeSubscription = await getSubscription(customer.customerApiToken);

        console.log("Cancel API Debug:", {
            shop,
            submittedSubscriptionId,
            mantleCustomerId: customer.id,
            activeSubscriptionId: activeSubscription?.id,
            activeSubscriptionStatus: activeSubscription?.status
        });

        // Use the ID from Mantle if available, otherwise fallback to submitted ID
        const subscriptionIdToCancel = activeSubscription?.id || submittedSubscriptionId;

        if (!subscriptionIdToCancel) {
            return Response.json({ error: "No active subscription found to cancel" }, { status: 400 });
        }

        // Cancel subscription
        await cancelSubscription(subscriptionIdToCancel, customer.customerApiToken);

        return Response.json({ success: true });
    } catch (error) {
        console.error("Error cancelling subscription:", error);
        return Response.json(
            { error: "Failed to cancel subscription" },
            { status: 500 }
        );
    }
};
