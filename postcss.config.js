// postcss.config.js
/**
 * @file postcss.config.js
 * @location cobot-plus-fyp/postcss.config.js
 * 
 * @description
 * PostCSS configuration for CSS processing pipeline.
 * PostCSS transforms CSS with JavaScript plugins during the build process.
 * 
 * @see https://postcss.org/
 */

module.exports = {
  plugins: {
    /**
     * TailwindCSS Plugin
     * Processes Tailwind directives (@tailwind, @apply, @layer)
     * and generates utility classes based on tailwind.config.js
     */
    tailwindcss: {},

    /**
     * Autoprefixer Plugin
     * Automatically adds vendor prefixes to CSS rules for browser compatibility.
     * Example: -webkit-transform, -moz-transform for older browsers.
     * Uses browserslist config from package.json or .browserslistrc
     */
    autoprefixer: {},
  },
};
