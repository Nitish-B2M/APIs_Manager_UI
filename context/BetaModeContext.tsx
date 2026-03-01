'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface BetaModeContextValue {
    isBeta: boolean;
    toggleBeta: () => void;
}

const STORAGE_KEY = 'beta_mode_enabled';

const BetaModeContext = createContext<BetaModeContextValue>({
    isBeta: false,
    toggleBeta: () => { },
});

export function BetaModeProvider({ children }: { children: React.ReactNode }) {
    const [isBeta, setIsBeta] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored === 'true') setIsBeta(true);
        } catch { }
    }, []);

    const toggleBeta = useCallback(() => {
        setIsBeta(prev => {
            const next = !prev;
            try {
                localStorage.setItem(STORAGE_KEY, String(next));
            } catch { }
            return next;
        });
    }, []);

    return (
        <BetaModeContext.Provider value={{ isBeta, toggleBeta }}>
            {children}
        </BetaModeContext.Provider>
    );
}

export function useBetaMode() {
    return useContext(BetaModeContext);
}
