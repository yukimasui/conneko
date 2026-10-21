import { useMemo, useState } from 'react';
import { buildModel, key } from '../check/model';
import { getWireColor } from '../data/wires';
import { getDeviceDefinition } from '../devices/registry';
import { CABLE_WIRE_TYPE, sheetOf, sheetsOf, type Diagram, type TerminalRef } from '../model/diagram';
import { LINK_TYPE } from '../model/ops';

interface Row {
  id: string;
  sheet: string;
  sheetIndex: number;
  wireNo: string;
  from: string;
  to: string;
  spec: string;
  color?: string;
  note: string;
}

const collator = new Intl.Collator('ja', { numeric: true });

/** 図面全体の接続リスト（電線・ケーブルの一覧と、リンクの行き先） */
export function ConnectionList({ diagram, onSelectWire, onJump }: { diagram: Diagram; onSelectWire: (id: string) => void; onJump: (deviceId: string) => void }) {
  const [filter, setFilter] = useState('');
  const sheets = sheetsOf(diagram);

  const { rows, links } = useMemo(() => {
    const m = buildModel(diagram, getDeviceDefinition, () => {});
    const devices = new Map(diagram.devices.map((d) => [d.id, d]));
    const name = (r: TerminalRef) => {
      const d = devices.get(r.device);
      if (d?.type === LINK_TYPE) return `リンク「${String(d.params?.name ?? '')}」`;
      const t = m.terminals.get(key(r.device, r.terminal))?.terminal;
      return `${r.device}.${r.terminal}${t?.label && t.label !== r.terminal ? `（${t.label}）` : ''}`;
    };
    // ネット（常時導通の範囲）にある I/O コメント
    const commentOf = (r: TerminalRef) => {
      const notes = new Set<string>();
      for (const k of m.fixedMembers.get(m.fixed.find(key(r.device, r.terminal))) ?? []) {
        const [dev, term] = [k.slice(0, k.indexOf(':')), k.slice(k.indexOf(':') + 1)];
        const c = devices.get(dev)?.comments?.[term];
        if (c) notes.add(c);
      }
      return [...notes].join(' / ');
    };
    const rows: Row[] = diagram.wires.map((w) => {
      const dev = devices.get(w.from.device);
      const sheet = dev ? sheetOf(diagram, dev) : sheets[0].id;
      const cable = w.wireType === CABLE_WIRE_TYPE;
      return {
        id: w.id,
        sheet,
        sheetIndex: sheets.findIndex((s) => s.id === sheet),
        wireNo: w.wireNo ?? '',
        from: name(w.from),
        to: name(w.to),
        spec: cable ? 'ケーブル' : `${w.wireType} ${w.sizeSq}sq ${getWireColor(w.color)?.name ?? w.color}`,
        ...(cable ? {} : { color: getWireColor(w.color)?.hex }),
        note: cable ? '' : commentOf(w.from),
      };
    });
    rows.sort((a, b) => a.sheetIndex - b.sheetIndex || collator.compare(a.wireNo || '~', b.wireNo || '~') || collator.compare(a.id, b.id));
    const byName = new Map<string, { id: string; sheet: string }[]>();
    for (const d of diagram.devices) {
      if (d.type !== LINK_TYPE) continue;
      const n = String(d.params?.name ?? '').trim();
      byName.set(n, [...(byName.get(n) ?? []), { id: d.id, sheet: sheetOf(diagram, d) }]);
    }
    const links = [...byName].sort((a, b) => collator.compare(a[0], b[0]));
    return { rows, links };
  }, [diagram, sheets]);

  const words = filter.trim().toLowerCase();
  const shown = words ? rows.filter((r) => `${r.wireNo} ${r.from} ${r.to} ${r.spec} ${r.note}`.toLowerCase().includes(words)) : rows;
  const sheetName = (id: string) => sheets.find((s) => s.id === id)?.name ?? id;

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
              <td className="muted">{sheetName(r.sheet)}</td>
              <td className="conn-table__no">{r.wireNo}</td>
              <td>{r.from}</td>
              <td>{r.to}</td>
              <td>
                {r.color && <span className="conn-swatch" style={{ background: r.color }} />}
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
          {links.map(([n, places]) => (
            <span key={n} className={`conn-link${places.length < 2 ? ' is-alone' : ''}`}>
              <strong>{n || '（名前なし）'}</strong>
              {places.map((p) => (
                <button key={p.id} type="button" onClick={() => onJump(p.id)} title={`${p.id} へ移動`}>
                  {sheetName(p.sheet)}
                </button>
              ))}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
