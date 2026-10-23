import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { getDeviceDefinition, instantiateSvg } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import { linkKey } from '../model/ops';
import { deviceModel, type TerminalSide } from '../devices/types';
import { useEditorContext } from './EditorContext';
import type { DeviceFlowNode } from './flow';
import { TerminalCallouts, TerminalPopup } from './TerminalHints';

const POSITION: Record<TerminalSide, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

/** コネクタの接続点（Handle）の厚み。ケーブルの始点は Handle の side 側の端になる */
export const HANDLE_DEPTH = 10;

/** リンクの相手（同じ名前のリンク）があるシート。クリックでそのシートのリンクへ移動する */
function LinkPeers({ self, peers, sheet, onJump }: { self: string; peers: { id: string; sheet: string; sheetName: string }[]; sheet: string; onJump: (id: string) => void }) {
  const others = peers.filter((p) => p.id !== self);
  // シートごとに 1 つにまとめる（このシートの相手は最後に）
  const bySheet = new Map<string, { id: string; name: string }>();
  for (const p of others) if (!bySheet.has(p.sheet)) bySheet.set(p.sheet, { id: p.id, name: p.sheet === sheet ? 'このシート' : p.sheetName });
  const list = [...bySheet].sort((a, b) => Number(a[0] === sheet) - Number(b[0] === sheet));
  return (
    <div className={`link-peers${others.length ? '' : ' is-alone'}`}>
      {list.length
        ? list.map(([s, p]) => (
            <button
              key={s}
              type="button"
              className="link-peers__item nodrag"
              title={`${p.name} の ${p.id} へ移動`}
              onClick={(e) => {
                e.stopPropagation();
                onJump(p.id);
              }}
            >
              ⇢{p.name}
            </button>
          ))
        : '相手なし'}
    </div>
  );
}

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const def = getDeviceDefinition(data.deviceType);
  // マウスを乗せている端子（ポップアップを出す）
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const { deviceSeverity, params: effective, hosts, linkPeers, onJump, showNotes } = useEditorContext();
  const severity = deviceSeverity.get(id);
  const params = effective.get(id) ?? data.params;
  const svg = useMemo(() => (def ? instantiateSvg(def, id, params) : ''), [def, id, params]);
  const resolved = useMemo(() => (def ? resolveDevice(def, params) : undefined), [def, params]);
  const terminals = useMemo(() => resolved?.terminals ?? [], [resolved]);
  // パラメータで端子が変わる機器があるため、端子の位置を React Flow に知らせ直す
  // （初回の描画では不要。初回にも呼ぶと全体表示（fitView）が計測前に走ってしまう）
  // 元の端子に戻った場合も知らせ直すため、直前の端子と比べる
  const updateNodeInternals = useUpdateNodeInternals();
  const prevTerminals = useRef(terminals);
  useEffect(() => {
    if (terminals === prevTerminals.current) return;
    prevTerminals.current = terminals;
    updateNodeInternals(id);
  }, [terminals, id, updateNodeInternals]);

  if (!def) {
    return (
      <div className="device-node device-node--unknown">
        <div className="device-node__label">{id}</div>
        <div>不明な機器: {data.deviceType}</div>
      </div>
    );
  }

  return (
    <div
      className={`device-node${selected ? ' is-selected' : ''}${severity ? ` has-${severity}` : ''}${data.mount ? ' is-mounted' : ''}${hosts.has(id) ? ' has-mounted' : ''}${def.netLabel ? ' is-link' : ''}`}
      style={{ width: def.width, height: def.height }}
    >
      <div className="device-node__label" title={data.mount ? `${def.model}（${data.mount.device} の位置 ${data.mount.slot} に装着）` : undefined}>
        {/* 機器のコメントは、下の端子と重ならないよう機器名の上に出す */}
        {showNotes && data.note && !def.netLabel && (
          <div className="device-node__note" title={data.note}>
            {data.note}
          </div>
        )}
        <strong>{id}</strong>
        <span>{deviceModel(def, data.params)}</span>
      </div>
      <svg
        className="device-node__svg"
        width={def.width}
        height={def.height}
        viewBox={`0 0 ${def.width} ${def.height}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {def.netLabel && (
        <LinkPeers
          self={id}
          peers={linkPeers.get(linkKey(def.type, String(params?.[def.netLabel.param] ?? '').trim())) ?? []}
          sheet={data.sheet}
          onJump={onJump}
        />
      )}
      {terminals.map((t) => (
        <Handle
          key={t.id}
          id={t.id}
          type="source"
          position={POSITION[t.side]}
          className={`terminal terminal--${t.role}`}
          style={{
            left: t.x,
            top: t.y,
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            // コネクタは差込口の幅いっぱいを接続点にする
            ...(t.connector &&
              (t.side === 'top' || t.side === 'bottom'
                ? { width: t.connector.width, height: HANDLE_DEPTH, borderRadius: 3 }
                : { width: HANDLE_DEPTH, height: t.connector.width, borderRadius: 3 })),
          }}
          onMouseEnter={(e) => setHover({ id: t.id, rect: e.currentTarget.getBoundingClientRect() })}
          onMouseLeave={() => setHover(null)}
        />
      ))}
      {selected && <TerminalCallouts terminals={terminals} />}
      {hover && resolved?.terminal(hover.id) && (
        <TerminalPopup device={id} terminal={resolved.terminal(hover.id)!} resolved={resolved} comment={data.comments?.[hover.id]} anchor={hover.rect} />
      )}
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeView);
