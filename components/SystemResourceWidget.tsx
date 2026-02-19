"use client";

import { ArrowLeftCircle, ArrowRightCircle, } from "lucide-react";
import { useEffect, useState } from "react";

interface SystemMetrics {
    cpu: number;
    ramMB: number;
    heapMB: number;
    heapTotalMB: number;
}

/**
 * Real-time system resource widget — only renders inside Electron.
 * Shows CPU, RAM, and heap memory usage in a minimal pill at bottom-right.
 */
export default function SystemResourceWidget() {
    const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
    const [visible, setVisible] = useState(true);
    const [isDesktop, setIsDesktop] = useState(false);

    useEffect(() => {
        const api = (window as any).desktopAPI;
        if (!api?.isDesktop) return;

        setIsDesktop(true);

        api.onSystemMetrics((data: SystemMetrics | null) => {
            setMetrics(data);
        });

        return () => {
            api.offSystemMetrics?.();
        };
    }, []);

    // Don't render anything if not in desktop mode
    if (!isDesktop) return null;

    const toggleWidget = () => {
        const api = (window as any).desktopAPI;
        const next = !visible;
        setVisible(next);
        api?.toggleMetricsWidget?.(next);
    };

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2">
            {/* Toggle button */}
            <button
                onClick={toggleWidget}
                className="w-7 h-7 rounded-full bg-gray-800/70 dark:bg-gray-700/70 
                    backdrop-blur-sm border border-gray-600/30 text-gray-400 
                    hover:text-white hover:border-gray-500/50
                    flex items-center justify-center text-xs
                    transition-all duration-200 shadow-lg"
                title={visible ? "Hide metrics" : "Show metrics"}
            >
                {visible ? <ArrowRightCircle /> : <ArrowLeftCircle />}
            </button>

            {/* Metrics panel */}
            {visible && (
                <div
                    className="bg-gray-900/85 dark:bg-gray-950/90 backdrop-blur-md 
                        rounded-xl border border-gray-700/40 shadow-2xl
                        px-4 py-2.5 text-[11px] font-mono text-gray-300
                        flex items-center gap-4
                        animate-in slide-in-from-bottom-2 duration-200"
                >
                    {/* CPU */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-green-400">●</span>
                        <span className="text-gray-500">CPU</span>
                        <span className="text-white font-semibold min-w-[38px] text-right">
                            {metrics ? `${metrics.cpu}%` : "N/A"}
                        </span>
                    </div>

                    <div className="w-px h-3 bg-gray-700"></div>

                    {/* RAM */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-blue-400">●</span>
                        <span className="text-gray-500">RAM</span>
                        <span className="text-white font-semibold min-w-[52px] text-right">
                            {metrics ? `${metrics.ramMB} MB` : "N/A"}
                        </span>
                    </div>

                    <div className="w-px h-3 bg-gray-700"></div>

                    {/* Heap Memory */}
                    <div className="flex items-center gap-1.5">
                        <span className="text-purple-400">●</span>
                        <span className="text-gray-500">MEM</span>
                        <span className="text-white font-semibold min-w-[72px] text-right">
                            {metrics
                                ? `${metrics.heapMB} / ${metrics.heapTotalMB} MB`
                                : "N/A"}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
