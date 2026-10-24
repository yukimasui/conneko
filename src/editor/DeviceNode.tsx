import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { linkShape } from '../devices/link';
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

/**
 * 機器名のラベルを機器の下に出すか。端子が上にしかない機器（サイレンサ・上にポートのあるシリンダなど）は、
 * 上から来る電線・チューブがラベルを横切るので下に出す
 */
export function labelBelow(terminals: { side: TerminalSide }[]): boolean {
  return terminals.length > 0 && terminals.every((t) => t.side === 'top');
}

/** 機器名のラベルの幅の目安[px]（機器名は太字 13px、型式は 11px） */
export function labelWidth(id: string, model: string): number {
  const w = (s: string, px: number) => [...s].reduce((sum, ch) => sum + (ch.charCodeAt(0) > 0xff ? px : px * 0.62), 0);
  return Math.ceil(w(id, 13) + w(model, 11) + 18);
}

/**
 * 機器名のラベルを上に出すときの左の位置[px]。上下の両方に端子がある機器（マニホールド・シリンダ・ブレーカーなど）で、
 * 左端に置いたラベルに上の端子がかかる（上から来る電線・チューブが横切る）ときは、上の端子のいちばん右より右へずらす
 */
export function labelOffset(terminals: { side: TerminalSide; x: number }[], width: number): number {
  const top = terminals.filter((t) => t.side === 'top');
  if (!top.length || labelBelow(terminals)) return 0;
  if (Math.min(...top.map((t) => t.x)) > width + 6) return 0;
  return Math.ceil(Math.max(...top.map((t) => t.x)) + 10);
}

/** コネクタの接続点（Handle）の厚み。ケーブルの始点は Handle の side 側の端になる */
export const HANDLE_DEPTH = 10;

/** リンクの相手（同じ名前のリンク）があるシート。クリックでそのシートのリンクへ移動する */
function LinkPeers({
  self,
  peers,
  sheet,
  onJump,
  place,
}: {
  self: string;
  peers: { id: string; sheet: string; sheetName: string }[];
  sheet: string;
  onJump: (id: string) => void;
  /** 一覧を出す場所: 横のリンクは下、縦のリンクは矢印の先（上でつなぐなら下、下でつなぐなら上）に縦書きで出す */
  place: 'below' | 'vertical-below' | 'vertical-above';
}) {
  const others = peers.filter((p) => p.id !== self);
  // シートごとに 1 つにまとめる（このシートの相手は最後に）
  const bySheet = new Map<string, { id: string; name: string }>();
  for (const p of others) if (!bySheet.has(p.sheet)) bySheet.set(p.sheet, { id: p.id, name: p.sheet === sheet ? 'このシート' : p.sheetName });
  const list = [...bySheet].sort((a, b) => Number(a[0] === sheet) - Number(b[0] === sheet));
  return (
    <div className={`link-peers${others.length ? '' : ' is-alone'}${place === 'below' ? '' : ` link-peers--${place}`}`}>
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

function linkPlace(params: Parameters<typeof linkShape>[0]): 'below' | 'vertical-below' | 'vertical-above' {
  const { vertical, side } = linkShape(params);
  return !vertical ? 'below' : side === 'top' ? 'vertical-below' : 'vertical-above';
}

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const def = getDeviceDefinition(data.deviceType);
  // マウスを乗せている端子（ポップアップを出す）
  const [hover, setHover] = useState<{ id: string; rect: DOMRect } | null>(null);
  const { deviceSeverity, params: effective, hosts, labelLefts, linkPeers, onJump, showNotes } = useEditorContext();
  const severity = deviceSeverity.get(id);
  const params = effective.get(id) ?? data.params;
  const svg = useMemo(() => (def ? instantiateSvg(def, id, params) : ''), [def, id, params]);
  const resolved = useMemo(() => (def ? resolveDevice(def, params) : undefined), [def, params]);
  const terminals = useMemo(() => resolved?.terminals ?? [], [resolved]);
  // 上から来る線にかからない機器名の位置（src/editor/labelPlace.ts）
  const labelLeft = labelLefts.get(id) ?? 0;
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
      className={`device-node${selected ? ' is-selected' : ''}${severity ? ` has-${severity}` : ''}${data.mount ? ' is-mounted' : ''}${hosts.has(id) ? ' has-mounted' : ''}${def.netLabel ? ' is-link' : ''}${labelBelow(terminals) ? ' is-label-below' : ''}`}
      style={{ width: resolved?.width ?? def.width, height: resolved?.height ?? def.height }}
    >
      <div
        className="device-node__label"
        title={data.mount ? `${def.model}（${data.mount.device} の位置 ${data.mount.slot} に装着）` : undefined}
        style={labelLeft ? { left: labelLeft } : undefined}
      >
        {/* 機器のコメントは、下の端子と重ならないよう機器名の上に出す */}
        {showNotes && data.note && !def.netLabel && (
          <div className="device-node__note" title={data.note}>
            {data.note}
          </div>
        )}
        <strong>{id}</strong>
        <span>{deviceModel(def, params)}</span>
      </div>
      <svg
        className="device-node__svg"
        width={resolved?.width ?? def.width}
        height={resolved?.height ?? def.height}
        viewBox={`0 0 ${resolved?.width ?? def.width} ${resolved?.height ?? def.height}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {def.netLabel && (
        <LinkPeers
          self={id}
          peers={linkPeers.get(linkKey(def.type, String(params?.[def.netLabel.param] ?? '').trim())) ?? []}
          sheet={data.sheet}
          onJump={onJump}
          place={linkPlace(params)}
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
