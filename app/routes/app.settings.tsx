import { Page, Layout, Card, Text, BlockStack, Button, Banner, Modal } from "@shopify/polaris";
import { useLoaderData, useFetcher, Link } from "react-router";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { identifyCustomer, getSubscription } from "../lib/mantle.server";

export const loader = async ({ request }: { request: Request }) => {
    const { session } = await authenticate.admin(request);
    const { shop } = session;

    const customer = await identifyCustomer(shop, {
        myshopifyDomain: shop,
    });

    let subscription = null;
    if (customer.customerApiToken) {
        subscription = await getSubscription(customer.customerApiToken);
    }

    return { subscription };
};

export default function SettingsPage() {
    const { subscription } = useLoaderData<typeof loader>();
    const fetcher = useFetcher();
    const [modalOpen, setModalOpen] = useState(false);

    const isCancelling = fetcher.state !== "idle";

    const handleCancel = () => {
        fetcher.submit(
            { subscriptionId: subscription.id },
            { method: "POST", action: "/app/api/subscription/cancel" }
        );
        setModalOpen(false);
    };

    return (
        <Page title="Settings">
            <Layout>
                <Layout.Section>
                    <Card>
                        <BlockStack gap="400">
                            <Text as="h2" variant="headingMd">
                                Subscription Management
                            </Text>

                            {subscription && subscription.status === "active" ? (
                                <BlockStack gap="400">
                                    <Banner tone="success">
                                        You are currently subscribed to the <strong>{subscription.plan?.name || "Premium"}</strong> plan.
                                    </Banner>
                                    <BlockStack gap="200">
                                        <Text as="p" variant="bodyMd">
                                            Status: <Text as="span" fontWeight="bold" tone="success">Active</Text>
                                        </Text>
                                        <div style={{ marginTop: '1rem' }}>
                                            <Button tone="critical" onClick={() => setModalOpen(true)} loading={isCancelling}>
                                                Cancel Subscription
                                            </Button>
                                        </div>
                                    </BlockStack>
                                </BlockStack>
                            ) : (
                                <BlockStack gap="400">
                                    <Banner tone="info">
                                        You are currently on the <strong>Free</strong> plan.
                                    </Banner>
                                    <div style={{ marginTop: '1rem' }}>
                                        <Link to="/app/pricing">
                                            <Button variant="primary">Upgrade Plan</Button>
                                        </Link>
                                    </div>
                                </BlockStack>
                            )}
                        </BlockStack>
                    </Card>
                </Layout.Section>
            </Layout>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Cancel Subscription?"
                primaryAction={{
                    content: "Confirm Cancellation",
                    onAction: handleCancel,
                    destructive: true,
                    loading: isCancelling,
                }}
                secondaryActions={[{
                    content: "Keep Subscription",
                    onAction: () => setModalOpen(false),
                }]}
            >
                <Modal.Section>
                    <Text as="p">
                        Are you sure you want to cancel your subscription? You will lose access to premium features immediately.
                    </Text>
                </Modal.Section>
            </Modal>
        </Page>
    );
}
