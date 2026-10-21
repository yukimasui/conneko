import { useMemo, useState } from 'react';
import { CIRCUIT_COLOR_RULES } from '../data/wires';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, TerminalDef } from '../devices/types';

const collator = new Intl.Collator('ja', { numeric: true });
import { addTerminalBlock, connectIo, disconnectIo, ioSystem, setComment, type IoPoint } from '../model/io';
import { sheetOf, sheetsOf, type Diagram, type TerminalRef } from '../model/diagram';
import { SIGNAL_NAMES } from './DeviceNode';

interface Props {
  diagram: Diagram;
  /** PLC の親（または装着したユニット）の機器ID */
  deviceId: string;
  onApply: (next: Diagram, message?: string) => void;
  onJump: (deviceId: string) => void;
  onClose: () => void;
}

/** I/O の電線（直流制御回路の色、0.75sq の KIV） */
const IO_WIRE = {
  color: CIRCUIT_COLOR_RULES.find((r) => r.circuit === 'dc-control')?.colors[0] ?? 'blue',
  sizeSq: 0.75,
  wireType: 'KIV',
};

/** 接続先の候補にしない機器の分類 */
const NOT_FIELD = new Set(['plc', 'terminal', 'link', 'power-source', 'breaker', 'power-supply']);

/**
 * I/O 点につなぐ端子の向き不向き（0 はつながない）。
 * 入力: センサーの出力線（3）、接点の端子（2）。主回路（一次側・二次側）や電源の端子は対象外。
 * 出力: 直流で受電する負荷の端子（コイル・表示灯など）。シンク出力（NPN）は 0V 側、ソース出力（PNP）は +V 側を優先する。
 */
function terminalScore(r: ReturnType<typeof resolveDevice>, t: TerminalDef, point: IoPoint): number {
  if (point.dir === 'in') {
    if (t.role !== 'signal') return 0;
    if (t.signal?.dir === 'out') return 3;
    return r.links.some((l) => (l.switch === 'NO' || l.switch === 'NC') && (l.from === t.id || l.to === t.id)) ? 2 : 1;
  }
  if (t.role !== 'input') return 0;
  const accepts = r.accepts.get(t.id) ?? [];
  if (!accepts.some((a) => a.system === 'DC')) return 0;
  const conductors = accepts.flatMap((a) => a.conductors ?? []);
  const want = point.kind === 'pnp' ? '+' : point.kind === 'npn' ? '-' : undefined;
  return want && conductors.length === 1 && conductors[0] === want ? 3 : 2;
}

/** 向いている端子を先に並べる（つながない端子は除く） */
function rankTerminals(
  def: DeviceDefinition,
  params: Record<string, number | string> | undefined,
  point: IoPoint,
  wired: (terminal: string) => boolean,
): { t: TerminalDef; score: number }[] {
  const r = resolveDevice(def, params);
  // すでに電線のつながっている端子は後ろへ（別の I/O と短絡しやすいため）
  return r.terminals
    .map((t) => {
      const score = terminalScore(r, t, point);
      return { t, score: score > 0 && wired(t.id) ? score - 1.5 : score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
}

function pointKind(p: IoPoint): string {
  const dir = p.dir === 'in' ? '入力' : '出力';
  return p.kind && p.kind !== 'dc' ? `${dir}（${SIGNAL_NAMES[p.kind] ?? p.kind}）` : dir;
}

/** I/O 点を現場の機器につなぐ行内のフォーム */
function ConnectForm({ diagram, point, family, onConnect, onCancel }: { diagram: Diagram; point: IoPoint; family: Set<string>; onConnect: (t: TerminalRef) => void; onCancel: () => void }) {
  const sheets = sheetsOf(diagram);
  const wiredSet = new Set(diagram.wires.flatMap((w) => [`${w.from.device}:${w.from.terminal}`, `${w.to.device}:${w.to.terminal}`]));
  const wiredOf = (id: string) => (terminal: string) => wiredSet.has(`${id}:${terminal}`);
  // つなげる端子のある機器を、向いている順に並べる
  const candidates = diagram.devices
    .map((d) => {
      const def = getDeviceDefinition(d.type);
      const best = def && !family.has(d.id) && !NOT_FIELD.has(def.category) ? rankTerminals(def, d.params, point, wiredOf(d.id))[0]?.score ?? 0 : 0;
      return { d, def: def!, best };
    })
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best);
  const [device, setDevice] = useState(candidates[0]?.d.id ?? '');
  const chosen = candidates.find((c) => c.d.id === device);
  const terminals = chosen ? rankTerminals(chosen.def, chosen.d.params, point, wiredOf(chosen.d.id)).map((x) => x.t) : [];
  const [terminal, setTerminal] = useState('');
  const t = terminals.find((x) => x.id === terminal) ?? terminals[0];

  if (!candidates.length) {
    return (
      <div className="io-connect">
        <span className="muted small">
          {point.dir === 'in' ? 'つなげる機器（センサー・スイッチ・接点など）' : 'つなげる負荷（リレー・接触器のコイル、表示灯など DC で動くもの）'}が図面にありません。先に機器を配置してください。
        </span>
        <button type="button" onClick={onCancel}>閉じる</button>
      </div>
    );
  }
  return (
    <div className="io-connect">
      <select value={device} onChange={(e) => { setDevice(e.target.value); setTerminal(''); }}>
        {sheets.map((s) => {
          const list = candidates.filter((c) => sheetOf(diagram, c.d) === s.id);
          return list.length ? (
            <optgroup key={s.id} label={s.name}>
              {list.map((c) => (
                <option key={c.d.id} value={c.d.id}>
                  {c.d.id}（{c.def.name} {c.def.model}）
                </option>
              ))}
            </optgroup>
          ) : null;
        })}
      </select>
      <select value={t?.id ?? ''} onChange={(e) => setTerminal(e.target.value)}>
        {terminals.map((x) => (
          <option key={x.id} value={x.id}>
            {x.id}
            {x.label && x.label !== x.id ? `（${x.label}）` : ''}
            {x.signal ? ` ${SIGNAL_NAMES[x.signal.kind]}` : ''}
            {wiredOf(device)(x.id) ? '（配線済み）' : ''}
          </option>
        ))}
      </select>
      <button type="button" className="primary" disabled={!t} onClick={() => t && onConnect({ device, terminal: t.id })}>
        接続
      </button>
      <button type="button" onClick={onCancel}>取消</button>
    </div>
  );
}

/** PLC の I/O 割付と、I/O と現場の機器の接続を編集するダイアログ */
export function IoDialog({ diagram, deviceId, onApply, onJump, onClose }: Props) {
  const system = useMemo(() => ioSystem(diagram, deviceId, getDeviceDefinition), [diagram, deviceId]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);

  if (!system || !system.units.length) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <h2>I/O 割付</h2>
          <p className="muted">この機器には入出力がありません。</p>
          <div className="modal__actions">
            <button type="button" className="primary" onClick={onClose}>閉じる</button>
          </div>
        </div>
      </div>
    );
  }
  const hostDef = getDeviceDefinition(system.host.type);
  const family = new Set([system.host.id, ...system.units.map((u) => u.device.id)]);
  const unit = system.units.find((u) => u.device.id === unitId) ?? system.units.find((u) => u.device.id === deviceId) ?? system.units[0];
  const words = filter.trim().toLowerCase();
  const rows = [...unit.points].sort((a, b) => collator.compare(a.address, b.address)).filter(
    (p) => (!onlyFree || !p.connections.length) && (!words || `${p.address} ${p.label} ${p.comment} ${p.connections.map((c) => c.name).join(' ')}`.toLowerCase().includes(words)),
  );
  const pointKey = (p: IoPoint) => `${p.device}:${p.terminal}`;
  const range = (u: (typeof system.units)[number]) => {
    const ins = u.points.filter((p) => p.dir === 'in');
    const outs = u.points.filter((p) => p.dir === 'out');
    return [ins.length && `入力 ${ins[0].address}〜${ins[ins.length - 1].address}`, outs.length && `出力 ${outs[0].address}〜${outs[outs.length - 1].address}`].filter(Boolean).join('、');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal io-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="io-dialog__head">
          <h2>
            I/O 割付 — {system.host.id}
            <span className="muted">（{hostDef?.model}）</span>
          </h2>
          <button type="button" className="io-dialog__close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="io-dialog__body">
          <nav className="io-units">
            {system.units.map((u) => {
              const used = u.points.filter((p) => p.connections.length).length;
              return (
                <button key={u.device.id} type="button" className={`io-unit${u === unit ? ' is-active' : ''}`} onClick={() => setUnitId(u.device.id)}>
                  <strong>{u.device.id}</strong> <span className="muted">{u.def.model}</span>
                  <span className="io-unit__range">{range(u)}</span>
                  <span className="io-unit__used">
                    接続 {used} / {u.points.length}
                  </span>
                </button>
              );
            })}
          </nav>
          <section className="io-table-wrap">
            <div className="io-toolbar">
              <input type="search" placeholder="番号・コメント・接続先で絞り込み" value={filter} onChange={(e) => setFilter(e.target.value)} />
              <label className="muted small">
                <input type="checkbox" checked={onlyFree} onChange={(e) => setOnlyFree(e.target.checked)} /> 未接続だけ
              </label>
            </div>
            {unit.bareConnectors.map((c) => (
              <div key={c} className="io-banner">
                <span>
                  {unit.device.id} の {c} に変換端子台がつながっていないため、電線をつなげません。
                </span>
                <button
                  type="button"
                  className="primary"
                  onClick={() => onApply(addTerminalBlock(diagram, unit.device.id, c, deviceDefinitions, getDeviceDefinition), `${unit.device.id} の ${c} に変換端子台を追加しました`)}
                >
                  変換端子台を追加
                </button>
              </div>
            ))}
            <table className="io-table">
              <thead>
                <tr>
                  <th>番号</th>
                  <th>種類</th>
                  <th>コメント</th>
                  <th>接続先</th>
                  <th>経由</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={pointKey(p)} className={p.dir === 'in' ? 'is-in' : 'is-out'}>
                    <td className="io-address" title={p.label}>
                      {p.address}
                    </td>
                    <td className="muted small">{pointKind(p)}</td>
                    <td>
                      <input
                        key={`${pointKey(p)}:${p.comment}`}
                        className="io-comment"
                        defaultValue={p.comment}
                        placeholder="コメント"
                        onBlur={(e) => e.target.value !== p.comment && onApply(setComment(diagram, p.device, p.terminal, e.target.value))}
                        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      />
                    </td>
                    <td>
                      <div className="io-conns">
                        {p.connections.map((c) => (
                          <span key={c.name} className="io-chip" title={`${c.label ?? ''} シート: ${sheetsOf(diagram).find((s) => s.id === c.sheet)?.name ?? ''}`}>
                            <button type="button" className="io-chip__name" onClick={() => onJump(c.ref.device)}>
                              {c.name}
                            </button>
                            <button
                              type="button"
                              className="io-chip__x"
                              title="接続を外す"
                              onClick={() => onApply(disconnectIo(diagram, p, c.ref, getDeviceDefinition), `${p.address} と ${c.name} の接続を外しました`)}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                        {connecting === pointKey(p) ? (
                          <ConnectForm
                            diagram={diagram}
                            point={p}
                            family={family}
                            onCancel={() => setConnecting(null)}
                            onConnect={(t) => {
                              setConnecting(null);
                              onApply(connectIo(diagram, p, t, IO_WIRE, getDeviceDefinition), `${p.address} を ${t.device}.${t.terminal} につなぎました`);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="io-add"
                            disabled={!p.endpoint}
                            title={p.endpoint ? '現場の機器につなぐ' : '先に変換端子台を追加してください'}
                            onClick={() => setConnecting(pointKey(p))}
                          >
                            ＋接続
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="muted small">{p.via.join('・')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="muted small">該当する I/O はありません</p>}
          </section>
        </div>
        <p className="muted small io-dialog__foot">
          接続すると、線番を入出力番号にした電線を引きます。別のシートの機器へは、入出力番号を名前にしたリンクを両方のシートに置いてつなぎます。
        </p>
      </div>
    </div>
  );
}
