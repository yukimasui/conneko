import { useState } from 'react';
import type { Severity } from '../check/checkDiagram';
import type { Sheet } from '../model/diagram';
import { ContextMenu } from './ContextMenu';

interface Props {
  sheets: Sheet[];
  current: string;
  /** シートID → 機器の数 */
  counts: Map<string, number>;
  /** シートID → 最も重い指摘 */
  severity: Map<string, Severity>;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
}

/** キャンバス上部のシートのタブ（ダブルクリックで名前の変更、右クリックでメニュー） */
export function SheetTabs(props: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);
  const index = (id: string) => props.sheets.findIndex((s) => s.id === id);

  return (
    <div className="sheet-tabs" role="tablist">
      {props.sheets.map((s, i) => (
        <div
          key={s.id}
          role="tab"
          aria-selected={s.id === props.current}
          className={`sheet-tab${s.id === props.current ? ' is-active' : ''}`}
          onClick={() => props.onSelect(s.id)}
          onDoubleClick={() => setEditing(s.id)}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, id: s.id });
          }}
          title="ダブルクリックで名前を変更、右クリックでメニュー"
        >
          <span className="sheet-tab__no">{i + 1}</span>
          {editing === s.id ? (
            <input
              className="sheet-tab__input"
              defaultValue={s.name}
              autoFocus
              onFocus={(e) => e.target.select()}
              onBlur={(e) => {
                if (e.target.value.trim()) props.onRename(s.id, e.target.value.trim());
                setEditing(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditing(null);
              }}
            />
          ) : (
            <span className="sheet-tab__name">{s.name}</span>
          )}
          <span className="sheet-tab__count">{props.counts.get(s.id) ?? 0}</span>
          {props.severity.get(s.id) && <span className={`sheet-tab__dot sev-${props.severity.get(s.id)}`} />}
        </div>
      ))}
      <button type="button" className="sheet-tabs__add" onClick={props.onAdd} title="シートを追加">
        ＋
      </button>
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={[
            { label: '名前を変更', onClick: () => setEditing(menu.id) },
            { label: '左へ移動', disabled: index(menu.id) === 0, onClick: () => props.onMove(menu.id, -1) },
            { label: '右へ移動', disabled: index(menu.id) === props.sheets.length - 1, onClick: () => props.onMove(menu.id, 1) },
            { label: 'シートを削除', danger: true, separator: true, disabled: props.sheets.length <= 1, onClick: () => props.onDelete(menu.id) },
          ]}
        />
      )}
    </div>
  );
}
