/**
 * 顏色工具函數
 */

/**
 * 為顏色添加透明度
 * @param color 十六進制顏色值 (例如: #FF0000)
 * @param alpha 透明度 (0-1)
 * @returns 帶透明度的十六進制顏色值
 */
export const addTransparency = (color: string, alpha: number): string => {
  if (!color.startsWith('#')) return color;
  
  const hex = Math.round(alpha * 255).toString(16).padStart(2, '0');

  return `${color}${hex}`;
};

/**
 * 加深顏色
 * @param color 十六進制顏色值 (例如: #FF0000)
 * @param amount 加深程度 (0-1)
 * @returns 加深後的十六進制顏色值
 */
export const darkenColor = (color: string, amount: number): string => {
  if (!color.startsWith('#')) return color;
  
  const hex = color.slice(1);
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  
  const newR = Math.max(0, Math.round(r * (1 - amount)));
  const newG = Math.max(0, Math.round(g * (1 - amount)));
  const newB = Math.max(0, Math.round(b * (1 - amount)));
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};