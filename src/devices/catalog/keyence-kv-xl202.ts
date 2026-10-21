import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody2, kvDefs, plugBlockV, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ シリアルコミュニケーションユニット KV-XL202（RS-232C × 2 ポート）。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。上部の表示部に PORT1/PORT2 の SD・RD LED、
 * 正面に 7極のヨーロピアン端子台（脱着式）が縦に 2 個（上が PORT1、下が PORT2）。端子名は端子台の右側に印字。
 *
 * 端子（KEYENCE 入出力回路図より、ポート共通、上から 1〜7）:
 *   1 SD（送信データ, 出力）/ 2 RD（受信データ, 入力）/ 3 RS（送信要求, 出力）/ 4 CS（送信可, 入力）/
 *   5 ER（データ端末レディ, 出力）/ 6 DR（データセットレディ, 入力）/ 7 SG（信号グランド）
 * 端子ID は '<ポート番号>-<信号名>'（例: '1-SD'）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-xl202/io-circuit/
 */

const W = 72;
const H = 185;
const SIGNALS: [string, string][] = [
  ['SD', '送信データ（出力）'],
  ['RD', '受信データ（入力）'],
  ['RS', '送信要求（出力）'],
  ['CS', '送信可（入力）'],
  ['ER', 'データ端末レディ（出力）'],
  ['DR', 'データセットレディ（入力）'],
  ['SG', '信号グランド'],
];

const ports = [1, 2].map((p) => {
  const ids = SIGNALS.map(([s]) => `${p}-${s}`);
  const labels = Object.fromEntries(SIGNALS.map(([s]) => [`${p}-${s}`, s]));
  return { p, ids, block: plugBlockV({ x: 24, y: p === 1 ? 62 : 122, ids, pitch: 7, labels, w: 12, labelSide: 'right' }) };
});

const svg = `
  ${kvDefs()}
  ${kvBody2(W, H, 'KV-XL202', {
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
  ${ports.map(({ p, block }) => `${text(4, p === 1 ? 60 : 120, `PORT${p}`, 3, '#d0d3d6', 'start')}${block.svg}`).join('')}
  <path d="M30 181 l3 -5.2 l3 5.2 z" fill="none" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const terminals: TerminalDef[] = ports.flatMap(({ p, ids, block }) =>
  ids.map((id, i) => ({
    id,
    label: `PORT${p} ${SIGNALS[i][0]} ${SIGNALS[i][1]}`,
    x: block.pos[id].x,
    y: block.pos[id].y,
    side: block.pos[id].side,
    role: 'signal' as const,
    optional: true,
  })),
);

const def: DeviceDefinition = {
  type: 'keyence.kv-xl202',
  name: 'PLC シリアル通信ユニット（RS-232C）',
  model: 'KV-XL202',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズのシリアルコミュニケーションユニット（RS-232C × 2 ポート、7極ヨーロピアン端子台）。伝送速度 1200〜230400bps、伝送距離 15m、1 ポートにつき 1 台。無手順・PROTOCOL STUDIO・Modbus スレーブ・PLC リンクなどでバーコードリーダ・計測器・温調器などとつなぐ。相手機器とは SD↔RD をたすき掛けにし、SG どうしをつなぐ（RS/CS・ER/DR はフロー制御を使う場合）。内部消費電流 140mA。',
  labelPrefix: 'COM',
  width: W,
  height: H,
  svg,
  terminals,
};

export default def;
