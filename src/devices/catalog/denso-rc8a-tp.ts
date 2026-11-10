import { DENSO_TP_KIND, densoLogo } from '../denso/parts';
import { pendantSvg } from '../generic/robot-pendant';
import type { DeviceDefinition } from '../types';

/**
 * デンソーウェーブ ティーチングペンダント（RC8 / RC8A 用、タッチパネル付き）。
 *
 * 正面の右上に非常停止ボタン、左上にモード切換のキースイッチ（TEACH・AUTO・EXT）、中央にカラー液晶（タッチパネル）、
 * 下にモーター・速度・軸操作のキーがある。裏面にイネーブルスイッチ（3 ポジション）がある。ケーブルでコントローラーの TP コネクターにつなぐ。
 * 非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る。
 *
 * 見た目: 正面を描いた。外形・キーの並びは製品写真の印象から描いたもので、寸法は推定（1mm ≒ 0.5px）。
 */

const W = 124;
const H = 186;
const X_CN = 28;

const svg = pendantSvg({
  p: 'dtp',
  w: W,
  h: H,
  body: ['#2b2e33', '#45494f'],
  edge: '#0e0f11',
  logo: `<rect x="${W / 2 - 18}" y="13" width="36" height="11" rx="1.5" fill="#f4f5f6"/>${densoLogo(W / 2, 21.6, 7.4)}`,
  title: 'TEACH  ARM  I/O  PROGRAM',
  keyFill: '#5d6268',
  keyText: '#f1f2f4',
  jogFill: '#2f69b7',
  jog: ['J1', 'J2', 'J3', 'J4'],
  row: [
    { label: 'MOTOR', fill: '#3fa35a', color: '#fff' },
    { label: 'SPEED', fill: '#c9ccce', color: '#1d1f22' },
    { label: 'CAL', fill: '#c9ccce', color: '#1d1f22' },
  ],
  cableX: X_CN,
  topLeft: `
  <circle cx="21" cy="19" r="7.5" fill="#c3c7cb" stroke="#4d5156" stroke-width="0.6"/>
  <rect x="17.8" y="13.5" width="6.4" height="11" rx="1.5" fill="#1d1f22" transform="rotate(30 21 19)"/>
  <text x="21" y="32.5" text-anchor="middle" font-family="sans-serif" font-size="2.8" font-weight="bold" fill="#d6d9dc">TEACH AUTO EXT</text>`,
});

const def: DeviceDefinition = {
  type: 'denso.rc8a-tp',
  name: 'ティーチングペンダント',
  model: 'ティーチングペンダント（RC8A 用）',
  maker: 'デンソーウェーブ',
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
      note: 'ペンダントのケーブル。コントローラー RC8A の TP コネクターにつなぐ。非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
      x: X_CN,
      y: H,
      side: 'bottom',
      role: 'connector',
      connector: { kind: DENSO_TP_KIND, pins: 0, width: 10, style: 'lan', required: true },
    },
  ],
  estimated: '外形・キーの並び・モード切換の名前は製品写真の印象から描いた推定。型式は書いていない（コントローラーの注文時に選ぶ）',
  description:
    'デンソーウェーブのティーチングペンダント（RC8 / RC8A 用。カラー液晶のタッチパネル付き）。ロボットの教示・手動操作・プログラムの編集に使う。' +
    '正面に非常停止ボタンとモード切換のキースイッチ、裏面にイネーブルスイッチ（3 ポジション）がある。' +
    'ケーブルでコントローラーの TP コネクターにつなぐ（非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る）。',
};

export default def;
