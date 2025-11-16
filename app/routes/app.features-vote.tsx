import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";
import { useEffect } from "react";
import { Page, Button } from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return { 
    shop: session.shop,
    shopEmail: session.shop // Verwende Shop-Domain als Identifier
  };
};

export default function FeaturesVote() {
  const { shop, shopEmail } = useLoaderData<typeof loader>();

  useEffect(() => {
    // Prüfe ob Script bereits existiert
    const existingScript = document.querySelector('script[src="https://features.vote/widget/widget.js"]');
    
    if (existingScript) {
      // Script existiert bereits, lade nur die Roadmap neu
      if (typeof (window as any).loadRoadmap === 'function') {
        (window as any).loadRoadmap('features-vote-container');
      }
      return;
    }

    // Erstelle und lade das Features.vote Widget Script
    const script = document.createElement('script');
    script.src = 'https://features.vote/widget/widget.js';
    script.setAttribute('slug', 'temply');
    script.setAttribute('user_email', shopEmail);
    script.setAttribute('user_name', shop.replace('.myshopify.com', ''));
    script.setAttribute('onload', "window.loadRoadmap('features-vote-container')");
    
    document.body.appendChild(script);

    return () => {
      // Cleanup: Entferne Script beim Unmount
      const scriptToRemove = document.querySelector('script[src="https://features.vote/widget/widget.js"]');
      if (scriptToRemove) {
        document.body.removeChild(scriptToRemove);
      }
    };
  }, [shop, shopEmail]);

  const handleSuggestFeature = () => {
    // Rufe die Features.vote Popup-Funktion auf
    if (typeof (window as any).openFeatureRequestPopup === 'function') {
      (window as any).openFeatureRequestPopup();
    } else {
      console.warn('Features.vote widget not loaded yet');
    }
  };

  return (
    <Page 
      fullWidth
      primaryAction={{
        content: 'Suggest feature',
        onAction: handleSuggestFeature,
      }}
    >
      <div 
        id="features-vote-container"
        style={{
          width: '100%',
          minHeight: 'calc(100vh - 100px)',
          padding: '0',
          background: '#ffffff'
        }}
      />
    </Page>
  );
}
