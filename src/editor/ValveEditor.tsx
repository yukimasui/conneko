import { useMemo, useState } from 'react';
import { CIRCUIT_COLOR_RULES } from '../data/wires';
import { deviceDefinitions, getDeviceDefinition, instantiateSvg } from '../devices/registry';
import type { DeviceDefinition, ParamValues } from '../devices/types';
import { computeBus, effectiveParams } from '../model/bus';
import type { Diagram, DiagramDevice, TerminalRef } from '../model/diagram';
import type { IoPoint } from '../model/io';
import {
  addStation,
  airTargets,
  changeStationType,
  manifoldOf,
  manifoldRows,
  manifoldSummary,
  plcOutputs,
  setAllPorts,
  setPortTarget,
  setSolenoidOutput,
  stationTypes,
  type SolenoidRow,
  type StationRow,
} from '../model/manifold';
import { freeUnits, mountUnit, moveUnit, removeUnit, unmountUnit } from '../model/plc';

interface Props {
  diagram: Diagram;
  /** マニホールド（または装着した連）の機器ID */
  deviceId: string;
  onApply: (next: Diagram, message?: string) => void;
  onJump: (deviceId: string) => void;
  onClose: () => void;
}

/** ソレノイドの電線（直流制御回路の色、0.75sq の KIV。I/O の接続と同じ） */
const SOL_WIRE = {
  color: CIRCUIT_COLOR_RULES.find((r) => r.circuit === 'dc-control')?.colors[0] ?? 'blue',
  sizeSq: 0.75,
  wireType: 'KIV',
};

const STATION_MIME = 'application/x-conneko-station';
const refKey = (r: TerminalRef) => `${r.device}:${r.terminal}`;
/** 機種の短い呼び名（「電磁弁（シングルソレノイド）・マニホールド用」→「シングルソレノイド」） */
const kindName = (def: DeviceDefinition) => /（(.+?)）/.exec(def.name)?.[1]?.replace('マニホールド用', 'ブランクプレート') ?? def.name;
const lookup = getDeviceDefinition;

function Thumb({ device, def, params }: { device: DiagramDevice; def: DeviceDefinition; params?: ParamValues }) {
  const svg = useMemo(() => instantiateSvg(def, `valve-${device.id}`, params), [def, device.id, params]);
  return <svg className="valve-strip__svg" viewBox={`0 0 ${def.width} ${def.height}`} style={{ width: def.width * 0.8 }} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** マニホールドを上から並べた絵（ドラッグで連の順番を変える） */
function Strip({ diagram, hostId, rows, selected, onSelect, onMove }: {
  diagram: Diagram;
  hostId: string;
  rows: StationRow[];
  selected: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, slot: number) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const host = diagram.devices.find((x) => x.id === hostId)!;
  const hostDef = lookup(host.type)!;
  const bus = computeBus(diagram.devices, lookup);
  return (
    <div className="valve-strip">
      <div className="valve-strip__host">
        <Thumb device={host} def={hostDef} params={{ ...effectiveParams(host, bus), stations: 0 }} />
        <span className="muted small">{host.id}</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.device.id}
          className={`valve-strip__station${selected === r.device.id ? ' is-selected' : ''}${over === r.slot ? ' is-over' : ''}${dragging === r.device.id ? ' is-dragging' : ''}`}
          draggable
          onClick={() => onSelect(r.device.id)}
          onDragStart={(e) => {
            e.dataTransfer.setData(STATION_MIME, r.device.id);
            e.dataTransfer.effectAllowed = 'move';
            setDragging(r.device.id);
          }}
          onDragEnd={() => {
            setDragging(null);
            setOver(null);
          }}
          onDragOver={(e) => {
            if (!dragging) return;
            e.preventDefault();
            setOver(r.slot);
          }}
          onDragLeave={() => setOver((o) => (o === r.slot ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData(STATION_MIME);
            setOver(null);
            setDragging(null);
            if (id && id !== r.device.id) onMove(id, r.slot);
          }}
          title="ドラッグしてほかの連に落とすと、順番を変えます"
        >
          <Thumb device={r.device} def={r.def} params={effectiveParams(r.device, bus)} />
          <span className="valve-strip__no">{r.slot}</span>
          <span className="small">{r.device.id}</span>
        </div>
      ))}
    </div>
  );
}

/** A・B のつなぎ先の選択 */
function PortSelect({ row, port, targets, onChange }: {
  row: StationRow;
  port: 'A' | 'B';
  targets: ReturnType<typeof airTargets>;
  onChange: (target: TerminalRef | null) => void;
}) {
  const peers = row.ports.find((p) => p.port === port)?.peers ?? [];
  const current = peers[0];
  const options = current && !targets.some((t) => refKey(t.ref) === refKey(current.ref)) ? [{ ref: current.ref, name: current.name, detail: '', used: true }, ...targets] : targets;
  return (
    <div className="valve-cell">
      <select
        value={current ? refKey(current.ref) : ''}
        onChange={(e) => {
          const t = options.find((o) => refKey(o.ref) === e.target.value);
          onChange(t ? t.ref : null);
        }}
      >
        <option value="">（なし）</option>
        {options.map((t) => (
          <option key={refKey(t.ref)} value={refKey(t.ref)} title={t.detail}>
            {t.name}
            {t.used && (!current || refKey(current.ref) !== refKey(t.ref)) ? '（使用中）' : ''}
          </option>
        ))}
      </select>
      {current?.via.length ? <span className="muted small">リンク {current.via.join('・')} 経由</span> : null}
      {peers.length > 1 && <span className="muted small">ほか {peers.length - 1} 件</span>}
    </div>
  );
}

/** ソレノイドにつなぐ PLC の出力の選択 */
function OutputSelect({ row, sol, outputs, onChange }: { row: StationRow; sol: SolenoidRow | undefined; outputs: IoPoint[]; onChange: (p: IoPoint | null) => void }) {
  if (!sol) return <span className="muted small">—</span>;
  const current = sol.outputs[0];
  const k = (p: IoPoint) => `${p.device}:${p.terminal}`;
  const usable = outputs.filter((p) => p.endpoint || (current && k(p) === k(current)));
  const usedBy = (p: IoPoint) => p.connections.filter((c) => c.ref.device !== row.device.id).map((c) => c.name);
  return (
    <div className="valve-cell">
      <select value={current ? k(current) : ''} onChange={(e) => onChange(usable.find((p) => k(p) === e.target.value) ?? null)}>
        <option value="">（なし）</option>
        {usable.map((p) => (
          <option key={k(p)} value={k(p)}>
            {p.address}
            {p.comment ? ` ${p.comment}` : ''}
            {usedBy(p).length ? `（使用中: ${usedBy(p).join('・')}）` : ''}
          </option>
        ))}
      </select>
      {current && !sol.commonWired && (
        <span className="small sev-text-warning">{current.kind === 'npn' ? `${sol.side}+ を +24V へ` : `${sol.side}− を 0V へ`}つなぎます</span>
      )}
    </div>
  );
}

/** バルブエディタ（マニホールドの連の構成と、A・B のつなぎ先・ソレノイドの PLC 出力） */
export function ValveEditor({ diagram, deviceId, onApply, onJump, onClose }: Props) {
  const hostId = manifoldOf(diagram, deviceId, lookup);
  const [selected, setSelected] = useState<string | null>(deviceId !== hostId ? deviceId : null);
  const [addType, setAddType] = useState('');
  const host = hostId ? diagram.devices.find((x) => x.id === hostId) : undefined;
  const hostDef = host && lookup(host.type);
  const outputs = useMemo(() => plcOutputs(diagram, lookup), [diagram]);
  const rows = useMemo(() => (hostId ? manifoldRows(diagram, hostId, lookup, outputs) : []), [diagram, hostId, outputs]);
  const targets = useMemo(() => (hostId ? airTargets(diagram, hostId, lookup) : []), [diagram, hostId]);
  const types = useMemo(() => (hostDef ? stationTypes(hostDef, deviceDefinitions) : { valves: [], blanks: [] }), [hostDef]);
  if (!host || !hostDef || !hostId) return null;
  const summary = manifoldSummary(diagram, hostId, lookup);
  const portOptions = [...new Set(types.valves.flatMap((v) => v.params?.find((p) => p.key === 'portAB')?.options.map((o) => Number(o.value)) ?? []))];
  const allTypes = [...types.valves, ...types.blanks];
  const free = freeUnits(diagram, hostId, lookup);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal io-dialog plc-editor valve-editor" onClick={(e) => e.stopPropagation()}>
        <div className="io-dialog__head">
          <h2>
            バルブエディタ — {host.id}
            <span className="muted">（{summary.model}）</span>
          </h2>
          <button type="button" className="io-dialog__close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        <div className="valve-editor__body">
          <Strip
            diagram={diagram}
            hostId={hostId}
            rows={rows}
            selected={selected}
            onSelect={setSelected}
            onMove={(id, slot) => onApply(moveUnit(diagram, hostId, id, slot, lookup), `${id} を連 ${slot} へ移しました`)}
          />
          <div className="io-table-wrap">
            <table className="io-table valve-table">
              <thead>
                <tr>
                  <th>連</th>
                  <th>機器名</th>
                  <th>機種</th>
                  <th>A・B の継手</th>
                  <th>4(A) のつなぎ先</th>
                  <th>2(B) のつなぎ先</th>
                  <th>SOL A の出力</th>
                  <th>SOL B の出力</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const portParam = r.def.params?.find((p) => p.key === 'portAB');
                  const portValue = r.device.params?.portAB ?? portParam?.default;
                  return (
                    <tr key={r.device.id} className={selected === r.device.id ? 'is-drop' : ''} onClick={() => setSelected(r.device.id)}>
                      <td className="io-address">{r.slot}</td>
                      <td>
                        <button type="button" className="plc-unit__id" onClick={() => onJump(r.device.id)} title="図面でこの連を表示">
                          {r.device.id}
                        </button>
                      </td>
                      <td>
                        <select
                          value={r.device.type}
                          onChange={(e) => onApply(changeStationType(diagram, r.device.id, e.target.value, lookup), `${r.device.id} を ${lookup(e.target.value)?.model} にしました`)}
                        >
                          {allTypes.map((t) => (
                            <option key={t.type} value={t.type}>
                              {t.model} {kindName(t)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {portParam ? (
                          <select
                            value={String(portValue)}
                            onChange={(e) => onApply({ ...diagram, devices: diagram.devices.map((x) => (x.id === r.device.id ? { ...x, params: { ...x.params, portAB: Number(e.target.value) } } : x)) }, `${r.device.id} の A・B の継手を変えました`)}
                          >
                            {portParam.options.map((o) => (
                              <option key={String(o.value)} value={String(o.value)}>
                                C{o.value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="muted small">栓</span>
                        )}
                      </td>
                      {(['A', 'B'] as const).map((port) => (
                        <td key={port}>
                          {r.blank ? (
                            <span className="muted small">—</span>
                          ) : (
                            <PortSelect
                              row={r}
                              port={port}
                              targets={targets}
                              onChange={(t) =>
                                onApply(
                                  setPortTarget(diagram, r.device.id, port, t, lookup),
                                  t ? `${r.device.id} の ${port} を ${t.device}.${t.terminal} につなぎました` : `${r.device.id} の ${port} のチューブを外しました`,
                                )
                              }
                            />
                          )}
                        </td>
                      ))}
                      {(['A', 'B'] as const).map((side) => (
                        <td key={side}>
                          <OutputSelect
                            row={r}
                            sol={r.solenoids.find((s) => s.side === side)}
                            outputs={outputs}
                            onChange={(p) =>
                              onApply(
                                setSolenoidOutput(diagram, r.device.id, side, p, SOL_WIRE, lookup),
                                p ? `${r.device.id} の SOL ${side} を ${p.address} につなぎました` : `${r.device.id} の SOL ${side} の出力を外しました`,
                              )
                            }
                          />
                        </td>
                      ))}
                      <td className="valve-actions">
                        <button type="button" disabled={i === 0} onClick={() => onApply(moveUnit(diagram, hostId, r.device.id, r.slot - 1, lookup), `${r.device.id} を連 ${r.slot - 1} へ移しました`)} title="左（D 側）へ">
                          ←
                        </button>
                        <button
                          type="button"
                          disabled={i === rows.length - 1}
                          onClick={() => onApply(moveUnit(diagram, hostId, r.device.id, r.slot + 1, lookup), `${r.device.id} を連 ${r.slot + 1} へ移しました`)}
                          title="右（U 側）へ"
                        >
                          →
                        </button>
                        <button type="button" onClick={() => onApply(unmountUnit(diagram, r.device.id, lookup), `${r.device.id} をマニホールドから外しました（図面には残っています）`)}>
                          外す
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => window.confirm(`${r.device.id} を削除しますか？（つながる電線・チューブも消えます）`) && onApply(removeUnit(diagram, r.device.id, lookup), `${r.device.id} を削除しました`)}
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {!rows.length && (
                  <tr>
                    <td colSpan={9} className="muted">
                      連がありません。下の「連を追加」で電磁弁やブランクプレートを装着します。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="plc-panels">
            <section className="plc-panel">
              <h4>連を追加（右端＝U 側へ）</h4>
              <div className="plc-add">
                <select value={addType} onChange={(e) => setAddType(e.target.value)}>
                  <option value="">機種を選ぶ…</option>
                  {allTypes.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.model}（{t.name}）
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="primary"
                  disabled={!addType}
                  onClick={() => {
                    const def = allTypes.find((t) => t.type === addType);
                    if (!def) return;
                    const r = addStation(diagram, hostId, def, lookup);
                    setSelected(r.id);
                    onApply(r.diagram, `${def.model} を連 ${rows.length + 1} に追加しました`);
                  }}
                >
                  追加
                </button>
              </div>
              {free.length > 0 && (
                <>
                  <h4>図面にある未装着の電磁弁・ブランクプレート</h4>
                  {free.map((u) => (
                    <div key={u.id} className="plc-free">
                      <span>
                        <strong>{u.id}</strong> <span className="muted">{lookup(u.type)?.model}</span>
                      </span>
                      <button type="button" onClick={() => onApply(mountUnit(diagram, hostId, u.id, lookup), `${u.id} を連 ${rows.length + 1} に装着しました`)}>
                        装着
                      </button>
                    </div>
                  ))}
                </>
              )}
              {portOptions.length > 1 && (
                <>
                  <h4>A・B の継手をそろえる</h4>
                  <div className="plc-buttons">
                    {portOptions.map((od) => (
                      <button key={od} type="button" onClick={() => onApply(setAllPorts(diagram, hostId, od, lookup), `すべての連の A・B の継手を C${od} にしました`)}>
                        すべて C{od}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
            <section className="plc-panel">
              <h4>マニホールドの型式</h4>
              <p className="valve-model">{summary.model}</p>
              <p className="muted small">
                連数 {summary.stations}（ブランクプレートを含む）・ソレノイド {summary.solenoids} 点。連 1 は D 側（左）。部品表には、この型式のマニホールドと各連の電磁弁・ブランクプレートが載ります。
              </p>
              {summary.notes.map((n) => (
                <p key={n} className="small sev-text-warning">
                  {n}
                </p>
              ))}
            </section>
          </div>
          <p className="muted small">
            4(A)・2(B) のつなぎ先を選ぶとチューブを引きます（別のシートの機器ならエアのリンクを置いてつなぎます）。SOL の出力を選ぶと、PLC の出力からソレノイドへ電線を引きます（シンク出力は −、ソース出力は + の側。もう一方は電源へつなぎます）。
          </p>
        </div>
      </div>
    </div>
  );
}
