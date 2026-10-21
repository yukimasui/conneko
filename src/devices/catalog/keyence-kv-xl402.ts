import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody2, kvDefs, kvUnitBus, plugBlockV, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ シリアルコミュニケーションユニット KV-XL402（RS-422A/485 × 2 ポート）。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に SD・RD LED、正面に終端抵抗スイッチ（TERM ON/OFF）と
 * 5極のヨーロピアン端子台（脱着式）がポートごとに並ぶ（上が PORT1、下が PORT2）。
 *
 * 端子（KEYENCE 入出力回路図より、ポート共通、上から 1〜5）:
 *   4 線式: 1 SDA−（出力）/ 2 SDB+（出力）/ 3 RDA−（入力）/ 4 RDB+（入力）/ 5 SG
 *   2 線式: 1 SR−（入出力）/ 2 SR+（入出力）/ 3・4 未使用 / 5 SG
 * 端子ID は '<ポート番号>-<信号名>'（例: '1-SDA'）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xl402/io-circuit/
 */

const W = 72;
const H = 185;
const SIGNALS: [string, string, string][] = [
  ['SDA', 'SDA-/SR-', '送信データ −（2線式: SR−）'],
  ['SDB', 'SDB+/SR+', '送信データ +（2線式: SR+）'],
  ['RDA', 'RDA-', '受信データ −'],
  ['RDB', 'RDB+', '受信データ +'],
  ['SG', 'SG', '信号グランド'],
];

const ports = [1, 2].map((p) => {
  const ids = SIGNALS.map(([s]) => `${p}-${s}`);
  const labels = Object.fromEntries(SIGNALS.map(([s, print]) => [`${p}-${s}`, print]));
  const y0 = p === 1 ? 62 : 122;
  return { p, y0, ids, block: plugBlockV({ x: 20, y: y0 + 14, ids, pitch: 7, labels, w: 12, labelSide: 'right' }) };
});

/** 終端抵抗スイッチ（スライド） */
const term = (y: number) => `
  <rect x="20" y="${y}" width="7" height="10" rx="0.8" fill="#0d0e0f" stroke="#4a4d52" stroke-width="0.4"/>
  <rect x="20.8" y="${y + 0.8}" width="5.4" height="4.2" rx="0.5" fill="#d9dadc"/>
  ${text(29, y + 3.6, 'ON', 2.4, '#b9bcc1', 'start', 'normal')}
  ${text(29, y + 8.6, 'OFF', 2.4, '#b9bcc1', 'start', 'normal')}
  ${text(38, y + 6, 'TERM.', 2.6, '#d0d3d6', 'start', 'normal')}`;

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XL402', {
    headerH: 32,
    leds: [
      { x: 12, y: 15, label: 'SD' },
      { x: 24, y: 15, label: 'RD', c: 'off' },
      { x: 44, y: 15, label: 'SD', c: 'off' },
      { x: 56, y: 15, label: 'RD' },
    ],
  })}
  ${text(18, 28, 'PORT1', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${text(50, 28, 'PORT2', 2.8, '#b9bcc1', 'middle', 'normal')}
  ${ports.map(({ p, y0, block }) => `${text(4, y0 + 7, `PORT${p}`, 3, '#d0d3d6', 'start')}${term(y0)}${block.svg}`).join('')}
  <path d="M30 181 l3 -5.2 l3 5.2 z" fill="none" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const terminals: TerminalDef[] = ports.flatMap(({ p, ids, block }) =>
  ids.map((id, i) => ({
    id,
    label: `PORT${p} ${SIGNALS[i][1]} ${SIGNALS[i][2]}`,
    x: block.pos[id].x,
    y: block.pos[id].y,
    side: block.pos[id].side,
    role: 'signal' as const,
    optional: true,
  })),
);

const def: DeviceDefinition = {
  type: 'keyence.kv-xl402',
  name: 'PLC シリアル通信ユニット（RS-422A/485）',
  model: 'KV-XL402',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズのシリアルコミュニケーションユニット（RS-422A/RS-485 × 2 ポート、4線式/2線式、5極ヨーロピアン端子台）。伝送速度 1200〜230400bps、総延長 1200m 以内、最大 32 台。終端抵抗は前面の TERM スイッチで ON/OFF する（伝送路の両端だけ ON）。4 線式は SDA−/SDB+ を相手の受信側、RDA−/RDB+ を相手の送信側へ、2 線式は SR−/SR+（端子 1・2）を使う。SG どうしもつなぐ。内部消費電流 150mA。',
  labelPrefix: 'COM',
  width: W,
  height: H,
  svg,
  terminals,
  bus: kvUnitBus(150),
};

export default def;
