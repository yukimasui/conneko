import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * エー・アンド・デイ 多機能ウェイングインジケータ AD-4402（AC 電源）/ AD-4402D（DC24V 電源）。
 * ロードセルのブリッジ電源と信号の入力、計量値の表示、制御入出力（入力 11 点・出力 11 点）、オプションのアナログ出力を持つ指示計。
 * 電源は params の power（AC: AD-4402 / DC: AD-4402D）、アナログ出力（4〜20mA、オプション AD4402-07）は params の analog で選ぶ。
 *
 * 出典: A&D AD-4402 製品ページ・販売店の仕様表（ミスミ・オレンジブック・京都玉崎）、AD-4402 取扱説明書 1WMPD4000242（目次・仕様の抜粋）
 * - ロードセル印加電圧 DC10V ±5%、230mA（350Ω のロードセル 8 台まで）、リモートセンシング付き
 * - 電源 AD-4402: AC100〜240V（約 30VA）、AD-4402D: DC24V
 * - 制御入出力 入力 11 点（無電圧接点またはオープンコレクタで駆動）・出力 11 点（オープンコレクタ）、入力と出力は独立したコモン。機能は設定で選ぶ
 * - アナログ出力はオプション AD4402-07（4〜20mA）、リレー出力はオプション AD4402-02
 * - ロードセルの端子（A&D の指示計で共通: AD-4401A・AD-4410 の取扱説明書）: EXC+・SEN+・SEN−・EXC−・SIG+・SIG−・SHLD。
 *   4 線式のロードセルは EXC+ と SEN+、EXC− と SEN− を短絡する
 *
 * 推定: 背面の端子の並び・端子の名前（IN1〜IN11・IN COM・OUT1〜OUT11・OUT COM・AOUT+・AOUT−・電源）、
 *       出力の定格（AD-4401A と同じ DC30V 50mA とした）、AD-4402D の電源電圧の範囲と消費電流、外形の見た目。
 *
 * 描き方: 正面（表示・キー）を中央に描き、背面の端子を左右の縁に並べた（図面用）。
 * 左の縁: 電源・ロードセル・アナログ出力、右の縁: 制御入出力。
 */

const W = 240;
const H = 268;
const LX = 6;
const RX = W - 6;
const PITCH = 9.6;

const isDc = (p: ParamValues) => p.power !== 'AC';
const hasAnalog = (p: ParamValues) => p.analog === 'current';

/** 左の縁の端子（電源の 2 つは params で変わる） */
const LEFT_Y0 = 40;
const ly = (i: number) => +(LEFT_Y0 + i * PITCH).toFixed(2);
const LC = ['EXC+', 'SEN+', 'SEN-', 'EXC-', 'SIG+', 'SIG-', 'SHLD'];
const LC_LABEL: Record<string, string> = { 'SEN-': 'SEN−', 'EXC-': 'EXC−', 'SIG-': 'SIG−' };
/** 右の縁: 制御入力 IN1〜IN11・IN COM、制御出力 OUT1〜OUT11・OUT COM */
const INS = Array.from({ length: 11 }, (_, i) => `IN${i + 1}`);
const OUTS = Array.from({ length: 11 }, (_, i) => `OUT${i + 1}`);
const RIGHT = [...INS, 'IN COM', ...OUTS, 'OUT COM'];
const RIGHT_Y0 = 24;
const ry = (i: number) => +(RIGHT_Y0 + i * PITCH).toFixed(2);

const EXC_V = 10;

const screw = (x: number, y: number) => `
  <rect x="${x - 3.6}" y="${y - 3.6}" width="7.2" height="7.2" rx="0.8" fill="#2a2b2d"/>
  <circle cx="${x}" cy="${y}" r="2.7" fill="url(#ad-screw-{{uid}})" stroke="#666" stroke-width="0.4"/>
  <path d="M${x - 1.6} ${y} H${x + 1.6} M${x} ${y - 1.6} V${y + 1.6}" stroke="#555" stroke-width="0.7"/>`;

const label = (x: number, y: number, t: string, anchor: 'start' | 'end') =>
  `<text x="${x}" y="${y + 1.4}" text-anchor="${anchor}" font-family="sans-serif" font-size="3.8" font-weight="bold" fill="#222">${t}</text>`;

function leftIds(p: ParamValues): [string, string][] {
  const power: [string, string][] = isDc(p)
    ? [
        ['+24V', '+24V'],
        ['0V', '0V'],
      ]
    : [
        ['L', 'L（AC）'],
        ['N', 'N（AC）'],
      ];
  return [...power, ['FG', 'FG'], ...LC.map((id): [string, string] => [id, LC_LABEL[id] ?? id])];
}
const ANALOG: [string, string][] = [
  ['AOUT+', 'AOUT+'],
  ['AOUT-', 'AOUT−'],
];
const ANALOG_Y0 = ly(12);

function svg(p: ParamValues) {
  const left = leftIds(p);
  const model = isDc(p) ? 'AD-4402D' : 'AD-4402';
  return `
  <defs>
    <linearGradient id="ad-case-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e4e6e8"/>
      <stop offset="1" stop-color="#c3c7cb"/>
    </linearGradient>
    <linearGradient id="ad-face-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3f46"/>
      <stop offset="1" stop-color="#22262b"/>
    </linearGradient>
    <radialGradient id="ad-screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>
  <!-- 本体（パネル取付けのケース） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="4" fill="url(#ad-case-{{uid}})" stroke="#7d8287" stroke-width="1"/>
  <!-- 正面パネル -->
  <rect x="44" y="12" width="${W - 92}" height="150" rx="3" fill="url(#ad-face-{{uid}})" stroke="#111" stroke-width="0.9"/>
  <text x="54" y="25" font-family="sans-serif" font-size="6" font-weight="bold" fill="#e8eaec">A&amp;D</text>
  <text x="${W - 56}" y="25" text-anchor="end" font-family="sans-serif" font-size="4.2" fill="#c9cdd1">${model}</text>
  <!-- 表示（蛍光表示管） -->
  <rect x="54" y="32" width="${W - 112}" height="40" rx="2" fill="#071410" stroke="#000" stroke-width="0.6"/>
  <text x="${W - 70}" y="62" text-anchor="end" font-family="sans-serif" font-size="22" font-weight="bold" fill="#4dffb0">10.000</text>
  <text x="${W - 60}" y="62" text-anchor="end" font-family="sans-serif" font-size="6" fill="#4dffb0">kg</text>
  ${['ZERO', 'NET', 'STAB', 'HI', 'OK', 'LO']
    .map((t, i) => `<rect x="${58 + i * 20}" y="76" width="6" height="3" rx="0.6" fill="${i === 2 ? '#4dffb0' : '#3b4a44'}"/><text x="${65 + i * 20}" y="79" font-family="sans-serif" font-size="3" fill="#c9cdd1">${t}</text>`)
    .join('')}
  <!-- キー -->
  ${['F1', 'F2', 'F3', 'F4', 'ZERO', 'TARE', 'NET/GROSS', 'ENTER']
    .map((t, i) => {
      const x = 56 + (i % 4) * 33;
      const y = 92 + Math.floor(i / 4) * 24;
      return `<rect x="${x}" y="${y}" width="28" height="17" rx="2" fill="#d9dcdf" stroke="#6a6f75" stroke-width="0.5"/>
  <text x="${x + 14}" y="${y + 10.6}" text-anchor="middle" font-family="sans-serif" font-size="${t.length > 5 ? 3.2 : 4.2}" font-weight="bold" fill="#333">${t}</text>`;
    })
    .join('')}
  <text x="${W / 2}" y="154" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#9aa0a6">MULTI FUNCTION WEIGHING INDICATOR</text>
  <!-- 背面の端子台（左: 電源・ロードセル・アナログ出力） -->
  <rect x="1" y="${LEFT_Y0 - 8}" width="40" height="${(left.length - 1) * PITCH + 16}" rx="1.5" fill="#1c1d1f" stroke="#555" stroke-width="0.5"/>
  ${left.map(([, t], i) => screw(LX, ly(i)) + `<text x="${LX + 6}" y="${ly(i) + 1.4}" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#f2f2f2">${t}</text>`).join('')}
  <text x="4" y="${LEFT_Y0 - 11}" font-family="sans-serif" font-size="3.4" fill="#444">電源・ロードセル</text>
  ${
    hasAnalog(p)
      ? `<rect x="1" y="${ANALOG_Y0 - 8}" width="40" height="${PITCH + 16}" rx="1.5" fill="#1c1d1f" stroke="#555" stroke-width="0.5"/>
  ${ANALOG.map(([, t], i) => screw(LX, ANALOG_Y0 + i * PITCH) + `<text x="${LX + 6}" y="${ANALOG_Y0 + i * PITCH + 1.4}" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#f2f2f2">${t}</text>`).join('')}
  <text x="4" y="${ANALOG_Y0 - 11}" font-family="sans-serif" font-size="3.4" fill="#444">AD4402-07（4〜20mA）</text>`
      : ''
  }
  <!-- 背面の端子台（右: 制御入出力） -->
  <rect x="${W - 41}" y="${RIGHT_Y0 - 8}" width="40" height="${(RIGHT.length - 1) * PITCH + 16}" rx="1.5" fill="#1c1d1f" stroke="#555" stroke-width="0.5"/>
  ${RIGHT.map((t, i) => screw(RX, ry(i)) + `<text x="${RX - 6}" y="${ry(i) + 1.4}" text-anchor="end" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#f2f2f2">${t}</text>`).join('')}
  <text x="${W - 4}" y="${RIGHT_Y0 - 11}" text-anchor="end" font-family="sans-serif" font-size="3.4" fill="#444">制御入出力</text>
  ${label(W / 2, 176, `ロードセル印加 DC${EXC_V}V 230mA`, 'start').replace('text-anchor="start"', 'text-anchor="middle"')}
  ${label(W / 2, 186, isDc(p) ? '電源 DC24V' : '電源 AC100〜240V', 'start').replace('text-anchor="start"', 'text-anchor="middle"')}`;
}

const dcCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 30, conductors: ['-', '+'] as ('+' | '-')[] };

function terminals(p: ParamValues): TerminalDef[] {
  const left = leftIds(p);
  const out: TerminalDef[] = left.map(([id, lab], i): TerminalDef => {
    const base = { id, ...(lab !== id ? { label: lab } : {}), x: LX, y: ly(i), side: 'left' as const };
    switch (id) {
      case '+24V':
        return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4, conductors: ['+'] }, note: '電源 DC24V +（AD-4402D。電圧の範囲は推定）', hint: '電源+' };
      case '0V':
        return { ...base, role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4, conductors: ['-'] }, note: '電源 DC24V −（AD-4402D）', hint: '電源0V' };
      case 'L':
      case 'N':
        return { ...base, role: 'input', accepts: { system: 'AC', minVoltage: 85, maxVoltage: 264 }, note: '電源 AC100〜240V（AD-4402。約 30VA）', hint: '電源' };
      case 'FG':
        return { ...base, role: 'ground', note: 'フレームグランド（接地）' };
      case 'EXC+':
        return {
          ...base,
          role: 'supply',
          supply: { system: 'DC', voltage: EXC_V, conductor: '+', limitCurrent: 0.23 },
          note: 'ロードセルの印加電圧 +（DC10V ±5%、230mA まで。350Ω のロードセル 8 台まで）。ロードセルの赤（電源+）へ。4 線式は SEN+ と短絡する',
          hint: '印加+',
        };
      case 'EXC-':
        return {
          ...base,
          role: 'supply',
          supply: { system: 'DC', voltage: EXC_V, conductor: '-', limitCurrent: 0.23 },
          note: 'ロードセルの印加電圧 −。ロードセルの白（電源−）へ。4 線式は SEN− と短絡する',
          hint: '印加−',
        };
      case 'SEN+':
        return { ...base, role: 'signal', note: 'リモートセンシング +。6 線式はロードセルの SEN+ へ、4 線式は EXC+ と短絡する', hint: 'センス+' };
      case 'SEN-':
        return { ...base, role: 'signal', note: 'リモートセンシング −。6 線式はロードセルの SEN− へ、4 線式は EXC− と短絡する', hint: 'センス−' };
      case 'SIG+':
        return { ...base, role: 'signal', note: 'ロードセルの出力 +（mV の微小信号）。ロードセルの緑（出力+）へ', hint: '信号+' };
      case 'SIG-':
        return { ...base, role: 'signal', note: 'ロードセルの出力 −。ロードセルの青（出力−）へ', hint: '信号−' };
      default:
        return { ...base, role: 'signal', optional: true, note: 'シールド（ロードセルのケーブルのシールドをつなぐ。筐体の接地とつながる）', hint: 'シールド' };
    }
  });
  if (hasAnalog(p)) {
    out.push(
      {
        id: 'AOUT+',
        x: LX,
        y: ANALOG_Y0,
        side: 'left',
        role: 'signal',
        optional: true,
        signal: { dir: 'out', kind: 'analog-i', ref: 'AOUT-' },
        note: 'アナログ出力 +（オプション AD4402-07、4〜20mA。計量値に比例）。PLC のアナログ入力（電流）へ',
        hint: 'アナログ+',
      },
      { id: 'AOUT-', label: 'AOUT−', x: LX, y: ANALOG_Y0 + PITCH, side: 'left', role: 'signal', optional: true, note: 'アナログ出力 −（電流の帰り）。PLC のアナログ入力の − 側（COM）へ', hint: 'アナログ−' },
    );
  }
  RIGHT.forEach((id, i) => {
    const base = { id, x: RX, y: ry(i), side: 'right' as const, optional: true };
    if (id === 'IN COM') out.push({ ...base, role: 'signal', note: '制御入力のコモン（入力と出力は独立したコモン）。入力は無電圧接点・NPN オープンコレクタで IN と IN COM の間を閉じて ON', hint: '入力コモン' });
    else if (id === 'OUT COM') out.push({ ...base, role: 'input', accepts: dcCommon, note: '制御出力のコモン（オープンコレクタのエミッタ側）。PLC の入力のコモンと反対の極（0V）へ', hint: '出力コモン' });
    else if (id.startsWith('IN'))
      out.push({ ...base, role: 'signal', signal: { dir: 'in', kind: 'dry' }, note: `制御入力 ${id.slice(2)}（無電圧接点・オープンコレクタで駆動。機能は設定で選ぶ: ゼロ・風袋引き・計量開始など）`, hint: `入力${id.slice(2)}` });
    else
      out.push({
        ...base,
        role: 'signal',
        signal: { dir: 'out', kind: 'npn' },
        note: `制御出力 ${id.slice(3)}（オープンコレクタ。DC30V 50mA は推定。機能は設定で選ぶ: 上限 HI・OK・下限 LO・設定値到達・安定など）`,
        hint: `出力${id.slice(3)}`,
      });
  });
  return out;
}

const links: InternalLink[] = OUTS.map((o) => ({ from: o, to: 'OUT COM', switch: 'output', ratedCurrent: 0.05 }));

const def: DeviceDefinition = {
  type: 'aandd.ad-4402',
  name: 'ウェイングインジケータ',
  model: 'AD-4402D',
  modelOf: (p) => `${isDc(p) ? 'AD-4402D' : 'AD-4402'}${hasAnalog(p) ? ' + AD4402-07' : ''}`,
  maker: 'エー・アンド・デイ',
  category: 'control',
  description:
    'エー・アンド・デイの多機能ウェイングインジケータ AD-4402（AC100〜240V）/ AD-4402D（DC24V）。ロードセルにブリッジ電源（DC10V ±5%、230mA、350Ω のロードセル 8 台まで）を与え、出力（mV）を計量値にして表示・比較する。' +
    'ロードセルは EXC+・EXC−（印加電圧）、SIG+・SIG−（信号）、SHLD（シールド）へつなぐ。4 線式のロードセルは EXC+ と SEN+、EXC− と SEN− を短絡する（6 線式は SEN± をロードセルのセンス線へ）。' +
    '制御入出力は入力 11 点（無電圧接点・オープンコレクタ）と出力 11 点（オープンコレクタ）で、入力・出力は独立したコモン。機能（ゼロ・風袋引き、上下限 HI・OK・LO・設定値到達など）は設定で選ぶ。' +
    '出力は NPN として扱う（PLC の入力はプラスコモンにし、OUT COM を 0V へ）。オプションのアナログ出力 AD4402-07（4〜20mA）は params の analog で付ける。' +
    'ロードセルの印加電圧 DC10V はロードセルの最大印加電圧（LCB03 は DC15V）以下であることを確かめる。',
  labelPrefix: 'WI',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    {
      key: 'power',
      label: '電源',
      options: [
        { value: 'DC', label: 'DC24V（AD-4402D）' },
        { value: 'AC', label: 'AC100〜240V（AD-4402）' },
      ],
      default: 'DC',
    },
    {
      key: 'analog',
      label: 'アナログ出力',
      options: [
        { value: 'none', label: 'なし' },
        { value: 'current', label: '4〜20mA（AD4402-07）' },
      ],
      default: 'none',
    },
  ],
  loadCurrent: (p) => (isDc(p) ? 0.5 : 0.3),
  estimated:
    '背面の端子の並びと端子の名前（IN1〜IN11・IN COM・OUT1〜OUT11・OUT COM・AOUT±・電源）、制御出力の定格（AD-4401A と同じ DC30V 50mA とした）、' +
    'AD-4402D の電源電圧の範囲（DC20.4〜26.4V）と消費電流（DC24V で 0.5A、AC で 0.3A とした）、外形の見た目',
};

export default def;
