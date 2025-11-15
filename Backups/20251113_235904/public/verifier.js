// Temply Section Verifier
// Checks if the app embed is enabled before rendering the section

(function() {
  'use strict';
  
  const sectionId = document.currentScript?.getAttribute('data-section-id');
  
  if (!sectionId) {
    console.warn('Temply: Section ID not found');
    return;
  }
  
  // Wait for DOM to be ready
  function checkAppEmbed() {
    // Check if the app embed marker element exists
    const embedMarker = document.getElementById('temply-app-embed-active');
    const sectionSelector = `.st_check-section--${sectionId}`;
    const sectionElement = document.querySelector(sectionSelector);
    
    if (!sectionElement) {
      return;
    }
    
    if (!embedMarker) {
      // App embed is not enabled
      if (window.Shopify?.designMode) {
        // In theme editor, show a helpful message
        sectionElement.innerHTML = `
          <div style="padding: 40px; text-align: center; background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; margin: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">⚠️ Temply App Embed Required</h3>
            <p style="margin: 0; color: #856404;">Please enable the Temply app embed in the Theme Editor (App embeds section) to display this content.</p>
          </div>
        `;
      } else {
        // On live site, completely hide it
        sectionElement.style.display = 'none';
      }
    }
    // If embedMarker exists, section is already visible (no action needed)
  }
  
  // Run check when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAppEmbed);
  } else {
    checkAppEmbed();
  }
})();
