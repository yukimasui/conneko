import { useMemo, useState } from 'react';
import { deviceDefinitions, getDeviceDefinition, instantiateSvg } from '../devices/registry';
import type { DeviceDefinition } from '../devices/types';
import { computeBus, effectiveParams } from '../model/bus';
import type { Diagram, DiagramDevice } from '../model/diagram';
import { ioSystem } from '../model/io';
import { mountFamily } from '../model/ops';
import {
  addUnit,
  compatibleTypes,
  currentSlots,
  freeUnits,
  hasFixedSlots,
  mountUnit,
  moveUnit,
  removeUnit,
  renumberIoNames,
  slotCount,
  unmountUnit,
} from '../model/plc';
import { IoEditor } from './IoDialog';

export type PlcTab = 'rack' | 'io';

interface Props {
  diagram: Diagram;
  /** PLC の親（または装着したユニット）の機器ID */
  deviceId: string;
  tab: PlcTab;
  onTab: (tab: PlcTab) => void;
  onApply: (next: Diagram, message?: string) => void;
  onJump: (deviceId: string) => void;
  onClose: () => void;
}

const UNIT_MIME = 'application/x-conneko-unit';
const ROLE_NAMES: Record<string, string> = { power: '電源', cpu: 'CPU' };

function UnitThumb({ device, def, params }: { device: DiagramDevice; def: DeviceDefinition; params?: Record<string, number | string> }) {
  const svg = useMemo(() => instantiateSvg(def, `plc-${device.id}`, params), [def, device.id, params]);
  return <svg className="plc-unit__svg" viewBox={`0 0 ${def.width} ${def.height}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** ユニット構成（装着の順番をドラッグで変える、追加・取り外し、内部電源の収支） */
function RackEditor({ diagram, hostId, onApply, onJump }: { diagram: Diagram; hostId: string; onApply: Props['onApply']; onJump: Props['onJump'] }) {
  const [renumber, setRenumber] = useState(true);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [addType, setAddType] = useState('');
  const host = diagram.devices.find((x) => x.id === hostId)!;
  const hostDef = getDeviceDefinition(host.type)!;
  const fixed = hasFixedSlots(hostDef);
  const bus = computeBus(diagram.devices, getDeviceDefinition);
  const group = bus.groups.get(hostId);
  const problems = bus.problems.filter((p) => p.devices.includes(hostId) || p.devices.some((d) => diagram.devices.find((x) => x.id === d)?.mount?.device === hostId));
  const slots = currentSlots(diagram, hostId);
  const units = new Map(diagram.devices.filter((x) => x.mount?.device === hostId).map((x) => [x.id, x]));
  const count = fixed ? slotCount(diagram, hostId, getDeviceDefinition) : slots.size + 1;
  const roles = hostDef.bus?.host?.slotRoles ?? {};
  const emptyPoints = hostDef.bus?.host?.numbering?.emptySlot;
  const system = ioSystem(diagram, hostId, getDeviceDefinition);
  const candidates = compatibleTypes(hostDef, deviceDefinitions);
  const free = freeUnits(diagram, hostId, getDeviceDefinition);

  /** 構成の変更を反映する（入出力番号が変わった I/O の線番・リンク名も付け替える） */
  const apply = (next: Diagram, message: string) => onApply(renumber ? renumberIoNames(diagram, next, hostId, getDeviceDefinition) : next, message);

  const range = (id: string) => {
    const u = system?.units.find((x) => x.device.id === id);
    if (!u) return '';
    const ins = u.points.filter((p) => p.dir === 'in');
    const outs = u.points.filter((p) => p.dir === 'out');
    return [ins.length && `入力 ${ins[0].address}〜`, outs.length && `出力 ${outs[0].address}〜`].filter(Boolean).join(' ');
  };
  const busText = (def: DeviceDefinition) =>
    [
      ...Object.entries(def.bus?.supply ?? {}).map(([r, v]) => `${r} 供給 ${typeof v === 'number' ? v : '?'}A`),
      ...Object.entries(def.bus?.load ?? {}).map(([r, v]) => `${r} ${typeof v === 'number' ? v : '?'}A`),
    ].join(' / ');

  const drop = (slot: number) => (e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    const id = e.dataTransfer.getData(UNIT_MIME);
    setDragging(null);
    if (!id) return;
    const from = [...slots].find(([, x]) => x === id)?.[0];
    if (from === slot) return;
    apply(moveUnit(diagram, hostId, id, slot, getDeviceDefinition), `${id} を位置 ${slot} へ移しました`);
  };

  const cells = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <div className="plc-rack-wrap">
      <div className="plc-rack">
        <div className="plc-unit is-host">
          <UnitThumb device={host} def={hostDef} params={host.params} />
          <div className="plc-unit__name">
            <strong>{host.id}</strong> <span className="muted">{hostDef.model}</span>
          </div>
          <div className="plc-unit__meta">{busText(hostDef)}</div>
        </div>
        {cells.map((slot) => {
          const id = slots.get(slot);
          const unit = id ? units.get(id) : undefined;
          const def = unit && getDeviceDefinition(unit.type);
          const role = roles[slot];
          return (
            <div
              key={slot}
              className={`plc-slot${over === slot ? ' is-over' : ''}${unit ? '' : ' is-empty'}`}
              onDragOver={(e) => {
                if (!dragging) return;
                e.preventDefault();
                setOver(slot);
              }}
              onDragLeave={() => setOver((o) => (o === slot ? null : o))}
              onDrop={drop(slot)}
            >
              <div className="plc-slot__no">
                {slot}
                {role && <span className="plc-slot__role">{ROLE_NAMES[role] ?? role}</span>}
              </div>
              {unit && def ? (
                <div
                  className={`plc-unit${dragging === unit.id ? ' is-dragging' : ''}`}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(UNIT_MIME, unit.id);
                    e.dataTransfer.effectAllowed = 'move';
                    setDragging(unit.id);
                  }}
                  onDragEnd={() => {
                    setDragging(null);
                    setOver(null);
                  }}
                  title="ドラッグしてほかの位置に落とすと、順番を変えます"
                >
                  <UnitThumb device={unit} def={def} params={effectiveParams(unit, bus)} />
                  <div className="plc-unit__name">
                    <button type="button" className="plc-unit__id" onClick={() => onJump(unit.id)} title="図面でこのユニットを表示">
                      {unit.id}
                    </button>{' '}
                    <span className="muted">{def.model}</span>
                  </div>
                  <div className="plc-unit__meta">{range(unit.id)}</div>
                  <div className="plc-unit__meta">{busText(def)}</div>
                  <div className="plc-unit__actions">
                    <button type="button" onClick={() => apply(unmountUnit(diagram, unit.id, getDeviceDefinition), `${unit.id} を外しました（図面には残っています）`)}>
                      外す
                    </button>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => window.confirm(`${unit.id} を削除しますか？（つながる電線・ケーブルも消えます）`) && apply(removeUnit(diagram, unit.id, getDeviceDefinition), `${unit.id} を削除しました`)}
                    >
                      削除
                    </button>
                  </div>
                </div>
              ) : (
                <div className="plc-slot__empty">{fixed ? `空き${emptyPoints && !role ? `（${emptyPoints}点）` : ''}` : 'ここに落とすと末尾へ'}</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="plc-panels">
        <section className="plc-panel">
          <h4>ユニットを追加</h4>
          <div className="plc-add">
            <select value={addType} onChange={(e) => setAddType(e.target.value)}>
              <option value="">機種を選ぶ…</option>
              {candidates.map((d) => (
                <option key={d.type} value={d.type}>
                  {d.model}（{d.name}）
                </option>
              ))}
            </select>
            <button
              type="button"
              className="primary"
              disabled={!addType}
              onClick={() => {
                const def = candidates.find((d) => d.type === addType);
                if (def) apply(addUnit(diagram, hostId, def, getDeviceDefinition), `${def.model} を追加しました`);
              }}
            >
              追加
            </button>
          </div>
          {free.length > 0 && (
            <>
              <h4>図面にある未装着のユニット</h4>
              {free.map((u) => (
                <div key={u.id} className="plc-free">
                  <span>
                    <strong>{u.id}</strong> <span className="muted">{getDeviceDefinition(u.type)?.model}</span>
                  </span>
                  <button type="button" onClick={() => apply(mountUnit(diagram, hostId, u.id, getDeviceDefinition), `${u.id} を装着しました`)}>
                    装着
                  </button>
                </div>
              ))}
            </>
          )}
        </section>
        <section className="plc-panel">
          <h4>内部電源・スロット</h4>
          {group?.rails.map((r) => (
            <div key={r.rail} className="plc-rail">
              <span>{r.rail}</span>
              <div className="plc-rail__bar">
                <div className={`plc-rail__fill${r.load > r.supply ? ' is-over' : ''}`} style={{ width: `${r.supply ? Math.min(100, (r.load / r.supply) * 100) : 100}%` }} />
              </div>
              <span className="muted small">
                {Math.round(r.load * 1000) / 1000}A / {Math.round(r.supply * 1000) / 1000}A
              </span>
            </div>
          ))}
          {!group?.rails.length && <p className="muted small">内部電源のデータがありません</p>}
          <p className="muted small">
            装着 {slots.size}
            {hostDef.bus?.host?.slots ? ` / ${hostDef.bus.host.slots}` : ''} 台
          </p>
          {problems.map((p) => (
            <p key={p.message} className={`small sev-text-${p.severity}`}>
              {p.message}
            </p>
          ))}
          <label className="plc-renumber muted small">
            <input type="checkbox" checked={renumber} onChange={(e) => setRenumber(e.target.checked)} />
            順番を変えて入出力番号が変わったら、つないだ電線の線番とリンクの名前も新しい番号にする
          </label>
        </section>
      </div>
      <p className="muted small">
        ユニットをドラッグしてほかの位置に落とすと、順番を変えます。{fixed ? 'ベースユニットではスロットの位置どおりに並び、空きスロットも番号を占有します。' : 'ユニットは CPU の右に詰めて並びます。'}
        {system?.units.length ? ` 先頭番号: ${system.units.map((u) => `${u.device.id} ${u.points[0]?.address ?? ''}`).join('、')}` : ''}
      </p>
    </div>
  );
}

/** PLC エディタ（ユニット構成と I/O 割付） */
export function PlcEditor({ diagram, deviceId, tab, onTab, onApply, onJump, onClose }: Props) {
  const hostId = mountFamily(diagram, deviceId)[0];
  const host = diagram.devices.find((x) => x.id === hostId);
  const hostDef = host && getDeviceDefinition(host.type);
  if (!host || !hostDef) return null;
  const canRack = !!hostDef.bus?.host;
  const current = canRack ? tab : 'io';
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal io-dialog plc-editor" onClick={(e) => e.stopPropagation()}>
        <div className="io-dialog__head">
          <h2>
            PLC エディタ — {host.id}
            <span className="muted">（{hostDef.model}）</span>
          </h2>
          <div className="plc-tabs" role="tablist">
            {canRack && (
              <button type="button" role="tab" className={current === 'rack' ? 'is-active' : ''} onClick={() => onTab('rack')}>
                ユニット構成
              </button>
            )}
            <button type="button" role="tab" className={current === 'io' ? 'is-active' : ''} onClick={() => onTab('io')}>
              I/O 割付
            </button>
          </div>
          <button type="button" className="io-dialog__close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        {current === 'rack' ? (
          <RackEditor diagram={diagram} hostId={hostId} onApply={onApply} onJump={onJump} />
        ) : (
          <IoEditor diagram={diagram} deviceId={deviceId} onApply={onApply} onJump={onJump} />
        )}
      </div>
    </div>
  );
}
