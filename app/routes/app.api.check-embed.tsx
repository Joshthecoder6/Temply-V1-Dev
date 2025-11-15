import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { checkAppEmbedStatus } from "../lib/theme-embed-checker.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Check the actual status from the theme
    const isEnabled = await checkAppEmbedStatus(session.shop, session.accessToken);
    
    // Update the database with the current status
    await prisma.appSettings.upsert({
      where: {
        shop: session.shop
      },
      update: {
        appEmbedEnabled: isEnabled
      },
      create: {
        shop: session.shop,
        appEmbedEnabled: isEnabled,
        enabled: true
      }
    });

    return Response.json({
      enabled: isEnabled
    });
  } catch (error) {
    console.error('Error checking app embed status:', error);
    return Response.json({
      enabled: false
    }, { status: 200 }); // Return false instead of error to avoid blocking
  }
};

