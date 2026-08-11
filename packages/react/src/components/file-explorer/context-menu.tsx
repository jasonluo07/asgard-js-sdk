import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import styles from './context-menu.module.scss';

export interface ContextMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export interface ContextMenuProps {
  /** Desired left/top relative to the positioned ancestor; clamped within its bounds. */
  x: number;
  y: number;
  /** Grouped items; a separator renders between sections. */
  sections: ContextMenuItem[][];
  onClose: () => void;
}

/**
 * A container-scoped context menu (F-021 Cycle 2, mirrors the prototype `ContextMenu`): `role=menu` +
 * arrow-key navigation, Esc / outside-click / scroll / resize closes, danger items in `--asg-color-error`,
 * and it clamps within the offset parent (never `fixed` to the viewport). Honors reduced-motion.
 */
export function ContextMenu({ x, y, sections, onClose }: ContextMenuProps): ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const flat = sections.flat();
  const enabledIdx = flat.map((it, i) => (it.disabled ? -1 : i)).filter(i => i >= 0);
  const [active, setActive] = useState<number>(enabledIdx[0] ?? -1);
  const [pos, setPos] = useState<{ left: number; top: number }>({ left: x, top: y });

  // Clamp inside the offset parent so the menu never overflows the panel container.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.offsetParent as HTMLElement | null;
    if (!el || !parent) return;

    const menu = el.getBoundingClientRect();
    const bounds = parent.getBoundingClientRect();
    const left = Math.max(2, Math.min(x, bounds.width - menu.width - 2));
    const top = Math.max(2, Math.min(y, bounds.height - menu.height - 2));
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();

        return;
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const cur = enabledIdx.indexOf(active);
        const nextIdx = e.key === 'ArrowDown' ? cur + 1 : cur - 1;
        const wrapped = (nextIdx + enabledIdx.length) % enabledIdx.length;
        setActive(enabledIdx[wrapped] ?? -1);

        return;
      }

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const it = flat[active];
        if (it && !it.disabled) {
          it.onSelect();
          onClose();
        }
      }
    };

    const onPointerDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);

    return (): void => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [flat, active, enabledIdx, onClose]);

  let flatIdx = -1;

  return (
    <div ref={ref} className={styles.menu} role="menu" style={{ left: pos.left, top: pos.top }}>
      {sections.map((section, si) => (
        <div key={si} className={styles.section}>
          {si > 0 && <div className={styles.separator} role="separator" />}
          {section.map(it => {
            flatIdx += 1;
            const idx = flatIdx;

            return (
              <button
                key={it.key}
                type="button"
                role="menuitem"
                className={`${styles.item} ${it.danger ? styles.danger : ''} ${idx === active ? styles.active : ''}`}
                disabled={it.disabled}
                onMouseEnter={() => !it.disabled && setActive(idx)}
                onClick={() => {
                  it.onSelect();
                  onClose();
                }}
              >
                {it.icon && <span className={styles.itemIcon}>{it.icon}</span>}
                <span className={styles.itemLabel}>{it.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default ContextMenu;
