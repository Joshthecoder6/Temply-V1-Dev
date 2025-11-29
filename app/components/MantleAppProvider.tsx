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
    }) => Promise<void>;
    upgrade: (params: {
        planId: string;
        customerId?: string;
        discount?: string;
        returnUrl?: string;
    }) => Promise<void>;
    downgrade: (params: {
        planId: string;
        customerId?: string;
        discount?: string;
        returnUrl?: string;
    }) => Promise<void>;
    cancel: (params: {
        customerId?: string;
        returnUrl?: string;
    }) => Promise<void>;
    customer: any;
}

// Create extended context
const ExtendedMantleContext = createContext<ExtendedMantleContext | null>(null);

// Extended Mantle Provider
export function MantleAppProvider({ children, appId, customerApiToken }: MantleAppProviderProps) {
    const originalMantle = useOriginalMantle();

    // Create extended functions that use the original subscribe function with different parameters
    const extendedValue: ExtendedMantleContext = {
        subscribe: async (params) => {
            console.log("EXTENDED SUBSCRIBE:", params);
            return originalMantle.subscribe({
                planId: params.planId,
                returnUrl: params.returnUrl
            });
        },
        upgrade: async (params) => {
            console.log("EXTENDED UPGRADE:", params);
            // For now, upgrade uses the same logic as subscribe
            // In a real implementation, this would call a different Mantle API endpoint
            return originalMantle.subscribe({
                planId: params.planId,
                returnUrl: params.returnUrl
            });
        },
        downgrade: async (params) => {
            console.log("EXTENDED DOWNGRADE:", params);
            // For now, downgrade uses the same logic as subscribe
            // In a real implementation, this would call a different Mantle API endpoint
            return originalMantle.subscribe({
                planId: params.planId,
                returnUrl: params.returnUrl
            });
        },
        cancel: async (params) => {
            console.log("EXTENDED CANCEL:", params);
            // Cancel implementation - this would need to be implemented based on Mantle API
            // For now, this is a placeholder
            throw new Error("Cancel function not yet implemented");
        },
        customer: originalMantle.customer
    };

    return (
        <MantleProvider appId={appId} customerApiToken={customerApiToken}>
            <ExtendedMantleContext.Provider value={extendedValue}>
                {children}
            </ExtendedMantleContext.Provider>
        </MantleProvider>
    );
}

// Extended useMantle hook that includes all functions
export function useMantle() {
    const context = useContext(ExtendedMantleContext);
    if (!context) {
        throw new Error("useMantle must be used within a MantleAppProvider");
    }
    return context;
}
