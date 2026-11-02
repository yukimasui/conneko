import type { DeviceDefinition, ParamValues } from '../types';
import { defs, logo, screw } from '../mitsubishi/ms-t';
import { fitSize } from '../generic/power-parts';

/**
 * 三菱電機 漏電リレー NV-ZBA（互換形・小形経済品。電気式自己保持、零相変流器 ZCT と組み合わせる）。
 * 漏電リレーは遮断を行わず、零相変流器（mitsubishi.zt-b）で地絡電流を検出すると内蔵の 1c 接点を切り換えて知らせる。
 * 接点で警報（ブザー・表示灯）を鳴らしたり、電磁接触器のコイル回路を切ったり、遮断器の電圧引外し装置を動かしたりする。
 *
 * 出典: 三菱電機 低圧遮断器の仕様ページ（NV-ZBA: 制御電圧 100・200V 切換、内蔵接点 1c、連続通電電流 5A、
 * 接点容量 AC100・200V cosφ=1 5A / cosφ=0.4 2A、DC24V 5A）、漏電リレーの製品特長（ZBA シリーズは電気式自己保持形、
 * ZCT ZT15B〜ZT100B と自由に組み合わせられる）、販売店の仕様表（感度 30mA 高速形 / 100・200・500mA 切換 時延形）。
 * ZCT の k を Z1、l を Z2 につなぐ（逆につなぐと検出できない）。
 *
 * 推定: 外形と端子の並び、操作電源の端子（1-2 で AC100V、1-3 で AC200V。取扱いの資料の記述から）、
 * 接点の端子記号（c・a・b）、消費電流。
 */

const W = 104;
const H = 150;
const TOP_Y = 17;
const BOT_Y = H - 17;
const TOP_X = [14, 33, 52, 75, 92];
const BOT_X = [30, 52, 74];

const svg = (p: ParamValues) => {
  const sens = p.sensitivity === 30 ? '30mA' : '100·200·500mA';
  const kind = p.sensitivity === 30 ? '高速形 0.1s' : '時延形';
  return `
  ${defs}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3.5" fill="url(#body-{{uid}})" stroke="#8d897f" stroke-width="1.2"/>
  <!-- 上段: 操作電源 1・2・3、ZCT 入力 Z1・Z2 -->
  <rect x="4" y="4" width="${W - 8}" height="26" rx="1.5" fill="url(#pocket-{{uid}})"/>
  <rect x="62.5" y="5" width="2" height="24" fill="#a49f92"/>
  ${TOP_X.map((x) => screw(x, TOP_Y, 5)).join('')}
  ${['1', '2', '3', 'Z1', 'Z2'].map((t, i) => `<text x="${TOP_X[i]}" y="38" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">${t}</text>`).join('')}
  <text x="33" y="45" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">0 · 100 · 200V</text>
  <text x="83.5" y="45" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">ZCT</text>
  <!-- 前面 -->
  <rect x="7" y="49" width="${W - 14}" height="${H - 98}" rx="3" fill="#f3f1ec" stroke="#a7a399" stroke-width="0.8"/>
  ${logo(11, 53)}
  <text x="11" y="71" font-family="sans-serif" font-size="9" font-weight="bold" fill="#222">NV-ZBA</text>
  <text x="11" y="78" font-family="sans-serif" font-size="3.6" fill="#555">EARTH LEAKAGE RELAY</text>
  <rect x="11" y="82" width="46" height="13" rx="1.5" fill="#fff" stroke="#777" stroke-width="0.6"/>
  <text x="34" y="91" text-anchor="middle" font-family="sans-serif" font-size="${fitSize(sens, 44, 6.5)}" font-weight="bold" fill="#222">${sens}</text>
  <text x="11" y="100" font-family="sans-serif" font-size="3.6" fill="#555">${kind}</text>
  <!-- 漏電表示（LED）・テスト・リセット -->
  <circle cx="80" cy="60" r="4" fill="#5a1010" stroke="#333" stroke-width="0.5"/>
  <circle cx="80" cy="60" r="2.6" fill="#e0262c"/>
  <text x="80" y="70" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">LEAK</text>
  <circle cx="72" cy="83" r="5.5" fill="#c9c5bb" stroke="#8e897c" stroke-width="0.6"/>
  <circle cx="72" cy="83" r="4" fill="#f3c300" stroke="#8a6d00" stroke-width="0.6"/>
  <circle cx="88" cy="83" r="5.5" fill="#c9c5bb" stroke="#8e897c" stroke-width="0.6"/>
  <circle cx="88" cy="83" r="4" fill="#3a3a3a" stroke="#111" stroke-width="0.6"/>
  <text x="72" y="94" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">TEST</text>
  <text x="88" y="94" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">RESET</text>
  <!-- 下段: 内蔵接点 1c（c・a・b） -->
  <text x="${BOT_X[0]}" y="${BOT_Y - 13}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">a</text>
  <text x="${BOT_X[1]}" y="${BOT_Y - 13}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">c</text>
  <text x="${BOT_X[2]}" y="${BOT_Y - 13}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#333">b</text>
  <text x="${W / 2}" y="${BOT_Y - 21}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">1c AC100/200V 5A</text>
  <rect x="4" y="${H - 30}" width="${W - 8}" height="26" rx="1.5" fill="url(#pocket-{{uid}})"/>
  ${BOT_X.map((x) => screw(x, BOT_Y, 5)).join('')}
`;
};

const def: DeviceDefinition = {
  type: 'mitsubishi.nv-zba',
  name: '漏電リレー',
  model: 'NV-ZBA',
  modelOf: (p) => (p.sensitivity === 30 ? 'NV-ZBA 30mA' : 'NV-ZBA 100・200・500mA'),
  maker: '三菱電機',
  category: 'breaker',
  description:
    '三菱電機の漏電リレー NV-ZBA（電気式自己保持形）。零相変流器 ZCT の k・l を Z1・Z2 につなぎ、主回路の地絡（漏電）を検出すると内蔵の 1c 接点（c-a が閉、c-b が開）を切り換え、前面の LED で知らせる。' +
    'リレー自身は遮断しないので、接点で警報を出すか、電磁接触器のコイル回路・遮断器の電圧引外し装置を動かして回路を切る。リセットボタンで復帰する。操作電源は AC100V（1-2）または AC200V（1-3）。接点容量 AC100・200V 5A（抵抗負荷）、DC24V 5A。',
  estimated: '外形と端子の並び、操作電源の端子（1-2 = AC100V、1-3 = AC200V）、接点の端子記号（c・a・b）、消費電流（約 3VA）は推定。',
  labelPrefix: 'ELR',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: '1', hint: '操作電源', note: '操作電源の共通（0）', x: TOP_X[0], y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 90, maxVoltage: 242 } },
    { id: '2', hint: '電源 100V', note: '操作電源 AC100V（1-2 間）', x: TOP_X[1], y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 90, maxVoltage: 121 }, optional: true },
    { id: '3', hint: '電源 200V', note: '操作電源 AC200V（1-3 間）', x: TOP_X[2], y: TOP_Y, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 180, maxVoltage: 242 }, optional: true },
    { id: 'Z1', hint: 'ZCT k', note: '零相変流器の k をつなぐ', x: TOP_X[3], y: TOP_Y, side: 'top', role: 'signal' },
    { id: 'Z2', hint: 'ZCT l', note: '零相変流器の l をつなぐ', x: TOP_X[4], y: TOP_Y, side: 'top', role: 'signal' },
    { id: 'a', hint: 'a 接点', note: '内蔵接点の a 接点（漏電で c と閉じる）', x: BOT_X[0], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: 'c', hint: '接点共通', note: '内蔵接点の共通', x: BOT_X[1], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: 'b', hint: 'b 接点', note: '内蔵接点の b 接点（漏電で c と開く）', x: BOT_X[2], y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ],
  // 内蔵接点 1c（漏電を検出して動作し、リセットまで自己保持する）。接点容量は AC100・200V cosφ=1 で 5A
  links: [
    { from: 'c', to: 'a', switch: 'NO', ratedCurrent: 5 },
    { from: 'c', to: 'b', switch: 'NC', ratedCurrent: 5 },
  ],
  params: [
    {
      key: 'sensitivity',
      label: '定格感度電流',
      unit: 'mA',
      options: [
        { value: 30, label: '30mA（高速形）' },
        { value: '100-200-500', label: '100・200・500mA 切換（時延形）' },
      ],
      default: '100-200-500',
    },
  ],
  distinctGroups: [
    ['1', '2'],
    ['1', '3'],
  ],
  loadCurrent: 0.015,
};

export default def;
