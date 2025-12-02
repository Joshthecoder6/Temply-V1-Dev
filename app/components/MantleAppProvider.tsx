import { MantleProvider, useMantle as useOriginalMantle } from "@heymantle/react";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

interface MantleAppProviderProps {
    children: ReactNode;
    appId: string;
    customerApiToken: string;
}

// Extended Mantle context with additional functions
interface ExtendedMantleContext {
    subscribe: (params: {
        planId: string;
        customerId?: string;
        discount?: string;
        returnUrl?: string;
    }) => Promise<any>;
    upgrade: (params: {
        planId: string;
        customerId?: string;
        discount?: string;
        returnUrl?: string;
    }) => Promise<any>;
    downgrade: (params: {
        planId: string;
        customerId?: string;
        discount?: string;
        returnUrl?: string;
    }) => Promise<any>;
    cancel: (params: {
        customerId?: string;
        returnUrl?: string;
    }) => Promise<any>;
    customer: any;
    plans: any[];
}

// Create extended context
const ExtendedMantleContext = createContext<ExtendedMantleContext | null>(null);

// Hook to use the extended mantle functionality
function useExtendedMantle(): ExtendedMantleContext {
    // During SSR, useOriginalMantle might throw or return null
    // We handle this gracefully by providing a fallback
    let originalMantle;
    try {
        originalMantle = useOriginalMantle();
    } catch (error) {
        // SSR fallback - these will be replaced on client side
        console.warn('Mantle hooks not available during SSR, using fallback');
        return {
            subscribe: async () => { throw new Error('Mantle not initialized'); },
            upgrade: async () => { throw new Error('Mantle not initialized'); },
            downgrade: async () => { throw new Error('Mantle not initialized'); },
            cancel: async () => { throw new Error('Mantle not initialized'); },
            customer: null,
            plans: []
        };
    }

    if (!originalMantle) {
        // Fallback if originalMantle is null/undefined
        return {
            subscribe: async () => { throw new Error('Mantle not initialized'); },
            upgrade: async () => { throw new Error('Mantle not initialized'); },
            downgrade: async () => { throw new Error('Mantle not initialized'); },
            cancel: async () => { throw new Error('Mantle not initialized'); },
            customer: null,
            plans: []
        };
    }

    return {
        subscribe: async (params) => {
            console.log("EXTENDED SUBSCRIBE:", params);
            return originalMantle.subscribe(params);
        },
        upgrade: async (params) => {
            console.log("EXTENDED UPGRADE:", params);
            // For now, upgrade uses the same logic as subscribe
            return originalMantle.subscribe(params);
        },
        downgrade: async (params) => {
            console.log("EXTENDED DOWNGRADE:", params);
            // For now, downgrade uses the same logic as subscribe
            return originalMantle.subscribe(params);
        },
        cancel: async () => {
            console.log("EXTENDED CANCEL: Initiating cancellation");
            const subscriptionId = originalMantle.customer?.subscription?.id;

            if (!subscriptionId) {
                console.error("No active subscription found in Mantle context");
                throw new Error("No active subscription to cancel");
            }

            try {
                const response = await fetch('/app/api/subscription/cancel', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ subscriptionId })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Failed to cancel subscription: ${errorText}`);
                }

                // Reload to update state
                window.location.reload();
                return true;
            } catch (error) {
                console.error("Error in cancel function:", error);
                throw error;
            }
        },
        customer: originalMantle.customer,
        plans: originalMantle.plans || []
    };
}

export function MantleAppProvider({ children, appId, customerApiToken }: MantleAppProviderProps) {
    return (
        <MantleProvider appId={appId} customerApiToken={customerApiToken}>
            <ExtendedMantleProvider>
                {children}
            </ExtendedMantleProvider>
        </MantleProvider>
    );
}

// Internal provider that uses the extended hook
function ExtendedMantleProvider({ children }: { children: ReactNode }) {
    const extendedValue = useExtendedMantle();

    return (
        <ExtendedMantleContext.Provider value={extendedValue}>
            {children}
        </ExtendedMantleContext.Provider>
    );
}

// Extended useMantle hook that includes all functions
export function useMantle() {
    const context = useContext(ExtendedMantleContext);
    if (!context) {
        // During SSR or before hydration, return a fallback
        // This prevents server errors while still providing type safety
        console.warn('useMantle called outside MantleAppProvider context');
        return {
            subscribe: async () => { throw new Error('Mantle not initialized'); },
            upgrade: async () => { throw new Error('Mantle not initialized'); },
            downgrade: async () => { throw new Error('Mantle not initialized'); },
            cancel: async () => { throw new Error('Mantle not initialized'); },
            customer: null
        };
    }
    return context;
}
