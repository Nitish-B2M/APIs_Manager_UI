'use client';

import { WifiOff, Loader2 } from 'lucide-react';

interface OfflineBannerProps {
    isOnline: boolean;
    queueLength: number;
    isSyncing: boolean;
}

export function OfflineBanner({ isOnline, queueLength, isSyncing }: OfflineBannerProps) {
    if (isOnline && queueLength === 0 && !isSyncing) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center p-2 text-sm font-medium text-white shadow-md bg-yellow-600 dark:bg-yellow-700 animate-in slide-in-from-top">
            {!isOnline ? (
                <>
                    <WifiOff className="w-4 h-4 mr-2" />
                    You are currently offline. Viewing cached data. {queueLength > 0 && `(${queueLength} changes pending sync)`}
                </>
            ) : isSyncing ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing {queueLength} offline changes...
                </>
            ) : (
                <>
                    Restored connection. Syncing pending changes...
                </>
            )}
        </div>
    );
}
