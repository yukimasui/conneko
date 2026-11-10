/**
 * シーメンス SIMATIC S7-1200 の CPU 1214C DC/DC/DC（6ES7214-1AG40-0XB0。DC24V 電源・DC 入力 14 点・トランジスタ出力 10 点・アナログ入力 2 点）。
 *
 * 外形 W110 × H100 × D75 mm（1mm ≒ 2px）。本体はダークグレー。上下に着脱式のネジ端子台（コネクタ）があり、
 * 左に動作表示 LED（RUN/STOP・ERROR・MAINT）、中央に SIEMENS のロゴと SIMATIC S7-1200、入出力の表示 LED、
 * 左下に PROFINET ポート（X1 P1、RJ-45）。
 *
 * 端子（左から。シーメンスの S7-1200 システムマニュアルのピン表の写しと第三者の資料による。上下どちらの端子台に
 * センサー電源の L+・M があるかは資料で食い違うため、下側の左端とした（推定））:
 *   上（X10・X11）: L+ M ⏚ 1M DIa.0〜.7 DIb.0〜.5 ／ 2M AI0 AI1
 *   下（X12）:       L+ M（センサー電源出力）3L+ 3M DQa.0〜.7 DQb.0〜.1
 * 入出力のアドレスは既定の I0.0〜I1.5・Q0.0〜Q1.1・IW64・IW66（TIA Portal のデバイス設定で変えられる）。
 * 端子 ID はアドレス（I0.0 など）、ラベルは「アドレス (DIa.0)」。
 *
 * 出典: 6ES7214-1AG40-0XB0 のデータシート（DC24V 20.4〜28.8V、DI 14 点 DC24V シンク/ソース、DQ 10 点 DC24V トランジスタ（ソース）0.5A、
 *       AI 2 点 0〜10V、PROFINET 1 ポート、CPU の消費電流 約 500mA・拡張込み最大 1500mA、センサー電源 DC24V 400mA）
 */
import type { DeviceDefinition, InternalLink, TerminalDef } from '../types';

const W = 220;
const H = 200;
const P = 9.4;
const X0 = 11;
const TOP_Y = 13;
const BOT_Y = 187;

interface Slot {
  id: string;
  print: string;
  x: number;
}

const di = [...Array.from({ length: 8 }, (_, i) => `I0.${i}`), ...Array.from({ length: 6 }, (_, i) => `I1.${i}`)];
const dq = [...Array.from({ length: 8 }, (_, i) => `Q0.${i}`), 'Q1.0', 'Q1.1'];

/** 上の端子台（X10: 電源・入力、X11: アナログ入力） */
const TOP: Slot[] = [
  ...['L+', 'M', 'FE', '1M', ...di].map((id, i) => ({ id, print: id === 'FE' ? '⏚' : id.startsWith('I') ? `.${id.split('.')[1]}` : id, x: +(X0 + i * P).toFixed(1) })),
  ...['2M', 'AI0', 'AI1'].map((id, i) => ({ id, print: id === '2M' ? '2M' : id.slice(2), x: +(X0 + 18 * P + 8 + i * P).toFixed(1) })),
];
/** 下の端子台（X12: センサー電源出力・出力） */
const BOTTOM: Slot[] = ['SL+', 'SM', '3L+', '3M', ...dq].map((id, i) => ({
  id,
  print: id === 'SL+' ? 'L+' : id === 'SM' ? 'M' : id.startsWith('Q') ? `.${id.split('.')[1]}` : id,
  x: +(X0 + i * P + (i >= 2 ? 6 : 0)).toFixed(1),
}));

const t = (x: number, y: number, s: string, size = 3.4, fill = '#e4e6e8', anchor = 'middle', weight = 'normal') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const screw = (x: number, y: number) => `
  <rect x="${x - 4.2}" y="${y - 5}" width="8.4" height="10" rx="0.8" fill="#0f1011" stroke="#3b3e42" stroke-width="0.4"/>
  <circle cx="${x}" cy="${y}" r="3.2" fill="url(#s7screw-{{uid}})" stroke="#555" stroke-width="0.4"/>
  <path d="M${x - 2} ${y} H${x + 2}" stroke="#444" stroke-width="0.9"/>`;

const strip = (slots: Slot[], y: number, h: number) => {
  const groups: Slot[][] = [];
  for (const s of slots) {
    const last = groups[groups.length - 1];
    if (last && s.x - last[last.length - 1].x < P + 1) last.push(s);
    else groups.push([s]);
  }
  return groups
    .map((g) => `<rect x="${g[0].x - 5.6}" y="${y}" width="${+(g[g.length - 1].x - g[0].x + 11.2).toFixed(1)}" height="${h}" rx="1.2" fill="#2b2d31" stroke="#0b0c0d" stroke-width="0.6"/>`)
    .join('');
};

const ioLeds = (n: number, y: number, x0: number, label: string) =>
  t(x0 - 3, y + 1.2, label, 3, '#b9bdc2', 'end') +
  Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * 7}" y="${y - 1.2}" width="4.6" height="2.4" rx="0.5" fill="${i % 3 === 0 ? 'url(#s7green-{{uid}})' : '#3b4a3c'}"/>`).join('');

const svg = `
  <defs>
    <linearGradient id="s7body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4b4f55"/>
      <stop offset="0.5" stop-color="#3f4348"/>
      <stop offset="1" stop-color="#363a3f"/>
    </linearGradient>
    <linearGradient id="s7cover-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5a5e64"/>
      <stop offset="1" stop-color="#4a4e54"/>
    </linearGradient>
    <radialGradient id="s7screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c4c4c4"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="s7green-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>
  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="url(#s7body-{{uid}})" stroke="#1d1f22" stroke-width="1"/>
  <!-- 上の端子台（X10・X11） -->
  ${strip(TOP, 3, 21)}
  ${TOP.map((s) => screw(s.x, TOP_Y)).join('')}
  <rect x="3" y="25" width="${W - 6}" height="16" rx="1" fill="url(#s7cover-{{uid}})"/>
  ${TOP.map((s) => t(s.x, 31, s.print, s.print.length > 2 ? 2.6 : 3, '#eef0f2')).join('')}
  ${t(X0 + 4 * P + 3.5 * P, 38.5, 'DIa', 2.8, '#b9bdc2')}${t(X0 + 12 * P + 2.5 * P, 38.5, 'DIb', 2.8, '#b9bdc2')}${t(TOP[19].x, 38.5, 'AI', 2.8, '#b9bdc2')}
  ${t(X0 + P, 38.5, '24VDC IN', 2.6, '#b9bdc2')}

  <!-- 動作表示・ロゴ -->
  ${[
    ['RUN/STOP', true],
    ['ERROR', false],
    ['MAINT', false],
  ]
    .map(([l, on], i) => `<rect x="10" y="${54 + i * 9}" width="6" height="3.4" rx="0.6" fill="${on ? 'url(#s7green-{{uid}})' : '#4a3a2c'}"/>${t(19, 57 + i * 9, String(l), 3.2, '#d6d9dc', 'start')}`)
    .join('')}
  ${t(W - 12, 60, 'SIEMENS', 11, '#2bb5b8', 'end', 'bold')}
  ${t(W - 12, 72, 'SIMATIC S7-1200', 5.2, '#e8eaec', 'end', 'bold')}
  ${t(W - 12, 81, 'CPU 1214C', 5, '#d6d9dc', 'end', 'bold')}
  ${t(W - 12, 88, 'DC/DC/DC', 4.2, '#b9bdc2', 'end')}
  ${ioLeds(14, 100, 74, 'DI')}
  ${ioLeds(10, 108, 74, 'DQ')}
  ${ioLeds(2, 116, 74, 'AI')}
  <!-- PROFINET ポート（X1 P1） -->
  <rect x="7" y="118" width="40" height="40" rx="2" fill="#2a2c30" stroke="#121315" stroke-width="0.6"/>
  ${t(27, 125, 'X1 P1', 3.2, '#d6d9dc', 'middle', 'bold')}
  ${t(27, 155, 'PROFINET', 2.8, '#2bb5b8', 'middle', 'bold')}
  <rect x="16.5" y="129" width="21" height="22" rx="1" fill="#c9ccd0" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="18.5" y="131" width="17" height="18" fill="#0c0d0e"/>
  <rect x="18.5" y="136" width="4.5" height="8" fill="#2a2c2f"/>
  <path d="M33 133.5 V146.5" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>
  <rect x="${W - 64}" y="128" width="52" height="24" rx="1.5" fill="#33363a" stroke="#1a1b1d" stroke-width="0.5"/>
  ${t(W - 38, 138, '6ES7 214-1AG40-0XB0', 3, '#b9bdc2')}
  ${t(W - 38, 146, 'SD CARD', 3, '#8a8e93')}

  <!-- 下の端子台（X12） -->
  <rect x="3" y="159" width="${W - 6}" height="16" rx="1" fill="url(#s7cover-{{uid}})"/>
  ${t(BOTTOM[0].x + P / 2, 163.6, 'SENSOR OUT', 2.4, '#b9bdc2')}${t(BOTTOM[6].x + P, 163.6, 'DQa', 2.8, '#b9bdc2')}${t(BOTTOM[12].x + P / 2, 163.6, 'DQb', 2.8, '#b9bdc2')}
  ${BOTTOM.map((s) => t(s.x, 171, s.print, s.print.length > 2 ? 2.6 : 3, '#eef0f2')).join('')}
  ${strip(BOTTOM, 176, 21)}
  ${BOTTOM.map((s) => screw(s.x, BOT_Y)).join('')}
`;

const power = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: [c] });

const terminal = (s: Slot, y: number, side: 'top' | 'bottom'): TerminalDef => {
  const base = { id: s.id, x: s.x, y, side };
  switch (s.id) {
    case 'L+':
      return { ...base, label: 'L+', hint: '電源+', note: 'CPU の電源 DC24V（20.4〜28.8V）+', role: 'input', accepts: power('+') };
    case 'M':
      return { ...base, label: 'M', hint: '電源 0V', note: 'CPU の電源 DC24V の 0V', role: 'input', accepts: power('-') };
    case 'FE':
      return { ...base, label: '⏚', hint: '機能接地', note: '機能接地', role: 'ground', optional: true };
    case '1M':
      return { ...base, label: '1M', hint: '入力コモン', note: 'デジタル入力のコモン（14 点共通。0V につなぐとシンク入力 = PNP センサー用、+24V につなぐとソース入力 = NPN センサー用）', role: 'input', accepts: { system: 'DC', minVoltage: 15, maxVoltage: 30, conductors: ['+', '-'] }, optional: true };
    case '2M':
      return { ...base, label: '2M', hint: 'AI 基準', note: 'アナログ入力の基準（AI0・AI1 共通の −）', role: 'signal', optional: true };
    case 'AI0':
    case 'AI1': {
      const n = Number(s.id.slice(2));
      return { ...base, label: `IW${64 + n * 2} (AI${n})`, note: `アナログ入力 ${n}（DC0〜10V、10 ビット）`, role: 'signal', signal: { dir: 'in', kind: 'analog-v', ref: '2M' }, optional: true };
    }
    case 'SL+':
      return { ...base, label: 'L+ (センサー電源)', hint: 'センサー電源+', note: 'センサー電源出力 DC24V（400mA まで。CPU の L+ から出る）', role: 'pass', optional: true };
    case 'SM':
      return { ...base, label: 'M (センサー電源)', hint: 'センサー電源 0V', note: 'センサー電源出力の 0V（CPU の M と内部で接続）', role: 'pass', optional: true };
    case '3L+':
      return { ...base, label: '3L+', hint: '出力電源+', note: 'デジタル出力の電源 DC24V +（出力はソース。負荷は出力と 0V の間）', role: 'input', accepts: power('+') };
    case '3M':
      return { ...base, label: '3M', hint: '出力電源−', note: 'デジタル出力の電源の 0V', role: 'input', accepts: power('-') };
  }
  if (s.id.startsWith('I')) {
    const [byte, bit] = s.id.slice(1).split('.');
    const ch = byte === '0' ? 'a' : 'b';
    return { ...base, label: `${s.id} (DI${ch}.${bit})`, note: `デジタル入力 ${s.id}（DC24V 4mA、コモン 1M）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: '1M' }, optional: true };
  }
  const [byte, bit] = s.id.slice(1).split('.');
  const ch = byte === '0' ? 'a' : 'b';
  return { ...base, label: `${s.id} (DQ${ch}.${bit})`, note: `デジタル出力 ${s.id}（トランジスタ ソース DC24V 0.5A、電源 3L+）`, role: 'signal', signal: { dir: 'out', kind: 'pnp' }, optional: true };
};

const terminals: TerminalDef[] = [
  ...TOP.map((s) => terminal(s, TOP_Y, 'top')),
  ...BOTTOM.map((s) => terminal(s, BOT_Y, 'bottom')),
  {
    id: 'X1P1',
    label: 'X1 P1 PROFINET (RJ45)',
    note: 'PROFINET / Ethernet ポート（10/100Mbps。PROFINET IO コントローラ、S7 通信、Modbus/TCP、OPC UA など）',
    x: 27,
    y: 140,
    side: 'left',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'profinet', 'modbus-tcp', 'opc-ua'] },
    optional: true,
  },
];

const links: InternalLink[] = [
  // センサー電源は CPU の電源から出る
  { from: 'L+', to: 'SL+' },
  { from: 'M', to: 'SM' },
  // 出力（ソース）: 出力点から 3L+ へ
  ...dq.map((q) => ({ from: q, to: '3L+', switch: 'output' as const, ratedCurrent: 0.5 })),
];

const def: DeviceDefinition = {
  type: 'siemens.cpu1214c.dc-dc-dc',
  name: 'PLC CPUユニット（DC/DC/DC）',
  model: 'CPU 1214C DC/DC/DC',
  maker: 'シーメンス',
  category: 'plc',
  description:
    'シーメンス SIMATIC S7-1200 のコンパクト CPU 1214C DC/DC/DC（6ES7214-1AG40-0XB0）。電源 DC24V（20.4〜28.8V）を上の端子台の L+・M に入れ、⏚ は機能接地。' +
    'デジタル入力 14 点（I0.0〜I0.7・I1.0〜I1.5、DC24V、シンク/ソース共用。1M を 0V につなぐと PNP センサー用、+24V につなぐと NPN センサー用）、' +
    'アナログ入力 2 点（IW64・IW66、DC0〜10V、基準は 2M）、デジタル出力 10 点（Q0.0〜Q0.7・Q1.0〜Q1.1、トランジスタ ソース DC24V 0.5A/点、出力電源は 3L+・3M）。' +
    '下の端子台の左端の L+・M は DC24V のセンサー電源出力（400mA まで。CPU の電源から出る）。PROFINET ポート（X1 P1）で HMI（KTP700 Basic など）・PC・PROFINET IO 機器とつなぐ。' +
    'CPU の消費電流 約 500mA（拡張モジュール込みで最大 1500mA）。右側にシグナルモジュール（SM）を 8 台、左側に通信モジュールを 3 台まで増設できる（増設は図面では扱わない）。外形 W110×H100×D75mm。' +
    'センサー電源出力の端子が下の端子台にあるとした位置は推定。',
  estimated: 'センサー電源出力の L+・M の位置（下の端子台の左端とした。上の X10 とする資料もある）。端子の並びはシーメンスの一次資料ではなく、ピン表の写しと第三者の資料による',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  loadCurrent: 0.5,
};

export default def;
