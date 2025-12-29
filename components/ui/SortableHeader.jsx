/**
 * @file SortableHeader.jsx
 * @description Reusable sortable table header component
 */

import React from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

/**
 * Sortable table header cell - Memoized to prevent re-renders
 * @param {Object} props
 * @param {string} props.label - Column header text
 * @param {string} props.sortKey - Key to sort by
 * @param {Object} props.sortConfig - { key: string, direction: 'asc' | 'desc' }
 * @param {Function} props.onSort - Called with sortKey when clicked
 * @param {string} props.className - Additional CSS classes
 */
export const SortableHeader = React.memo(function SortableHeader({
    label,
    sortKey,
    sortConfig,
    onSort,
    className = ""
}) {
    const isActive = sortConfig?.key === sortKey;
    const direction = isActive ? sortConfig.direction : null;

    return (
        <th
            className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
                <span>{label}</span>
                <span className="text-slate-400">
                    {!isActive && <ChevronsUpDown className="w-3 h-3" />}
                    {isActive && direction === "asc" && <ChevronUp className="w-3 h-3 text-teal-600" />}
                    {isActive && direction === "desc" && <ChevronDown className="w-3 h-3 text-teal-600" />}
                </span>
            </div>
        </th>
    );
});

/**
 * Hook to manage sort state with performance optimizations
 */
export function useSortableData(items, defaultConfig = null) {
    const [sortConfig, setSortConfig] = React.useState(defaultConfig);

    const sortedItems = React.useMemo(() => {
        if (!items || !sortConfig?.key) return items;

        const sorted = [...items].sort((a, b) => {
            let aVal = a[sortConfig.key];
            let bVal = b[sortConfig.key];

            // Handle nested properties (e.g., "courses.name")
            if (sortConfig.key.includes(".")) {
                const keys = sortConfig.key.split(".");
                aVal = keys.reduce((obj, key) => obj?.[key], a);
                bVal = keys.reduce((obj, key) => obj?.[key], b);
            }

            // Handle null/undefined
            if (aVal == null) return sortConfig.direction === "asc" ? 1 : -1;
            if (bVal == null) return sortConfig.direction === "asc" ? -1 : 1;

            // Handle numbers
            if (typeof aVal === "number" && typeof bVal === "number") {
                return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
            }

            // Handle strings
            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();

            if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
            if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
            return 0;
        });

        return sorted;
    }, [items, sortConfig]);

    // useCallback to prevent re-renders of memoized child components
    const requestSort = React.useCallback((key) => {
        setSortConfig(prev => {
            const direction = prev?.key === key && prev.direction === "asc" ? "desc" : "asc";
            return { key, direction };
        });
    }, []);

    return { sortedItems, sortConfig, requestSort };
}

export default SortableHeader;
