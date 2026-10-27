import { IPENDANT_KIND, n2, text } from '../fanuc/parts';
import type { DeviceDefinition } from '../types';

/**
 * ファナック ティーチングペンダント iPendant（R-30iB Plus / Mini Plus 用、タッチパネル付き）。
 *
 * 正面の上にティーチペンダント有効スイッチ（ON/OFF）と非常停止ボタン、中央にカラー液晶（タッチパネル）、
 * 下にファンクションキー・ジョグキー・数字キーが並ぶ。裏面の左右にイネーブルスイッチ（3 ポジション）がある。
 * ケーブル（標準 10m）でコントローラーの TP コネクターにつなぐ。非常停止ボタン・イネーブルスイッチの信号は
 * このケーブルを通ってコントローラーの安全回路に入る（外部への接点はコントローラーの ESPB）。
 *
 * 見た目: 正面を描いた。外形・キーの並びは製品写真の印象から描いたもので、寸法は推定（1mm ≒ 0.5px）。
 */

const W = 120;
const H = 184;
const X_CN = 26;

const key = (x: number, y: number, w: number, h: number, fill: string, label: string, color = '#f1f2f4') => `
  <rect x="${n2(x)}" y="${n2(y)}" width="${w}" height="${h}" rx="1.6" fill="${fill}" stroke="#0e0f11" stroke-width="0.5"/>
  ${label ? text(x + w / 2, y + h / 2 + 1.5, label, 4, color, 'middle', 'bold') : ''}`;

const svg = `
  <defs>
    <linearGradient id="tp-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#25282c"/>
      <stop offset="0.15" stop-color="#3d4248"/>
      <stop offset="0.85" stop-color="#383c42"/>
      <stop offset="1" stop-color="#202327"/>
    </linearGradient>
    <linearGradient id="tp-lcd-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1d4f8f"/>
      <stop offset="1" stop-color="#0e2c55"/>
    </linearGradient>
    <radialGradient id="tp-estop-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#ff6a5a"/>
      <stop offset="0.6" stop-color="#d81e10"/>
      <stop offset="1" stop-color="#8a0d05"/>
    </radialGradient>
  </defs>

  <!-- ケーブルの付け根 -->
  <rect x="${X_CN - 6}" y="${H - 14}" width="12" height="14" rx="2" fill="#1a1c1f" stroke="#000" stroke-width="0.6"/>

  <!-- 本体 -->
  <rect x="5" y="4" width="${W - 10}" height="${H - 14}" rx="11" fill="url(#tp-body-{{uid}})" stroke="#0c0d0f" stroke-width="1"/>

  <!-- ティーチペンダント有効スイッチ（左上）・ロゴ・非常停止ボタン（右上） -->
  <circle cx="21" cy="19" r="7" fill="#c3c7cb" stroke="#4d5156" stroke-width="0.6"/>
  <rect x="15.5" y="17.4" width="11" height="3.2" rx="1.2" fill="#1d1f22" transform="rotate(-40 21 19)"/>
  ${text(21, 32, 'ON/OFF', 3.6, '#d6d9dc', 'middle', 'bold')}
  ${text(W / 2, 21, 'FANUC', 7, '#f6c400', 'middle', 'bold', ' letter-spacing="0.5"')}
  <circle cx="${W - 21}" cy="19" r="11.5" fill="#f6c400" stroke="#8f6c00" stroke-width="0.6"/>
  <circle cx="${W - 21}" cy="19" r="8.2" fill="url(#tp-estop-{{uid}})" stroke="#5c0a04" stroke-width="0.7"/>

  <!-- カラー液晶（タッチパネル） -->
  <rect x="13" y="36" width="${W - 26}" height="64" rx="2" fill="#0b0c0e"/>
  <rect x="16" y="39" width="${W - 32}" height="58" fill="url(#tp-lcd-{{uid}})"/>
  <rect x="16" y="39" width="${W - 32}" height="7" fill="#d9dde2"/>
  ${text(19, 44.5, 'iPendant', 4.6, '#1d1f22', 'start', 'bold')}
  ${Array.from({ length: 6 }, (_, i) => `<rect x="20" y="${50 + i * 7}" width="${[60, 48, 66, 40, 56, 30][i]}" height="2.6" rx="1" fill="#cfe0f5" opacity="0.75"/>`).join('')}

  <!-- ファンクションキー -->
  ${[0, 1, 2, 3, 4].map((i) => key(13 + i * 19, 104, 16, 8, '#5b6067', `F${i + 1}`)).join('')}

  <!-- 数字キー（左）とジョグキー（右） -->
  ${[0, 1, 2, 3].map((r) => [0, 1, 2].map((c) => key(13 + c * 15, 117 + r * 12, 13, 10, '#61666d', String([7, 8, 9, 4, 5, 6, 1, 2, 3, 0, '.', '-'][r * 3 + c]))).join('')).join('')}
  ${['X', 'Y', 'Z', 'J4'].map((a, r) => key(64, 117 + r * 12, 18, 10, '#2f69b7', `−${a}`) + key(85, 117 + r * 12, 18, 10, '#2f69b7', `+${a}`)).join('')}
  ${text(W / 2, H - 16, 'SHIFT', 3.6, '#f6c400', 'middle', 'bold')}`;

const def: DeviceDefinition = {
  type: 'fanuc.ipendant',
  name: 'ティーチングペンダント',
  model: 'iPendant',
  maker: 'ファナック',
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
      note: 'ペンダントのケーブル（標準 10m）。コントローラーの TP コネクターにつなぐ。非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
      x: X_CN,
      y: H,
      side: 'bottom',
      role: 'connector',
      connector: { kind: IPENDANT_KIND, pins: 0, width: 10, style: 'lan', required: true },
    },
  ],
  estimated: '外形・キーの並びは製品写真の印象から描いた推定',
  description:
    'ファナックのティーチングペンダント iPendant（R-30iB Plus / R-30iB Mini Plus 用。カラー液晶のタッチパネル付き）。' +
    'ロボットの教示・手動操作（ジョグ）・プログラムの編集に使う。正面に非常停止ボタンとティーチペンダント有効スイッチ、裏面にイネーブルスイッチ（3 ポジション）がある。' +
    'ケーブルでコントローラーの TP コネクターにつなぐ（非常停止ボタン・イネーブルスイッチの信号はこのケーブルでコントローラーの安全回路に入り、外部へはコントローラーの ESPB の接点で取り出す）。',
};

export default def;
