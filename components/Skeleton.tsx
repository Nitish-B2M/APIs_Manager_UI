'use client';

import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
    const { theme } = useTheme();

    const style: React.CSSProperties = {};
    if (width) style.width = typeof width === 'number' ? `${width}px` : width;
    if (height) style.height = typeof height === 'number' ? `${height}px` : height;

    return (
        <div
            className={`animate-pulse rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} ${className}`}
            style={style}
        />
    );
}

export function EndpointSkeleton() {
    const { theme } = useTheme();
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className={`p-2.5 border-l-2 border-transparent ${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2">
                <Skeleton width={40} height={16} />
                <Skeleton className="flex-1" height={14} />
            </div>
        </div>
    );
}

export function SidebarSkeleton() {
    return (
        <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <EndpointSkeleton key={i} />
            ))}
        </div>
    );
}

export function RequestPaneSkeleton() {
    const { theme } = useTheme();
    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className={`${bgColor} p-4 space-y-4`}>
            {/* URL Bar */}
            <div className="flex gap-2">
                <Skeleton width={80} height={36} />
                <Skeleton className="flex-1" height={36} />
                <Skeleton width={100} height={36} />
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {['Params', 'Headers', 'Body', 'Docs'].map((tab) => (
                    <Skeleton key={tab} width={60} height={32} />
                ))}
            </div>

            {/* Content area */}
            <div className="space-y-2">
                <Skeleton className="w-full" height={40} />
                <Skeleton className="w-full" height={40} />
                <Skeleton className="w-3/4" height={40} />
            </div>
        </div>
    );
}

export function ResponsePaneSkeleton() {
    const { theme } = useTheme();
    const bgColor = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';

    return (
        <div className={`${bgColor} p-4 space-y-4`}>
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Skeleton width={80} height={20} />
                    <Skeleton width={60} height={20} />
                    <Skeleton width={50} height={20} />
                </div>
                <div className="flex gap-2">
                    <Skeleton width={32} height={32} />
                    <Skeleton width={32} height={32} />
                </div>
            </div>

            {/* Content */}
            <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton
                        key={i}
                        className="w-full"
                        height={20}
                        width={`${60 + (i % 4) * 10}%`}
                    />
                ))}
            </div>
        </div>
    );
}

export function DashboardCardSkeleton() {
    const { theme } = useTheme();
    const bgColor = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
    const borderCol = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className={`${bgColor} border ${borderCol} rounded-xl p-4 space-y-3`}>
            <div className="flex justify-between items-start">
                <Skeleton width="60%" height={24} />
                <Skeleton width={60} height={24} />
            </div>
            <Skeleton width="40%" height={16} />
            <div className="flex gap-2 pt-2">
                <Skeleton width={80} height={32} />
                <Skeleton width={80} height={32} />
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <DashboardCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function PageLoadingSkeleton() {
    const { theme } = useTheme();

    return (
        <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Loading...
                </p>
            </div>
        </div>
    );
}
