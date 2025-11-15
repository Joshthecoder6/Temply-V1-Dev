import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { prisma } from "~/db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecret: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: "2024-10",
  scopes: ["read_themes", "write_themes", "read_products", "write_products"],
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
});

// Force new installation
async function forceReinstall() {
  const shop = "josh-app-test-2.myshopify.com";
  
  // Delete existing sessions
  await prisma.session.deleteMany({
    where: { shop }
  });
  
  console.log("Sessions cleared. Please reinstall the app.");
  console.log(`Visit: ${process.env.SHOPIFY_APP_URL}/auth?shop=${shop}`);
}

forceReinstall();