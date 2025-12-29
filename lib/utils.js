/**
 * @file utils.js
 * @location cobot-plus-fyp/lib/utils.js
 * 
 * @description
 * Utility functions for the CObot+ Attendance System.
 * Contains helper functions used across components.
 */

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

/**
 * Combines and merges CSS class names intelligently.
 * 
 * Uses clsx for conditional class handling and tailwind-merge
 * to deduplicate and resolve conflicting Tailwind classes.
 * 
 * @param {...(string|object|array)} inputs - Class names, objects, or arrays
 * @returns {string} Merged class string
 * 
 * @example
 * // Basic usage
 * cn("px-4 py-2", "bg-blue-500")
 * // => "px-4 py-2 bg-blue-500"
 * 
 * @example
 * // Conditional classes
 * cn("base-class", isActive && "active", { "disabled": isDisabled })
 * 
 * @example
 * // Conflict resolution (tailwind-merge removes duplicates)
 * cn("px-2 px-4") // => "px-4" (last one wins)
 * cn("bg-red-500 bg-blue-500") // => "bg-blue-500"
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
