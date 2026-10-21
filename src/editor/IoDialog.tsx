import { useMemo, useState } from 'react';
import { CIRCUIT_COLOR_RULES } from '../data/wires';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, TerminalDef } from '../devices/types';

const collator = new Intl.Collator('ja', { numeric: true });
import { addTerminalBlock, connectIo, disconnectIo, ioSystem, setComment, swapIo, type IoPoint } from '../model/io';
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

/** 機器の端子をパッチボードから I/O の行へドラッグするときのデータの種類 */
const TERMINAL_MIME = 'application/x-conneko-terminal';
/** I/O の番号を別の I/O の行へドラッグして入れ替えるときのデータの種類 */
const IO_MIME = 'application/x-conneko-io';

interface FieldTerminal {
  ref: TerminalRef;
  label: string;
  kind: string;
  wired: boolean;
}

interface FieldDevice {
  id: string;
  name: string;
  note?: string;
  sheet: string;
  terminals: FieldTerminal[];
}

/** パッチボードに並べる、I/O につなげる現場の機器の端子（入力用・出力用） */
function fieldDevices(diagram: Diagram, family: Set<string>, sample: IoPoint, wired: (dev: string, t: string) => boolean): FieldDevice[] {
  const out: FieldDevice[] = [];
  for (const d of diagram.devices) {
    const def = getDeviceDefinition(d.type);
    if (!def || family.has(d.id) || NOT_FIELD.has(def.category)) continue;
    const r = resolveDevice(def, d.params);
    const terminals = r.terminals
      .map((t) => ({ t, score: terminalScore(r, t, sample) }))
      .filter((x) => x.score >= 2)
      .map(({ t }) => ({
        ref: { device: d.id, terminal: t.id },
        label: t.label && t.label !== t.id ? `${t.id}（${t.label}）` : t.id,
        kind: t.signal ? SIGNAL_NAMES[t.signal.kind] ?? '' : t.role === 'input' ? '負荷' : '接点',
        wired: wired(d.id, t.id),
      }));
    if (terminals.length) out.push({ id: d.id, name: `${def.name} ${def.model}`, ...(d.note ? { note: d.note } : {}), sheet: sheetOf(diagram, d), terminals });
  }
  return out;
}

/** 現場の機器の端子の一覧（ドラッグして I/O の行に落とす、またはクリックしてから行をクリックしてつなぐ） */
function PatchBoard({
  diagram,
  devices,
  picked,
  onPick,
}: {
  diagram: Diagram;
  devices: FieldDevice[];
  picked: TerminalRef | null;
  onPick: (t: TerminalRef | null) => void;
}) {
  const [showWired, setShowWired] = useState(false);
  const sheets = sheetsOf(diagram);
  const list = devices.map((d) => ({ ...d, terminals: d.terminals.filter((t) => showWired || !t.wired) })).filter((d) => d.terminals.length);
  const isPicked = (t: TerminalRef) => picked?.device === t.device && picked.terminal === t.terminal;
  return (
    <aside className="io-patch">
      <div className="io-patch__head">
        <strong>つなげる機器</strong>
        <label className="muted small">
          <input type="checkbox" checked={showWired} onChange={(e) => setShowWired(e.target.checked)} /> 配線済みも表示
        </label>
      </div>
      <p className="muted small io-patch__hint">端子を左の I/O の行へドラッグ（またはクリックしてから行をクリック）してつなぎます。</p>
      <div className="io-patch__list">
        {list.map((d) => (
          <div key={d.id} className="io-patch__device">
            <div className="io-patch__name">
              <strong>{d.id}</strong> <span className="muted">{d.name}</span>
              <span className="io-patch__sheet">{sheets.find((s) => s.id === d.sheet)?.name}</span>
              {d.note && <div className="io-patch__note">{d.note}</div>}
            </div>
            {d.terminals.map((t) => (
              <button
                key={t.ref.terminal}
                type="button"
                draggable
                className={`io-patch__terminal${isPicked(t.ref) ? ' is-picked' : ''}${t.wired ? ' is-wired' : ''}`}
                onDragStart={(e) => {
                  e.dataTransfer.setData(TERMINAL_MIME, JSON.stringify(t.ref));
                  e.dataTransfer.effectAllowed = 'link';
                }}
                onClick={() => onPick(isPicked(t.ref) ? null : t.ref)}
                title={t.wired ? 'すでに電線がつながっています' : undefined}
              >
                <span>{t.label}</span>
                <span className="muted">{t.kind}</span>
              </button>
            ))}
          </div>
        ))}
        {!list.length && <p className="muted small">つなげる機器がありません。キャンバスにセンサー・スイッチ・負荷などを置いてください。</p>}
      </div>
    </aside>
  );
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

/** PLC の I/O 割付と、I/O と現場の機器の接続の編集（PLC エディタの「I/O 割付」タブ） */
export function IoEditor({ diagram, deviceId, onApply, onJump }: Omit<Props, 'onClose'>) {
  const system = useMemo(() => ioSystem(diagram, deviceId, getDeviceDefinition), [diagram, deviceId]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [onlyFree, setOnlyFree] = useState(false);
  const [picked, setPicked] = useState<TerminalRef | null>(null);
  const [dropRow, setDropRow] = useState<string | null>(null);
  /** 番号をドラッグして入れ替えようとしている I/O 点 */
  const [dragging, setDragging] = useState<IoPoint | null>(null);

  if (!system || !system.units.length) {
    return <p className="muted plc-empty">入出力のあるユニットがありません。「ユニット構成」タブでユニットを追加してください。</p>;
  }
  const family = new Set([system.host.id, ...system.units.map((u) => u.device.id)]);
  const unit = system.units.find((u) => u.device.id === unitId) ?? system.units.find((u) => u.device.id === deviceId) ?? system.units[0];
  const words = filter.trim().toLowerCase();
  const rows = [...unit.points].sort((a, b) => collator.compare(a.address, b.address)).filter(
    (p) => (!onlyFree || !p.connections.length) && (!words || `${p.address} ${p.label} ${p.comment} ${p.connections.map((c) => c.name).join(' ')}`.toLowerCase().includes(words)),
  );
  const pointKey = (p: IoPoint) => `${p.device}:${p.terminal}`;
  const connect = (p: IoPoint, t: TerminalRef) => {
    setPicked(null);
    setConnecting(null);
    onApply(connectIo(diagram, p, t, IO_WIRE, getDeviceDefinition), `${p.address} を ${t.device}.${t.terminal} につなぎました`);
  };
  const wiredSet = new Set(diagram.wires.flatMap((w) => [`${w.from.device}:${w.from.terminal}`, `${w.to.device}:${w.to.terminal}`]));
  // パッチボードは、このユニットの I/O（入力が多ければ入力）に向く端子を並べる
  const sample = unit.points.find((p) => p.dir === (unit.points.filter((x) => x.dir === 'in').length >= unit.points.length / 2 ? 'in' : 'out')) ?? unit.points[0];
  const field = sample ? fieldDevices(diagram, family, sample, (dev, t) => wiredSet.has(`${dev}:${t}`)) : [];
  const range = (u: (typeof system.units)[number]) => {
    const ins = u.points.filter((p) => p.dir === 'in');
    const outs = u.points.filter((p) => p.dir === 'out');
    return [ins.length && `入力 ${ins[0].address}〜${ins[ins.length - 1].address}`, outs.length && `出力 ${outs[0].address}〜${outs[outs.length - 1].address}`].filter(Boolean).join('、');
  };

  return (
    <>
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
                  <tr
                    key={pointKey(p)}
                    className={`${p.dir === 'in' ? 'is-in' : 'is-out'}${dropRow === pointKey(p) ? ' is-drop' : ''}${picked && p.endpoint ? ' is-pickable' : ''}${dragging && pointKey(dragging) === pointKey(p) ? ' is-swap' : ''}`}
                    onDragOver={(e) => {
                      if (!p.endpoint) return;
                      // 機器の端子（パッチボードから）、または同じ向きの別の I/O の番号（入れ替え）を受け付ける
                      const swap = e.dataTransfer.types.includes(IO_MIME) && dragging && dragging.dir === p.dir && pointKey(dragging) !== pointKey(p);
                      if (!e.dataTransfer.types.includes(TERMINAL_MIME) && !swap) return;
                      e.preventDefault();
                      setDropRow(pointKey(p));
                    }}
                    onDragLeave={() => setDropRow((r) => (r === pointKey(p) ? null : r))}
                    onDrop={(e) => {
                      setDropRow(null);
                      const raw = e.dataTransfer.getData(TERMINAL_MIME);
                      if (raw && p.endpoint) return connect(p, JSON.parse(raw) as TerminalRef);
                      const from = dragging;
                      setDragging(null);
                      if (from && e.dataTransfer.getData(IO_MIME) && p.endpoint) {
                        onApply(swapIo(diagram, from, p, getDeviceDefinition), `${from.address} と ${p.address} を入れ替えました`);
                      }
                    }}
                    onClick={(e) => {
                      if (!picked || !p.endpoint || (e.target as Element).closest('input,button,select')) return;
                      connect(p, picked);
                    }}
                  >
                    <td
                      className={`io-address${p.endpoint ? ' is-draggable' : ''}`}
                      title={p.endpoint ? `${p.label}（ドラッグしてほかの番号に落とすと入れ替え）` : p.label}
                      draggable={!!p.endpoint}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(IO_MIME, pointKey(p));
                        e.dataTransfer.effectAllowed = 'move';
                        setDragging(p);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropRow(null);
                      }}
                    >
                      <span className="io-address__grip">⠿</span>
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
                            onConnect={(t) => connect(p, t)}
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
          <PatchBoard diagram={diagram} devices={field} picked={picked} onPick={setPicked} />
        </div>
        <p className="muted small io-dialog__foot">
          接続すると、線番を入出力番号にした電線を引きます。別のシートの機器へは、入出力番号を名前にしたリンクを両方のシートに置いてつなぎます。
          番号をドラッグしてほかの番号の行に落とすと、接続先・コメントを入れ替えます。
        </p>
    </>
  );
}
