import { pendantSvg } from '../generic/robot-pendant';
import { KAWASAKI_TP_KIND, kawasakiLogo } from '../kawasaki/parts';
import type { DeviceDefinition } from '../types';

/**
 * 川崎重工業 ティーチペンダント（E コントローラー用、タッチパネル付き）。
 *
 * 正面の右上に非常停止ボタン、左上にティーチ・リピートの切換スイッチ、中央にカラー液晶（タッチパネル）、下にキーが並ぶ。
 * 裏面にイネーブルスイッチ（3 ポジション）がある。ケーブルでコントローラーの TP コネクターにつなぐ。
 * 非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る。
 *
 * 見た目: 正面を描いた。外形・キーの並びは製品写真の印象から描いたもので、寸法は推定（1mm ≒ 0.5px）。
 */

const W = 124;
const H = 186;
const X_CN = 28;

const svg = pendantSvg({
  p: 'ktp',
  w: W,
  h: H,
  body: ['#c9cac5', '#ecece8'],
  edge: '#7d8287',
  logo: kawasakiLogo(W / 2, 22, 8, '#d7000f'),
  title: 'AUX  PROGRAM  I/O  MONITOR',
  keyFill: '#f4f5f6',
  keyText: '#1d1f22',
  jogFill: '#3a3e44',
  jog: ['JT1', 'JT2', 'JT3', 'JT4'],
  row: [
    { label: 'A', fill: '#e8eaeb', color: '#1d1f22' },
    { label: 'HOLD', fill: '#f2c200', color: '#1d1f22' },
    { label: 'RUN', fill: '#3fa35a', color: '#fff' },
  ],
  cableX: X_CN,
  topLeft: `
  <circle cx="21" cy="19" r="7.5" fill="#2a2c2f" stroke="#000" stroke-width="0.6"/>
  <rect x="15" y="17.4" width="12" height="3.2" rx="1.2" fill="#c9ccce" transform="rotate(-30 21 19)"/>
  <text x="21" y="32.5" text-anchor="middle" font-family="sans-serif" font-size="2.8" font-weight="bold" fill="#333">TEACH REPEAT</text>`,
});

const def: DeviceDefinition = {
  type: 'kawasaki.e01-tp',
  name: 'ティーチングペンダント',
  model: 'ティーチペンダント（E コントローラー用）',
  maker: '川崎重工業',
  category: 'control',
  labelPrefix: 'TP',
  width: W,
  height: H,
  svg,
  terminals: [
    {
      id: 'TP',
      label: 'TP ケーブル',
      hint: 'TP ケーブル',
      note: 'ペンダントのケーブル。コントローラー E01 の TP コネクターにつなぐ。非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
      x: X_CN,
      y: H,
      side: 'bottom',
      role: 'connector',
      connector: { kind: KAWASAKI_TP_KIND, pins: 0, width: 10, style: 'lan', required: true },
    },
  ],
  estimated: '外形・キーの並びは製品写真の印象から描いた推定。型式は書いていない（コントローラーの注文時に選ぶ）',
  description:
    '川崎重工業のティーチペンダント（E コントローラー用。カラー液晶のタッチパネル付き）。ロボットの教示・手動操作・プログラムの編集に使う。' +
    '正面に非常停止ボタンとティーチ・リピートの切換スイッチ、裏面にイネーブルスイッチ（3 ポジション）がある。' +
    'ケーブルでコントローラーの TP コネクターにつなぐ（非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る）。',
};

export default def;
