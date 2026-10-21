/**
 * Ethernet ポート（RJ-45）を 2 個持つ KV シリーズの拡張ユニット（KV-XLE02 / KV-XCM02 / KV-XD02）の共通描画。
 * 上部の表示部に PORT1/PORT2 の LINK/ACT・STATUS LED、正面に RJ-45 ポートが縦に 2 個（上が PORT1、下が PORT2）。
 */
import type { DeviceDefinition } from '../types';
import { kvBody2, kvDefs, kvUnitBus, rj45, rj45Connector, text } from './kv-parts';

export function buildKvEthUnit(s: {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  /** 本体幅[px] */
  width: number;
  /** 追加の描画（CARD スロットなど） */
  extra?: string;
  /** ポートの通信プロトコル（両ポート共通） */
  protocols: string[];
  /** 内部消費電流[mA] */
  mA: number;
}): DeviceDefinition {
  const W = s.width;
  const H = 185;
  const px = W - 32;
  const P1 = { x: px, y: 104 };
  const P2 = { x: px, y: 144 };
  const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, s.model, {
    headerH: 32,
    leds: [
      { x: 10, y: 15, label: 'LINK/ACT' },
      { x: 24, y: 15, label: 'STATUS' },
      { x: W - 30, y: 15, label: 'LINK/ACT', c: 'off' },
      { x: W - 16, y: 15, label: 'STATUS' },
    ],
  })}
  ${text(17, 28, 'PORT1', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${text(W - 23, 28, 'PORT2', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${text(P1.x - 26, P1.y - 13, 'PORT1', 3, '#d0d3d6', 'start')}
  ${rj45(P1.x, P1.y)}
  ${text(P2.x - 26, P2.y - 13, 'PORT2', 3, '#d0d3d6', 'start')}
  ${rj45(P2.x, P2.y)}
  ${text(P2.x, 166, '10/100/1000', 2.6, '#9a9da2', 'middle', 'normal')}
  ${s.extra ?? ''}`;
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'PORT1', label: 'PORT1 (RJ45)', x: P1.x, y: P1.y, side: 'bottom', role: 'connector', connector: rj45Connector(s.protocols), optional: true },
      { id: 'PORT2', label: 'PORT2 (RJ45)', x: P2.x, y: P2.y, side: 'bottom', role: 'connector', connector: rj45Connector(s.protocols), optional: true },
    ],
    bus: kvUnitBus(s.mA),
  };
}
