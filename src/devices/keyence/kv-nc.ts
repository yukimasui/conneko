/**
 * KEYENCE KV Nano 系の拡張ユニット（KV-NC□□E：ヨーロピアン端子台タイプ）の共通描画。
 * KV-X シリーズでは EtherCAT カプラ KV-EC01 の右側に連結してリモート I/O として使う（KV Nano CPU にも連結できる）。
 *
 * 外形 W22.2 × H90 × D80.4 mm（KEYENCE 外形寸法図より、1mm ≒ 2px）。上部に入出力の動作表示 LED（赤）と PWR LED（緑）、
 * その下にプッシュイン式の端子台（2列 × 8段）が 2 個。外側の列にオレンジの解除ボタン、内側の列に電線の差込口がある。
 * 右端に信号番号（0〜15）が印字される。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { ioRole, kvDefs, milHeaderV, milHeaderVHeight, text, toPins, type IoKind, type IoPoint } from './kv-parts';

export const NC_W = 44;
export const NC_H = 180;

/** 端子台の段の Y 座標（上の端子台 8 段 + 下の端子台 8 段） */
export const ncRowY = (i: number) => (i < 8 ? 64 + i * 7 : 64 + 8 * 7 + 6 + (i - 8) * 7);

/** KV-NC 系ユニットの本体（上部 LED 付き） */
export function ncBody(model: string, ledLabels: string[]) {
  const half = Math.ceil(ledLabels.length / 2);
  return `
  <rect x="1" y="4" width="${NC_W - 2}" height="${NC_H - 5}" rx="2" fill="url(#kvbody-{{uid}})" stroke="#0b0b0c" stroke-width="1"/>
  <rect x="7" y="1" width="8" height="5" rx="1" fill="#2a2c30" stroke="#0b0b0c" stroke-width="0.6"/>
  ${text(NC_W / 2, 11, model, Math.min(3.6, (NC_W - 6) / (model.length * 0.58)), '#e6e7e9')}
  ${ledLabels
    .map((l, i) => {
      const col = i < half ? 0 : 1;
      const row = i % half;
      const x = 10 + col * 11;
      const y = 16 + row * 4.4;
      const on = (i * 5) % 3 === 0;
      return `<rect x="${x - 1.6}" y="${y - 1.2}" width="3.2" height="2.4" rx="0.5" fill="${on ? '#ff4a3d' : '#4a2a2a'}" stroke="#111" stroke-width="0.3"/>${text(x + 2.6, y + 1, l, 2.2, '#b9bcc1', 'start', 'normal')}`;
    })
    .join('')}
  <rect x="${NC_W - 10}" y="14" width="5" height="3.2" rx="0.6" fill="url(#kvledg-{{uid}})" stroke="#111" stroke-width="0.3"/>
  ${text(NC_W - 7.5, 21, 'PWR', 2.2, '#b9bcc1', 'middle', 'normal')}
  <rect x="${NC_W - 4}" y="10" width="1.6" height="${NC_H - 16}" fill="#000" opacity="0.25"/>`;
}

/** 2列 × 16段 のプッシュイン端子台（左列: 外側にオレンジのボタン、右列も同様） */
function pushInDouble(xL: number, xR: number, rows: number) {
  let s = '';
  for (const blk of [0, 1]) {
    const y0 = ncRowY(blk * 8) - 4.5;
    s += `<rect x="4" y="${y0}" width="30" height="${8 * 7 + 2}" rx="1" fill="#151617" stroke="#3a3c40" stroke-width="0.6"/>`;
  }
  for (let i = 0; i < rows; i++) {
    const y = ncRowY(i);
    s += `<rect x="5" y="${y - 2.4}" width="3.4" height="4.8" rx="0.5" fill="url(#kvorange-{{uid}})"/>`;
    s += `<rect x="29.6" y="${y - 2.4}" width="3.4" height="4.8" rx="0.5" fill="url(#kvorange-{{uid}})"/>`;
    s += `<circle cx="${xL}" cy="${y}" r="2.6" fill="#050505" stroke="#5c5f63" stroke-width="0.4"/>`;
    s += `<circle cx="${xR}" cy="${y}" r="2.6" fill="#050505" stroke="#5c5f63" stroke-width="0.4"/>`;
  }
  return s;
}

export interface NcUnitSpec {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  /** 各段（0〜15）の左列・右列の端子 */
  rows: { left: { id: string; label: string; kind: IoKind }; right: { id: string; label: string; kind: IoKind }; num: string }[];
  /** 端子台の上に印字する列名（例: ['IN', 'COM']） */
  head: [string, string];
  links?: { from: string; to: string }[];
}

/**
 * MIL コネクタタイプの KV-NC 系ユニット（KV-NC16EX / NC16ET / NC32EX / NC32ET など）。
 * ピン番号はマニュアルどおり MIL 標準の千鳥番号（左列 = 奇数、右列 = 偶数）。
 */
export function buildNcMil(s: {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  poles: 20 | 34;
  pins: IoPoint[];
  links?: { from: string; to: string }[];
  /** 入力モード切替スイッチ（24V/5V）を描く */
  modeSwitch?: boolean;
}): DeviceDefinition {
  const h = milHeaderVHeight(s.poles);
  const cy = +(NC_H - h / 2 - 5).toFixed(2);
  const cx = 19;
  const svg = `
  ${kvDefs()}
  ${ncBody(s.model, Array.from({ length: s.poles === 34 ? 16 : 16 }, (_, i) => String(i)))}
  ${milHeaderV(cx, cy, s.poles)}
  ${
    s.modeSwitch
      ? `<rect x="35" y="${cy + h / 2 - 22}" width="6" height="14" rx="0.8" fill="#0d0e0f" stroke="#4a4d52" stroke-width="0.4"/>
  <rect x="35.6" y="${cy + h / 2 - 21.4}" width="4.8" height="6" rx="0.6" fill="#d9dadc"/>
  ${text(38, cy + h / 2 - 24, '24V', 2.4, '#c9ccd0', 'middle', 'normal')}
  ${text(38, cy + h / 2 - 4, '5V', 2.4, '#c9ccd0', 'middle', 'normal')}`
      : ''
  }`;
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: NC_W,
    height: NC_H,
    svg,
    terminals: [
      {
        id: 'CN1',
        label: `CN1 (MIL ${s.poles}P)`,
        x: cx,
        y: cy,
        side: 'bottom',
        role: 'connector',
        connector: { kind: `MIL${s.poles}`, pins: s.poles, width: 23 },
        optional: true,
      },
    ],
    pins: toPins(s.pins),
    links: s.links,
  };
}

/** KV-NC16EXE / KV-NC16ETE / KV-NC16ETPE 型（16点、各段が「信号 + COM」のペア） */
export function buildNc16E(s: NcUnitSpec): DeviceDefinition {
  const XL = 14;
  const XR = 24;
  const svg = `
  ${kvDefs()}
  ${ncBody(s.model, Array.from({ length: 16 }, (_, i) => String(i)))}
  ${text(XL, 57, s.head[0], 2.6, '#d0d3d6')}
  ${text(XR, 57, s.head[1], 2.6, '#d0d3d6')}
  ${pushInDouble(XL, XR, s.rows.length)}
  ${s.rows.map((r, i) => text(38.5, ncRowY(i) + 1, r.num, 2.6, i < 8 ? '#e6e7e9' : '#ff8a80', 'middle', 'normal')).join('')}
`;
  const terminals: TerminalDef[] = s.rows.flatMap((r, i): TerminalDef[] => [
    { id: r.left.id, label: r.left.label, x: XL, y: ncRowY(i), side: 'left', ...ioRole(r.left.kind), optional: true },
    { id: r.right.id, label: r.right.label, x: XR, y: ncRowY(i), side: 'right', ...ioRole(r.right.kind), optional: true },
  ]);
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: NC_W,
    height: NC_H,
    svg,
    terminals,
    links: s.links,
  };
}
