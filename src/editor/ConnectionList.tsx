import { useMemo, useState } from 'react';
import { getDeviceDefinition } from '../devices/registry';
import { wireRows } from '../export/reports';
import type { Diagram } from '../model/diagram';

/** 図面全体の接続リスト（電線・ケーブルの一覧と、リンクの行き先） */
export function ConnectionList({ diagram, onSelectWire, onJump }: { diagram: Diagram; onSelectWire: (id: string) => void; onJump: (deviceId: string) => void }) {
  const [filter, setFilter] = useState('');
  const { rows, links } = useMemo(() => wireRows(diagram, getDeviceDefinition), [diagram]);

  const words = filter.trim().toLowerCase();
  const shown = words ? rows.filter((r) => `${r.wireNo} ${r.from} ${r.to} ${r.spec} ${r.note}`.toLowerCase().includes(words)) : rows;

  return (
    <div className="conn-list">
      <div className="conn-list__toolbar">
        <input type="search" placeholder="線番・機器・コメントで絞り込み" value={filter} onChange={(e) => setFilter(e.target.value)} />
        <span className="muted small">
          電線 {rows.length} 本{links.length ? `、リンク ${links.length} 組` : ''}
        </span>
      </div>
      <table className="conn-table">
        <thead>
          <tr>
            <th>シート</th>
            <th>線番</th>
            <th>接続元</th>
            <th>接続先</th>
            <th>電線</th>
            <th>コメント</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} onClick={() => onSelectWire(r.id)}>
              <td className="muted">{r.sheetName}</td>
              <td className="conn-table__no">{r.wireNo}</td>
              <td>{r.from}</td>
              <td>{r.to}</td>
              <td>
                {r.colorHex && <span className="conn-swatch" style={{ background: r.colorHex }} />}
                {r.spec}
              </td>
              <td className="muted">{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {links.length > 0 && (
        <div className="conn-links">
          <span className="muted small">リンク:</span>
          {links.map(({ name: n, places }) => (
            <span key={n} className={`conn-link${places.length < 2 ? ' is-alone' : ''}`}>
              <strong>{n || '（名前なし）'}</strong>
              {places.map((p) => (
                <button key={p.id} type="button" onClick={() => onJump(p.id)} title={`${p.id} へ移動`}>
                  {p.sheetName}
                </button>
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
