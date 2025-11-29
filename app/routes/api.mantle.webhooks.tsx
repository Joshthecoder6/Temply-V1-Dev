import type { ActionFunctionArgs } from "react-router";
import { verifyMantleWebhook } from "../lib/mantle.server";
import prisma from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
    if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
    }

    const secret = process.env.MANTLE_WEBHOOK_SECRET;
    if (!secret) {
        console.error("MANTLE_WEBHOOK_SECRET is not set");
        return new Response("Server Configuration Error", { status: 500 });
    }

    // Verify signature
    const isValid = await verifyMantleWebhook(request, secret);
    if (!isValid) {
        console.error("Invalid Mantle webhook signature");
        return new Response("Unauthorized", { status: 401 });
    }

    const payload = await request.json();
    const eventType = payload.event_type || payload.type; // Mantle sends event_type
    const subscription = payload.subscription || payload.data?.subscription;
    const customer = payload.customer || payload.data?.customer;

    console.log("Received Mantle Webhook:", {
        eventType,
        subscriptionId: subscription?.id,
        customerId: customer?.id,
        shop: customer?.myshopifyDomain,
    });

    if (!subscription || !customer) {
        console.error("Missing subscription or customer data in webhook payload");
        return new Response("Bad Request", { status: 400 });
    }

    const shop = customer.myshopifyDomain || customer.id; // Fallback to ID if domain missing

    try {
        switch (eventType) {
            case "subscriptions/activate":
                await prisma.subscription.upsert({
                    where: { shop },
                    update: {
                        planId: subscription.plan.id,
                        planName: subscription.plan.name,
                        status: "ACTIVE",
                        trialExpiresAt: subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null,
                    },
                    create: {
                        shop,
                        planId: subscription.plan.id,
                        planName: subscription.plan.name,
                        status: "ACTIVE",
                        trialExpiresAt: subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : null,
                    },
                });
                console.log(`Subscription activated for ${shop}`);
                break;

            case "subscriptions/cancel":
                await prisma.subscription.update({
                    where: { shop },
                    data: {
                        status: "CANCELED",
                    },
                });
                console.log(`Subscription canceled for ${shop}`);
                break;

            case "subscriptions/upgrade":
            case "subscriptions/downgrade":
                await prisma.subscription.update({
                    where: { shop },
                    data: {
                        planId: subscription.plan.id,
                        planName: subscription.plan.name,
                        status: "ACTIVE", // Ensure status is active on change
                    },
                });
                console.log(`Subscription changed (${eventType}) for ${shop}`);
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        return new Response("Webhook processed", { status: 200 });
    } catch (error) {
        console.error("Error processing webhook:", error);
        return new Response("Internal Server Error", { status: 500 });
    }
};
