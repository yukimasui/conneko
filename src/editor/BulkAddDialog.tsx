import { useMemo, useState } from 'react';
import { autoLayout } from '../schematic/autoLayout';
import type { SchematicBuild } from '../schematic/layout';
import { paperOf, type Schematic } from '../schematic/model';

interface Props {
  build: SchematicBuild;
  schematic: Schematic;
  sheetId: string;
  onAdd: (next: Schematic, message: string) => void;
  onClose: () => void;
}

/**
 * まとめて追加（展開図）: シートの母線（制御回路）・一次電源（主回路）につながる、まだ置いていない段・系統の一覧を出し、
 * 選んだものを自動配置と同じ並べ方でまとめて置く
 */
export function BulkAddDialog({ build, schematic, sheetId, onAdd, onClose }: Props) {
  const sheet = schematic.sheets.find((s) => s.id === sheetId);
  const paper = paperOf(schematic, sheet);
  // 全部を置いたときの段・系統の一覧（置く単位ごとの要素）
  const all = useMemo(() => autoLayout(build, schematic, sheetId, paper), [build, schematic, sheetId, paper]);
  const [off, setOff] = useState<Set<string>>(new Set());
  const chosen = all.groups.filter((g) => !off.has(g.key));
  const count = chosen.reduce((n, g) => n + g.elements.length, 0);
  const control = !!sheet?.rails?.supply;
  const railLabel = (ref?: string) => (ref ? (build.railCandidates.find((c) => c.ref === ref)?.label ?? ref) : '');
  const name = (id: string) => {
    const e = build.byId.get(id);
    return e ? `${e.device} ${e.element.name}` : id;
  };
  const toggle = (key: string) =>
    setOff((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bulk-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>まとめて追加</h2>
        {!sheet || sheet.kind ? (
          <p className="bulk-dialog__empty">このシートは内容を自動で作るシートです。制御回路・主回路のシートで使ってください。</p>
        ) : (
          <>
            <p className="muted small">
              {control
                ? `母線 ${railLabel(sheet.rails?.supply)}${sheet.rails?.common ? ` 〜 ${railLabel(sheet.rails.common)}` : ''} につながる、まだ置いていない段の一覧です。`
                : '一次電源・遮断器から続く、まだ置いていない主回路の系統の一覧です。'}
              選んだものを「自動で並べる」と同じ並べ方で置きます。置いた記号は動かしません。
            </p>
            {all.groups.length === 0 ? (
              <p className="bulk-dialog__empty">{all.message ?? '追加できる段がありません。'}</p>
            ) : (
              <>
                <div className="bulk-dialog__dir">
                  <span className="small muted">{all.groups.length} 件</span>
                  <button type="button" onClick={() => setOff(new Set())}>
                    すべて選ぶ
                  </button>
                  <button type="button" onClick={() => setOff(new Set(all.groups.map((g) => g.key)))}>
                    すべて外す
                  </button>
                </div>
                <table className="bulk-dialog__table">
                  <thead>
                    <tr>
                      <th />
                      <th>{control ? '段（行き着く記号）' : '系統（起点）'}</th>
                      <th>置く記号</th>
                    </tr>
                  </thead>
                  <tbody>
                    {all.groups.map((g) => (
                      <tr key={g.key} className={off.has(g.key) ? 'is-off' : ''}>
                        <td>
                          <input type="checkbox" aria-label={`${name(g.key)} を追加する`} checked={!off.has(g.key)} onChange={() => toggle(g.key)} />
                        </td>
                        <td>{name(g.key)}</td>
                        <td className="bulk-dialog__wrap">
                          {g.elements
                            .filter((id) => id !== g.key)
                            .map(name)
                            .join('、') || <span className="muted">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="primary"
            disabled={!chosen.length}
            onClick={() => {
              const r = autoLayout(build, schematic, sheetId, paper, new Set(chosen.map((g) => g.key)));
              onAdd(r.schematic, `${r.placed} 個の記号を追加しました（元に戻す: Ctrl+Z）`);
            }}
          >
            {chosen.length} 件（{count} 個の記号）を追加
          </button>
        </div>
      </div>
    </div>
  );
}
