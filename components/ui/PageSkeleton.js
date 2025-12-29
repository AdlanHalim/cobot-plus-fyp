/**
 * @file PageSkeleton.js
 * @location cobot-plus-fyp/components/ui/PageSkeleton.js
 * 
 * @description
 * Skeleton loading components for faster perceived performance.
 * Shows content placeholders instead of loading spinners.
 * 
 * Uses Tailwind animate-pulse for smooth shimmer effect.
 */

import React from "react";

/**
 * Base skeleton element with shimmer animation
 */
export function Skeleton({ className = "", ...props }) {
    return (
        <div
            className={`animate-pulse bg-slate-200 rounded ${className}`}
            {...props}
        />
    );
}

/**
 * Skeleton for dashboard stats cards
 */
export function StatsCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
        </div>
    );
}

/**
 * Skeleton for table rows
 */
export function TableRowSkeleton({ columns = 5 }) {
    return (
        <tr className="border-b border-slate-100">
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
            ))}
        </tr>
    );
}

/**
 * Skeleton for list items
 */
export function ListItemSkeleton() {
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
    );
}

/**
 * Skeleton for card content
 */
export function CardSkeleton() {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
                <Skeleton className="h-5 w-32" />
            </div>
            <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
        </div>
    );
}

/**
 * Skeleton for chart containers
 */
export function ChartSkeleton({ height = "300px" }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
                <Skeleton className="h-5 w-40" />
            </div>
            <div className="p-6">
                <Skeleton className="w-full rounded-lg" style={{ height }} />
            </div>
        </div>
    );
}

/**
 * Full page skeleton layout
 * Shows skeleton structure matching typical dashboard pages
 */
export function PageSkeleton() {
    return (
        <div className="space-y-6">
            {/* Header skeleton */}
            <div>
                <Skeleton className="h-7 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>

            {/* Stats grid skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
                <StatsCardSkeleton />
            </div>

            {/* Content grid skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <ChartSkeleton />
                </div>
                <CardSkeleton />
            </div>
        </div>
    );
}

/**
 * Inline loading skeleton (for replacing single elements)
 */
export function InlineSkeleton({ width = "100px", height = "1em" }) {
    return <Skeleton className="inline-block" style={{ width, height }} />;
}

export default PageSkeleton;
