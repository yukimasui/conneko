/**
 * SMC の真空機器: 真空エジェクタ ZH（ボックスタイプ、サイレンサ付き）と吸着パッド ZP。
 *
 * 出典: SMC 真空エジェクタ ZH シリーズ・吸着パッド ZP シリーズ カタログ
 *   ZH□BS-□-□: ボックスタイプ（B）、サイレンサ排気（S）。ノズル径 05（φ0.5）・07・10・13、供給ポート・真空ポートはワンタッチ管継手
 *   ZP□□N: パッド径 + 形状（U: 平形、B: ベローズ形）+ 材質（N: ニトリルゴム（黒）、S: シリコーンゴム（白））
 *
 * エアのポート: エジェクタの SUP（供給。圧力のあるエアを入れる）、V（真空）、EXH（内蔵サイレンサからの排気）。
 * 真空は圧力の計算の対象外とし、真空のポートどうし（エジェクタの V・パッド・真空用圧力スイッチ）をチューブでつなぐ。
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { oneTouch, SMC_GRADIENTS, smcLogo, text, tubeOdParam } from './parts';

const pad2 = (n: number) => String(n).padStart(2, '0');

/** 真空エジェクタ ZH（ボックスタイプ・サイレンサ付き） */
export function buildZh(type: string): DeviceDefinition {
  const W = 120;
  const H = 66;
  const cy = 40;
  const bx = 16;
  const bw = 54;
  const svg = (p: ParamValues) => {
    const sup = Number(p.supTube);
    const vac = Number(p.vacTube);
    const vx = bx + bw / 2;
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(2, cy, 'left', sup, bx - 2)}
  <!-- 本体（アルミ） -->
  <rect x="${bx}" y="${cy - 13}" width="${bw}" height="26" rx="2" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.7"/>
  ${oneTouch(vx, 2, 'top', vac, cy - 15)}
  <!-- ノズル・ディフューザの記号 -->
  <path d="M${bx + 6} ${cy - 4} L${bx + 20} ${cy - 1} V${cy + 1} L${bx + 6} ${cy + 4} Z" fill="#555"/>
  <path d="M${bx + 26} ${cy - 2} L${bx + bw - 4} ${cy - 6} V${cy + 6} L${bx + 26} ${cy + 2} Z" fill="none" stroke="#555" stroke-width="0.8"/>
  <line x1="${vx}" y1="${cy - 13}" x2="${vx}" y2="${cy - 2}" stroke="#555" stroke-width="0.8" stroke-dasharray="1.4 1"/>
  ${text(bx + 18, cy + 10, `ZH${p.nozzle}BS`, 4.6, '#222')}
  <!-- サイレンサ（黒い樹脂に白い吸音材） -->
  <rect x="${bx + bw}" y="${cy - 10}" width="8" height="20" fill="#2b2c2e" stroke="#000" stroke-width="0.5"/>
  <rect x="${bx + bw + 8}" y="${cy - 9}" width="${W - bx - bw - 12}" height="18" rx="4" fill="#1f2022" stroke="#000" stroke-width="0.5"/>
  ${Array.from({ length: 6 }, (_, i) => `<line x1="${bx + bw + 13 + i * 6}" y1="${cy - 7}" x2="${bx + bw + 13 + i * 6}" y2="${cy + 7}" stroke="#efefe8" stroke-width="1.6"/>`).join('')}
  ${text(4, cy - 14, 'SUP', 4.4, '#1f5fa8', 'bold', 'start')}
  ${text(vx + 12, 10, 'V', 5, '#7b3fa0')}
  ${text(W - 14, cy + 17, 'EXH', 4.4, '#555')}
  ${smcLogo(bx + 42, cy + 10, 4)}`;
  };
  return {
    type,
    name: '真空エジェクタ',
    model: 'ZH10BS-06-06',
    modelOf: (p) => `ZH${p.nozzle}BS-${pad2(Number(p.supTube))}-${pad2(Number(p.vacTube))}`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC の真空エジェクタ ZH シリーズ（ボックスタイプ、サイレンサ付き）。SUP に圧縮エアを流すと、ノズルとディフューザの働きで V に真空ができる（標準供給圧力 0.45MPa 前後）。' +
      'SUP の手前に 2 ポートまたは 3 ポートの電磁弁を置いて真空のオン・オフをし、V を吸着パッドへチューブでつなぐ（途中に真空用圧力スイッチ ZSE20 を入れて吸着を確かめる）。排気は内蔵のサイレンサから出る。ノズル径が大きいほど吸込流量とエアの消費が増える。',
    labelPrefix: 'EJ',
    width: W,
    height: H,
    svg,
    terminals: [
      { id: 'SUP', label: 'SUP', hint: '供給 SUP', note: '供給ポート（電磁弁から圧縮エアを入れる）', x: 2, y: cy, side: 'left', role: 'air', air: { kind: 'in', tubeOD: { param: 'supTube' }, minPressure: 0.2, maxPressure: 0.7 } },
      { id: 'V', label: 'V', hint: '真空 V', note: '真空ポート（吸着パッドへ）', x: bx + bw / 2, y: 2, side: 'top', role: 'air', air: { kind: 'vacuum', tubeOD: { param: 'vacTube' } } },
      { id: 'EXH', label: 'EXH', hint: '排気 EXH', note: '排気（内蔵サイレンサから大気へ。配管しない）', x: W - 2, y: cy, side: 'right', role: 'air', optional: true, air: { kind: 'exhaust' } },
    ],
    airLinks: [{ from: 'SUP', to: 'EXH', directed: true }],
    params: [
      {
        key: 'nozzle',
        label: 'ノズル径',
        options: [
          { value: '05', label: 'φ0.5（05）' },
          { value: '07', label: 'φ0.7（07）' },
          { value: '10', label: 'φ1.0（10）' },
          { value: '13', label: 'φ1.3（13）' },
        ],
        default: '10',
      },
      tubeOdParam('supTube', 'SUP の継手', [4, 6, 8], 6),
      tubeOdParam('vacTube', 'V の継手', [4, 6, 8], 6),
    ],
    pneumatic: { symbol: 'vacuum-ejector', ports: { in: 'SUP', vac: 'V', exh: 'EXH' } },
    estimated: '使用圧力範囲（0.2〜0.7MPa）、ノズル径と継手の組み合わせ、外観は推定',
  };
}

/** 吸着パッド ZP（ワンタッチ管継手付きのアダプタに付けた姿） */
const DIAS = [10, 13, 16, 20, 25, 32, 40, 50];

export function buildZp(type: string): DeviceDefinition {
  const W = 64;
  const H = 72;
  const cx = W / 2;
  const svg = (p: ParamValues) => {
    const dia = Number(p.dia);
    const od = Number(p.tubeOD);
    const pw = 12 + dia * 0.9;
    const rubber = p.material === 'S' ? '#f1efe6' : '#1d1e20';
    const edge = p.material === 'S' ? '#9a968a' : '#000';
    const bellows = p.form === 'B';
    const padTop = bellows ? 40 : 48;
    const bel = bellows
      ? `<path d="M${cx - 9} 34 h18 l4 4 l-4 4 l4 4 l-4 4 h-18 l-4 -4 l4 -4 l-4 -4 Z" fill="${rubber}" stroke="${edge}" stroke-width="0.6"/>`
      : '';
    return `<defs>${SMC_GRADIENTS}</defs>
  ${oneTouch(cx, 2, 'top', od, 12)}
  <!-- アダプタ（金属） -->
  <rect x="${cx - 7}" y="14" width="14" height="10" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <rect x="${cx - 9}" y="24" width="18" height="6" rx="1" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  <rect x="${cx - 5}" y="30" width="10" height="${padTop - 30}" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.6"/>
  ${bel}
  <!-- パッド（ゴム） -->
  <path d="M${cx - 6} ${padTop} H${cx + 6} L${cx + pw / 2} ${padTop + 8} V${padTop + 11} H${cx - pw / 2} V${padTop + 8} Z" fill="${rubber}" stroke="${edge}" stroke-width="0.6"/>
  ${text(cx, H - 3, `φ${dia}`, 4.8, '#333')}`;
  };
  return {
    type,
    name: '吸着パッド',
    model: 'ZP16UN',
    modelOf: (p) => `ZP${p.dia}${p.form}${p.material}`,
    maker: 'SMC',
    category: 'air-fitting',
    description:
      'SMC の吸着パッド ZP シリーズ（ワンタッチ管継手付きのアダプタに付けた姿）。真空エジェクタ（または真空ポンプと真空切換弁）の真空でワークを吸い付けて持ち上げる。' +
      '形状は平形（U: 平らなワーク）・ベローズ形（B: 傾き・段差のあるワーク）、材質はニトリルゴム（N: 黒、一般用）・シリコーンゴム（S: 白、食品・跡が付きにくい）。型式はパッド本体のもので、アダプタ・継手は含まない。',
    labelPrefix: 'PAD',
    width: W,
    height: H,
    svg,
    terminals: [{ id: 'V', label: 'V', hint: '真空 V', note: '真空ポート（エジェクタの V へ）', x: cx, y: 2, side: 'top', role: 'air', air: { kind: 'vacuum', tubeOD: { param: 'tubeOD' } } }],
    params: [
      { key: 'dia', label: 'パッド径', unit: 'mm', options: DIAS.map((d) => ({ value: d, label: `φ${d}` })), default: 16 },
      {
        key: 'form',
        label: '形状',
        options: [
          { value: 'U', label: 'U（平形）' },
          { value: 'B', label: 'B（ベローズ形）' },
        ],
        default: 'U',
      },
      {
        key: 'material',
        label: '材質',
        options: [
          { value: 'N', label: 'N（ニトリルゴム・黒）' },
          { value: 'S', label: 'S（シリコーンゴム・白）' },
        ],
        default: 'N',
      },
      tubeOdParam('tubeOD', '継手', [4, 6], 4),
    ],
    pneumatic: { symbol: 'vacuum-pad', ports: { vac: 'V' } },
  };
}
