/* eslint-disable @typescript-eslint/explicit-function-return-type */

/**
 * Custom plugin to unwrap @layer directives for library distribution.
 * This plugin is necessary because Tailwind CSS v4 generates @layer directives
 * that are not compatible with environments without Tailwind (e.g., Docusaurus).
 */
const unwrapLayers = () => {
  return {
    postcssPlugin: 'unwrap-layers',
    /**
     * Process CSS root and unwrap all @layer directives
     * @type {(root: any) => void}
     */
    Once: (root) => {
      root.walkAtRules('layer', (rule) => {
        // Replace @layer with its contents
        rule.replaceWith(rule.nodes);
      });
    },
  };
};

unwrapLayers.postcss = true;

module.exports = {
  plugins: [unwrapLayers],
};
