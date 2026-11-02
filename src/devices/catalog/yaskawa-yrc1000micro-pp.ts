import { n2, text, yaskawaLogo, YRC_PP_KIND } from '../yaskawa/parts';
import type { DeviceDefinition } from '../types';

/**
 * 安川電機 プログラミングペンダント（YRC1000 / YRC1000micro 用、タッチパネル付き）。
 *
 * 正面の左上にモード切換キー（TEACH・PLAY・REMOTE）、右上に非常停止ボタン、中央にカラー液晶（タッチパネル）、
 * 下に軸操作キー・数値キー・[開始]・[ホールド]・[サーボオン レディ] がある。裏面にイネーブルスイッチ（3 ポジション）がある。
 * ケーブルでコントローラーの PP コネクタにつなぐ。非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る。
 *
 * 見た目: 正面を描いた。外形・キーの並びは製品写真の印象から描いたもので、寸法は推定（1mm ≒ 0.5px）。
 */

const W = 124;
const H = 186;
const X_CN = 28;

const key = (x: number, y: number, w: number, h: number, fill: string, label: string, color = '#1d1f22', size = 3.6) => `
  <rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${h}" rx="1.6" fill="${fill}" stroke="#7d8287" stroke-width="0.5"/>
  ${label ? text(x + w / 2, y + h / 2 + 1.3, label, size, color, 'middle', 'bold') : ''}`;

const svg = `
  <defs>
    <linearGradient id="pp-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#c9ccce"/>
      <stop offset="0.15" stop-color="#eceeef"/>
      <stop offset="0.85" stop-color="#e6e8e9"/>
      <stop offset="1" stop-color="#c2c5c8"/>
    </linearGradient>
    <linearGradient id="pp-lcd-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2a5d9a"/>
      <stop offset="1" stop-color="#143760"/>
    </linearGradient>
    <radialGradient id="pp-estop-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ff6a5a"/>
      <stop offset="0.6" stop-color="#d81e10"/>
      <stop offset="1" stop-color="#8a0d05"/>
    </radialGradient>
  </defs>

  <!-- ケーブルの付け根 -->
  <rect x="${X_CN - 6}" y="${H - 14}" width="12" height="14" rx="2" fill="#2a2c2f" stroke="#000" stroke-width="0.6"/>

  <!-- 本体（明るいグレー。握りやすい丸みのある形） -->
  <path d="M14 4 H${W - 14} Q${W - 4} 4 ${W - 4} 16 V${H - 26} Q${W - 4} ${H - 12} ${W - 18} ${H - 12} H18 Q4 ${H - 12} 4 ${H - 26} V16 Q4 4 14 4 Z" fill="url(#pp-body-{{uid}})" stroke="#7d8287" stroke-width="1"/>

  <!-- モード切換キー（左上）・ロゴ・非常停止ボタン（右上） -->
  <circle cx="21" cy="19" r="7.5" fill="#2a2c2f" stroke="#000" stroke-width="0.6"/>
  <rect x="15" y="17.4" width="12" height="3.2" rx="1.2" fill="#c9ccce" transform="rotate(-30 21 19)"/>
  ${text(21, 33, 'TEACH PLAY REM', 2.6, '#333', 'middle', 'bold')}
  ${yaskawaLogo(W / 2, 22, 7, '#0068b7', 'middle')}
  <circle cx="${W - 21}" cy="19" r="11.5" fill="#f6c400" stroke="#8f6c00" stroke-width="0.6"/>
  <circle cx="${W - 21}" cy="19" r="8.2" fill="url(#pp-estop-{{uid}})" stroke="#5c0a04" stroke-width="0.7"/>

  <!-- カラー液晶（タッチパネル） -->
  <rect x="12" y="38" width="${W - 24}" height="66" rx="2" fill="#0b0c0e"/>
  <rect x="15" y="41" width="${W - 30}" height="60" fill="url(#pp-lcd-{{uid}})"/>
  <rect x="15" y="41" width="${W - 30}" height="7" fill="#dfe3e8"/>
  ${text(18, 46.5, 'JOB  EDIT  DISPLAY  UTILITY', 3.4, '#1d1f22', 'start', 'bold')}
  ${Array.from({ length: 6 }, (_, i) => `<rect x="19" y="${52 + i * 7.5}" width="${[56, 70, 44, 62, 38, 50][i]}" height="2.6" rx="1" fill="#cfe0f5" opacity="0.75"/>`).join('')}

  <!-- 開始・ホールド・サーボオン -->
  ${key(12, 108, 30, 9, '#3fa35a', 'START', '#fff')}
  ${key(46, 108, 30, 9, '#e8eaeb', 'HOLD')}
  ${key(80, 108, 32, 9, '#e8eaeb', 'SERVO ON', '#1d1f22', 3)}

  <!-- 数値キー（左）と軸操作キー（右） -->
  ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => key(12 + c * 15, 121 + r * 11, 13, 9, '#f4f5f6', String([7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.', '-'][r * 3 + c]))).join('')).join('')}
  ${['X', 'Y', 'Z', 'E'].map((a, r) => key(62, 121 + r * 11, 23, 9, '#2f69b7', `${a}−`, '#fff') + key(88, 121 + r * 11, 23, 9, '#2f69b7', `${a}+`, '#fff')).join('')}`;

const def: DeviceDefinition = {
  type: 'yaskawa.yrc1000micro-pp',
  name: 'ティーチングペンダント',
  model: 'プログラミングペンダント（YRC1000micro 用）',
  maker: '安川電機',
  category: 'control',
  labelPrefix: 'TP',
  width: W,
  height: H,
  svg,
  terminals: [
    {
      id: 'PP',
      label: 'PP ケーブル',
      hint: 'PP ケーブル',
      note: 'ペンダントのケーブル。コントローラー YRC1000micro の PP コネクタにつなぐ。非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
      x: X_CN,
      y: H,
      side: 'bottom',
      role: 'connector',
      connector: { kind: YRC_PP_KIND, pins: 0, width: 10, style: 'lan', required: true },
    },
  ],
  estimated: '外形・キーの並びは製品写真の印象から描いた推定。型式は書いていない（コントローラーの注文時に選ぶ）',
  description:
    '安川電機のプログラミングペンダント（YRC1000 / YRC1000micro 用。カラー液晶のタッチパネル付き）。ロボットの教示・手動操作（軸操作）・ジョブの編集に使う。' +
    '正面にモード切換キー（TEACH・PLAY・REMOTE）と非常停止ボタン、裏面にイネーブルスイッチ（3 ポジション）がある。' +
    'ケーブルでコントローラーの PP コネクタにつなぐ（非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入る）。タブレット形のスマートペンダントも選べる。',
};

export default def;
