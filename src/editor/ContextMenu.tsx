import { useEffect, useRef, useState } from 'react';

export interface MenuItem {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** 右に出す補足（ショートカットなど） */
  hint?: string;
  /** サブメニュー */
  children?: MenuItem[];
  /** この項目の前に区切り線を入れる */
  separator?: boolean;
}

/** 右クリックメニュー。画面外にはみ出さないよう位置を調整し、外側のクリックや Esc で閉じる */
export function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x, y });
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ x: Math.min(x, window.innerWidth - r.width - 8), y: Math.min(y, window.innerHeight - r.height - 8) });
    }
    // キャンバスはマウスのイベントを止めるため、取り込み（capture）で外側のクリックを拾う
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('wheel', onClose, true);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('wheel', onClose, true);
      window.removeEventListener('keydown', key);
    };
  }, [x, y, onClose]);

  return (
    <div ref={ref} className="context-menu" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((item, i) => (
        <div key={i} className="context-menu__row" onMouseEnter={() => setOpen(item.children ? i : null)}>
          {item.separator && <div className="context-menu__sep" />}
          <button
            type="button"
            className={`context-menu__item${item.danger ? ' is-danger' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              if (item.children) return setOpen(i);
              item.onClick?.();
              onClose();
            }}
          >
            <span>{item.label}</span>
            {item.hint && <span className="context-menu__hint">{item.hint}</span>}
            {item.children && <span className="context-menu__hint">▸</span>}
          </button>
          {item.children && open === i && (
            <div className="context-menu context-menu--sub">
              {item.children.map((c, j) => (
                <button
                  key={j}
                  type="button"
                  className="context-menu__item"
                  disabled={c.disabled}
                  onClick={() => {
                    c.onClick?.();
                    onClose();
                  }}
                >
                  <span>{c.label}</span>
                  {c.hint && <span className="context-menu__hint">{c.hint}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
