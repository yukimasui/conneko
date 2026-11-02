import { BLE2, BLE2_MOTOR_CONNECTOR, BLE2_POWER_LABEL, ble2Of, type Ble2Power } from '../oriental/ble2';
import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * オリエンタルモーター ブラシレスモーター BLE2 シリーズのドライバー BLE2D□-A（単相 100〜120V）/ BLE2D□-C（単相・三相 200〜240V）。
 *
 * 出典は src/devices/oriental/ble2.ts。
 * - CN1（主電源）: 単相は L・N（-C の単相は L1・L2）、三相は L1・L2・L3。保護接地は PE。
 * - CN2: モーター（専用の接続ケーブル）。
 * - CN5（入出力）: 入力 IN0〜IN6（フォトカプラ。初期の割付けは FWD・REV・STOP-MODE・M0・M1・M2・ALARM-RESET）と共通 IN-COM、
 *   出力 OUT0・OUT1（フォトカプラ・オープンコレクタ。初期は SPEED-OUT・ALARM-OUT1）と共通 OUT-COM、外部速度設定 VH・VM・VL。
 * - 正面の操作パネル（表示・キー）で回転速度・加減速時間を設定できる。
 *
 * 描き方: 端子は図面用に、CN1 を上、CN5 の入力を左、出力と外部速度設定を右の縁、CN2 を下に並べる。外形は推定。
 */

const W = 120;
const H = 220;
const LX = 6;
const RX = W - 6;
const PITCH = 11;
const Y0 = 72;
const yAt = (i: number) => Y0 + i * PITCH;

const CN1_Y = 7;
const MAIN = [
  { id: 'L1', x: 20 },
  { id: 'L2', x: 36 },
  { id: 'L3', x: 52 },
];
const PE = { x: 76, y: 9 };
const CN2 = { x: 60, y: H - 5 };

/** 入力（左）: [ID, 初期の機能] */
const INPUTS: [string, string][] = [
  ['IN-COM', ''],
  ['IN0', 'FWD'],
  ['IN1', 'REV'],
  ['IN2', 'STOP-MODE'],
  ['IN3', 'M0'],
  ['IN4', 'M1'],
  ['IN5', 'M2'],
  ['IN6', 'ALARM-RESET'],
];
/** 出力・外部速度設定（右）: [ID, 初期の機能] */
const OUTPUTS: [string, string][] = [
  ['OUT-COM', ''],
  ['OUT0', 'SPEED-OUT'],
  ['OUT1', 'ALARM-OUT1'],
  ['VH', ''],
  ['VM', ''],
  ['VL', ''],
];

const FUNC_NOTES: Record<string, string> = {
  FWD: '正転（ON で正転方向に運転）',
  REV: '逆転（ON で逆転方向に運転）',
  'STOP-MODE': '停止方法の選択（瞬時停止 / 減速停止）',
  M0: '運転データ番号の選択（M0〜M2 で 8 速）',
  M1: '運転データ番号の選択（M0〜M2 で 8 速）',
  M2: '運転データ番号の選択（M0〜M2 で 8 速）',
  'ALARM-RESET': 'アラームの解除',
  'SPEED-OUT': '回転速度に比例したパルス出力',
  'ALARM-OUT1': 'アラーム（正常時 ON、アラームで OFF）',
};

const powerOf = (p: ParamValues): Ble2Power => (['100', '200-1', '200-3'].includes(String(p.power)) ? (String(p.power) as Ble2Power) : '100');
const capOf = (p: ParamValues) => ble2Of(p.watt);
const inputOf = (p: ParamValues) => {
  const c = capOf(p);
  return c.input[powerOf(p)] ?? c.input['200-1'] ?? 1;
};
const suffix = (p: ParamValues) => (powerOf(p) === '100' ? 'A' : 'C');

const svg = (p: ParamValues) => {
  const c = capOf(p);
  const three = powerOf(p) === '200-3';
  const labels = powerOf(p) === '100' ? ['L', 'N'] : ['L1', 'L2', 'L3'];
  return `
  <defs>
    <linearGradient id="ble-body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e9eaec"/>
      <stop offset="0.5" stop-color="#f6f7f8"/>
      <stop offset="1" stop-color="#dcdee1"/>
    </linearGradient>
    <linearGradient id="ble-front-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b3e43"/>
      <stop offset="1" stop-color="#25272a"/>
    </linearGradient>
  </defs>
  <!-- 本体（明るいグレーのケースに黒い前面パネル） -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="3" fill="url(#ble-body-{{uid}})" stroke="#8b8e92" stroke-width="1.2"/>
  <rect x="44" y="24" width="32" height="${H - 64}" rx="2" fill="url(#ble-front-{{uid}})" stroke="#111" stroke-width="0.7"/>
  <!-- CN1（上、主電源） -->
  <rect x="10" y="1" width="${three ? 52 : 36}" height="14" rx="1.5" fill="#2b2d30" stroke="#111" stroke-width="0.7"/>
  ${MAIN.slice(0, three ? 3 : 2)
    .map((m, i) => `<rect x="${m.x - 4}" y="${CN1_Y - 4}" width="8" height="8" rx="1" fill="#111"/><circle cx="${m.x}" cy="${CN1_Y}" r="2.2" fill="#000" stroke="#666" stroke-width="0.4"/>
  <text x="${m.x}" y="${CN1_Y + 13.5}" text-anchor="middle" font-family="sans-serif" font-size="4.2" font-weight="bold" fill="#222">${labels[i]}</text>`)
    .join('')}
  <circle cx="${PE.x}" cy="${PE.y}" r="4.5" fill="#d6d6d6" stroke="#555" stroke-width="0.7"/>
  <path d="M${PE.x - 2.6} ${PE.y} H${PE.x + 2.6} M${PE.x} ${PE.y - 2.6} V${PE.y + 2.6}" stroke="#444" stroke-width="1"/>
  <text x="${PE.x + 7}" y="${PE.y + 2}" font-family="sans-serif" font-size="5" fill="#2a7a3a">⏚</text>
  <!-- 操作パネル（4 桁の表示・キー） -->
  <rect x="47" y="30" width="26" height="11" rx="1" fill="#0b1a10" stroke="#000" stroke-width="0.4"/>
  <text x="71" y="38.6" text-anchor="end" font-family="sans-serif" font-size="7.6" font-weight="bold" fill="#5cff7a">1500</text>
  ${['MODE', 'SET', '▲', '▼'].map((k, i) => `<rect x="${47 + (i % 2) * 13.5}" y="${45 + Math.floor(i / 2) * 9}" width="12" height="7" rx="1" fill="#55585d"/><text x="${53 + (i % 2) * 13.5}" y="${50 + Math.floor(i / 2) * 9}" text-anchor="middle" font-family="sans-serif" font-size="${k.length > 1 ? 2.8 : 3.6}" fill="#fff">${k}</text>`).join('')}
  <circle cx="51" cy="68" r="1.8" fill="#39d353"/><text x="54" y="69.3" font-family="sans-serif" font-size="2.8" fill="#ccc">PWR</text>
  <circle cx="51" cy="74" r="1.8" fill="#5a2620"/><text x="54" y="75.3" font-family="sans-serif" font-size="2.8" fill="#ccc">ALM</text>
  <text x="60" y="110" text-anchor="middle" font-family="sans-serif" font-size="6.4" font-weight="bold" fill="#f2f2f2" transform="rotate(-90 60 110)">BLE2</text>
  <text x="60" y="${H - 50}" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold" fill="#e8e8e8">ORIENTAL</text>
  <text x="60" y="${H - 45}" text-anchor="middle" font-family="sans-serif" font-size="3.2" font-weight="bold" fill="#e8e8e8">MOTOR</text>
  <text x="60" y="${H - 30}" text-anchor="middle" font-family="sans-serif" font-size="4.8" font-weight="bold" fill="#222">BLE2D${c.driver}-${suffix(p)}</text>
  <text x="60" y="${H - 24}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">${c.watt}W ${BLE2_POWER_LABEL[powerOf(p)].replace(/（.*$/, '')}</text>
  <!-- CN5（入出力。左右の縁に並べる） -->
  <rect x="1" y="${Y0 - 7}" width="40" height="${(INPUTS.length - 1) * PITCH + 14}" rx="1.5" fill="#d0d2d5" stroke="#888" stroke-width="0.6"/>
  <rect x="${W - 41}" y="${Y0 - 7}" width="40" height="${(OUTPUTS.length - 1) * PITCH + 14}" rx="1.5" fill="#d0d2d5" stroke="#888" stroke-width="0.6"/>
  ${INPUTS.map(
    ([id, fn], i) => `<rect x="${LX - 3}" y="${yAt(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${LX}" cy="${yAt(i)}" r="1.8" fill="#111"/>
  <text x="${LX + 5}" y="${yAt(i) + (fn ? -0.4 : 1.4)}" font-family="sans-serif" font-size="${id.length > 4 ? 3.4 : 4}" font-weight="bold" fill="#222">${id}</text>${fn ? `<text x="${LX + 5}" y="${yAt(i) + 4.2}" font-family="sans-serif" font-size="2.6" fill="#666">${fn}</text>` : ''}`,
  ).join('')}
  ${OUTPUTS.map(
    ([id, fn], i) => `<rect x="${RX - 3}" y="${yAt(i) - 3}" width="6" height="6" rx="0.8" fill="#2a2a2a"/><circle cx="${RX}" cy="${yAt(i)}" r="1.8" fill="#111"/>
  <text x="${RX - 5}" y="${yAt(i) + (fn ? -0.4 : 1.4)}" text-anchor="end" font-family="sans-serif" font-size="${id.length > 4 ? 3.4 : 4}" font-weight="bold" fill="#222">${id}</text>${fn ? `<text x="${RX - 5}" y="${yAt(i) + 4.2}" text-anchor="end" font-family="sans-serif" font-size="2.6" fill="#666">${fn}</text>` : ''}`,
  ).join('')}
  <text x="21" y="${Y0 - 9}" text-anchor="middle" font-family="sans-serif" font-size="3.4" fill="#555">CN5</text>
  <!-- CN2（モーター） -->
  <rect x="${CN2.x - 12}" y="${CN2.y - 12}" width="24" height="14" rx="2" fill="#111" stroke="#777" stroke-width="0.6"/>
  <rect x="${CN2.x - 8}" y="${CN2.y - 9}" width="16" height="7" rx="1" fill="#444"/>
  <text x="${CN2.x + 16}" y="${CN2.y - 3}" font-family="sans-serif" font-size="3.6" font-weight="bold" fill="#333">CN2</text>
`;
};

const ioCommon = { system: 'DC' as const, minVoltage: 0, maxVoltage: 26.4, conductors: ['-', '+'] as ('+' | '-')[] };

const terminals = (p: ParamValues): TerminalDef[] => {
  const power = powerOf(p);
  const single100 = power === '100';
  const accepts = single100 ? { system: 'AC' as const, minVoltage: 85, maxVoltage: 132 } : { system: 'AC' as const, minVoltage: 170, maxVoltage: 264 };
  const fnNote = (fn: string) => (fn ? `。初期の機能は ${fn}（${FUNC_NOTES[fn]}）。割付けは変えられる` : '');
  const mains = MAIN.slice(0, power === '200-3' ? 3 : 2).map(
    (m, i): TerminalDef => ({
      id: m.id,
      ...(single100 ? { label: i === 0 ? 'L' : 'N' } : {}),
      note: `主電源（${BLE2_POWER_LABEL[power]}）。定格入力電流 ${inputOf(p)}A`,
      hint: '主電源',
      x: m.x,
      y: CN1_Y,
      side: 'top',
      role: 'input',
      accepts,
    }),
  );
  return [
    ...mains,
    { id: 'PE', label: '⏚', note: '保護接地', x: PE.x, y: PE.y, side: 'top', role: 'ground' },
    {
      id: 'CN2',
      label: 'CN2（モーター）',
      note: `ブラシレスモーター ${capOf(p).motor} などへ、専用の接続ケーブルでつなぐ`,
      x: CN2.x,
      y: CN2.y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: BLE2_MOTOR_CONNECTOR, pins: 0, width: 16, required: true },
    },
    ...INPUTS.map(([id, fn], i): TerminalDef => {
      const base = { id, x: LX, y: yAt(i), side: 'left' as const, optional: true };
      if (id === 'IN-COM') return { ...base, role: 'input', accepts: ioCommon, hint: '入力コモン', note: '入力 IN0〜IN6 の共通（シンク入力では +24V、ソース入力では 0V）' };
      return { ...base, role: 'signal', hint: fn.length <= 10 ? fn : undefined, note: `入力（フォトカプラ、DC24V）${fnNote(fn)}`, signal: { dir: 'in', kind: 'dc', common: 'IN-COM' } };
    }),
    ...OUTPUTS.map(([id, fn], i): TerminalDef => {
      const base = { id, x: RX, y: yAt(i), side: 'right' as const, optional: true };
      if (id === 'OUT-COM') return { ...base, role: 'input', accepts: ioCommon, hint: '出力コモン', note: '出力 OUT0・OUT1 の共通（シンク出力では 0V）' };
      if (id === 'VH') return { ...base, role: 'supply', supply: { system: 'DC', voltage: 10, conductor: '+', limitCurrent: 0.01 }, hint: '設定電源', note: '外部速度設定器（ボリューム）の電源' };
      if (id === 'VM') return { ...base, role: 'signal', hint: '速度設定', note: '外部速度設定（ボリュームの中点、または DC0〜10V）', signal: { dir: 'in', kind: 'analog-v', ref: 'VL' } };
      if (id === 'VL') return { ...base, role: 'signal', hint: '設定 0V', note: '外部速度設定の 0V' };
      return { ...base, role: 'signal', hint: fn, note: `出力（フォトカプラ・オープンコレクタ、DC4.5〜30V 40mA 以下）${fnNote(fn)}`, signal: { dir: 'out', kind: 'npn' } };
    }),
  ];
};

const links: InternalLink[] = ['OUT0', 'OUT1'].map((id) => ({ from: id, to: 'OUT-COM', switch: 'output', ratedCurrent: 0.04 }));

const POWER_OPTIONS = (['100', '200-1', '200-3'] as Ble2Power[]).map((v) => ({ value: v, label: BLE2_POWER_LABEL[v] }));

const def: DeviceDefinition = {
  type: 'oriental.ble2d',
  name: 'ブラシレスモータードライバー',
  model: 'BLE2D120-A',
  modelOf: (p) => `BLE2D${capOf(p).driver}-${suffix(p)}`,
  maker: 'オリエンタルモーター',
  category: 'load',
  labelPrefix: 'DRV',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    { key: 'watt', label: '容量', options: BLE2.map((c) => ({ value: String(c.watt), label: `${c.watt}W（${c.motor} 用）` })), default: '120' },
    {
      key: 'power',
      label: '電源',
      options: POWER_OPTIONS,
      optionsFor: (p) => POWER_OPTIONS.filter((o) => capOf(p).input[o.value as Ble2Power] !== undefined),
      default: '100',
    },
  ],
  // 三相のときの L3 はパラメータで現れるため、どの電源でもある L1・L2 だけを書く
  distinctGroups: [['L1', 'L2']],
  loadCurrent: inputOf,
  description:
    'オリエンタルモーターのブラシレスモーター BLE2 シリーズのドライバー（速度制御。回転速度 80〜4000r/min、速度変動率 ±0.2% 以下）。' +
    'CN1 に主電源（-A: 単相 100〜120V、-C: 単相・三相 200〜240V）を入れ、CN2 からモーター（BLM□HP）を専用の接続ケーブルで駆動する。保護接地は PE へ。' +
    '入力 IN0〜IN6 はフォトカプラ入力で、IN-COM を +24V にすればシンク（接点・NPN で 0V へ引き込んで ON）。初期の割付けは FWD（正転）・REV（逆転）・STOP-MODE・M0〜M2（8 速の選択）・ALARM-RESET。' +
    '出力 OUT0（SPEED-OUT）・OUT1（ALARM-OUT1）はオープンコレクタ（共通 OUT-COM）。回転速度は操作パネル・外部速度設定器（VH・VM・VL にボリューム）・DC 電圧で設定する。' +
    '電磁ブレーキ付きのモーターは、ブレーキのリード線もドライバーにつなぐ（ドライバーが制御する。この定義では扱わない）。',
  estimated:
    'CN5 のピンの並びと入出力の初期の機能、出力の定格（40mA）、外形の寸法、30W の 200V・60W の定格入力電流（推定）。端子の位置は図面用に整理したもの',
};

export default def;
