import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import { activateAppEmbed } from "../lib/theme-embed-checker.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    
    // Activate the app embed in the theme
    const success = await activateAppEmbed(session.shop, session.accessToken);
    
    if (success) {
      // Update the database
      await prisma.appSettings.upsert({
        where: {
          shop: session.shop
        },
        update: {
          appEmbedEnabled: true
        },
        create: {
          shop: session.shop,
          appEmbedEnabled: true,
          enabled: true
        }
      });

      return Response.json({
        success: true,
        message: "App embed activated successfully"
      });
    } else {
      return Response.json({
        success: false,
        message: "Failed to activate app embed"
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error activating app embed:', error);
    return Response.json({
      success: false,
      message: "Error activating app embed"
    }, { status: 500 });
  }
};

