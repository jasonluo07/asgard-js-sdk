/**
 * Darkens a color by a given percentage
 * @param color - Hex color string (e.g., "#640000")
 * @param percentage - Percentage to darken (e.g., 0.2 for 20%)
 * @returns Darkened hex color string
 */
export function darkenColor(color: string, percentage: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Apply darkening (multiply by 1 - percentage)
  const factor = 1 - percentage;
  const newR = Math.round(r * factor);
  const newG = Math.round(g * factor);
  const newB = Math.round(b * factor);
  
  // Convert back to hex
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}

/**
 * Lightens a color by mixing with white
 * @param color - Hex color string (e.g., "#640000")
 * @param percentage - Percentage to lighten (e.g., 0.8 for 20% original, 80% white)
 * @returns Lightened hex color string
 */
export function lightenColor(color: string, percentage: number): string {
  // Remove # if present
  const hex = color.replace('#', '');
  
  // Parse RGB values
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  // Mix with white: original + (255 - original) * percentage
  const newR = Math.round(r + (255 - r) * percentage);
  const newG = Math.round(g + (255 - g) * percentage);
  const newB = Math.round(b + (255 - b) * percentage);
  
  // Convert back to hex
  const toHex = (n: number): string => n.toString(16).padStart(2, '0');
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}