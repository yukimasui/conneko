/**
 * オムロン NX シリーズのセーフティ制御ユニット（セーフティ CPU ユニット NX-SL3300、安全入力ユニット NX-SIH400、安全出力ユニット NX-SOH200）の
 * 機器定義の生成。
 *
 * 出典: オムロン NX-SL/SI/SO データシート（CSM_NX-SL_SI_SO_E、F96I-E-01）、NX-SI/SO 仕様ページ（ia.omron.com family/3244）、
 *       NX-SL3 仕様ページ（family/3243）、NX 安全ユニット ユーザーズマニュアル Z930（参照のみ）
 * - NX-SL3300: 安全 I/O 256 点、プログラム容量 512KB、安全 I/O コネクション 32。PL e / カテゴリ 4、SIL 3。
 *   NX102 / NX502 の CPU ユニット、または EtherCAT カプラ NX-ECC20□・EtherNet/IP カプラ NX-EIC202 の NX バスに連結する。
 *   NJ / NX1P / NX7 の CPU ユニット（NX1P2 など）には直接連結できない（EtherCAT カプラを介する）
 * - NX-SIH400: 安全入力 4 点（Si0〜Si3、入力電流 4.5mA）、テスト出力 2 点（T0・T1、PNP、25mA 以下）、8 端子のスクリューレス・クランプ端子台。
 *   I/O 電源からの消費電流 20mA 以下（資料によって 40mA）
 * - NX-SOH200: 安全出力 2 点（So0・So1、PNP、2.0A/点、ユニット合計 4.0A（40℃）・2.5A（55℃））、IOG（I/O 電源 0V）2A/端子、8 端子
 * - 安全入出力ユニットの電源（テスト出力・安全出力の +24V）は NX バスの I/O 電源から来る（端子台に +24V の端子はない）
 *
 * Conneko での表し方:
 * - 連結先（NX102・NX-ECC20□）は収録していないので、`bus` を書かず単独の機器にした（NX1P2 には装着できない）。
 *   テスト出力・安全出力は電源（supply）とみなす（G9SP など他の安全コントローラーと同じ）。
 * - 安全出力の負荷の戻り（0V）は IOG 端子。図面では IOG を I/O 電源（DC24V 電源）の 0V にもつなぐ（NX バスの I/O 電源の 0V と同じ電位）。
 * 推定: 端子台の配列（A1〜A4・B1〜B4 と信号の対応）、外形の見た目（ユニットの色・LED の並び）。
 */
import type { DeviceDefinition, SafetyChannelGroup, TerminalDef } from '../types';
import { led, nxDefs, pushIn, r2, text } from './nx-parts';

const H = 200;
const ROW0 = 64;
const PITCH = 16.5;
const rowY = (r: number) => r2(ROW0 + r * PITCH);
const SAFETY = { pl: 'e' as const, category: '4' as const, sil: 3 as const, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061'] };
const SOURCE = 'オムロン NX-SL/SI/SO データシート（CSM_NX-SL_SI_SO_E）、NX-SI/SO 仕様ページ';

/** 本体（ライトグレーに黄色の帯）。w は幅[px]、rows は端子台の段数（0 は端子台なし） */
function body(w: number, model: string, rows: number, leds: string): string {
  const colA = r2(w * 0.27);
  const colB = r2(w * 0.73);
  const tb = rows
    ? `<rect x="1.6" y="${ROW0 - 12}" width="${w - 3.2}" height="${rows * PITCH + 10}" rx="1.2" fill="url(#nxtb-{{uid}})" stroke="#5f6367" stroke-width="0.6"/>
  ${Array.from({ length: rows }, (_, r) => pushIn(colA, rowY(r), 'up', 0.8) + pushIn(colB, rowY(r), 'up', 0.8)).join('')}
  ${Array.from({ length: rows }, (_, r) => text(w / 2, rowY(r) + 1, String(r + 1), 2.2, '#f2f3f4', 'middle', 'normal')).join('')}
  ${text(colA, ROW0 - 14, 'A', 2.4, '#55585b')}${text(colB, ROW0 - 14, 'B', 2.4, '#55585b')}`
    : '';
  return `${nxDefs()}
  <rect x="0.5" y="0.5" width="${w - 1}" height="${H - 1}" rx="1.6" fill="url(#nxbody-{{uid}})" stroke="#8e918d" stroke-width="0.8"/>
  <rect x="0.8" y="${H - 30}" width="${w - 1.6}" height="9" fill="#f2c500"/>
  ${text(w / 2, H - 23.6, 'SAFETY', w > 30 ? 3.4 : 2.2, '#2b2d30')}
  ${leds}
  ${tb}
  ${text(w / 2, H - 11, model.replace(/^NX-/, ''), w > 30 ? 4.4 : 3.2, '#3a3c3f')}
  ${text(w / 2, H - 5, 'NX', 2.6, '#6a6d70', 'middle', 'normal')}`;
}

const ledRows = (names: string[]) =>
  names.map((n, i) => led(5, 13 + i * 5, i === 0, 3, 1.8) + text(8.5, 14 + i * 5, n, 2.2, '#2b2d30', 'start', 'normal')).join('');

/** 端子台の位置（A1〜A4 は左列、B1〜B4 は右列） */
const at = (w: number, name: string) => {
  const r = Number(name.slice(1)) - 1;
  const a = name[0] === 'A';
  return { x: r2(a ? w * 0.27 : w * 0.73), y: rowY(r), side: (a ? 'left' : 'right') as 'left' | 'right' };
};

/** NX-SL3300（セーフティ CPU ユニット） */
export function buildNxSl3300(): DeviceDefinition {
  const W = 60;
  const leds = ledRows(['UNIT PWR', 'RUN', 'VALID', 'FS']) + text(W / 2, 48, 'SAFETY CPU', 3, '#2b2d30', 'middle', 'normal');
  return {
    type: 'omron.nx-sl3300',
    name: 'セーフティコントローラ（NX セーフティ CPU ユニット）',
    model: 'NX-SL3300',
    maker: 'オムロン',
    category: 'safety',
    description:
      'オムロン NX シリーズのセーフティ CPU ユニット NX-SL3300（安全 I/O 256 点、プログラム容量 512KB、安全 I/O コネクション 32、PL e / カテゴリ 4、SIL 3）。' +
      '安全入力ユニット NX-SIH400・安全出力ユニット NX-SOH200 などの安全プログラム（非常停止・ドアスイッチ・ライトカーテンの論理）を実行する。端子台はない（電源は NX バスから）。' +
      'NX102 / NX502 の CPU ユニット、または EtherCAT カプラ NX-ECC20□・EtherNet/IP カプラ NX-EIC202 の右に連結する。NX1P2 など NJ / NX1P / NX7 の CPU ユニットには直接連結できない（EtherCAT カプラを介する）。' +
      `連結先のカプラ・CPU は収録していないので、図面では単独の機器として置く（部品表に載せるため）。出典: ${SOURCE}。`,
    estimated: '外形の見た目（幅・LED の並び）',
    labelPrefix: 'SC',
    width: W,
    height: H,
    svg: body(W, 'NX-SL3300', 0, leds),
    terminals: [],
    safety: SAFETY,
  };
}

/** NX-SIH400（安全入力 4 点・テスト出力 2 点） */
export function buildNxSih400(): DeviceDefinition {
  const W = 24;
  const layout: [string, string][] = [
    ['Si0', 'A1'],
    ['Si1', 'B1'],
    ['Si2', 'A2'],
    ['Si3', 'B2'],
    ['T0', 'A3'],
    ['T1', 'B3'],
  ];
  const terminals: TerminalDef[] = layout.map(([id, pos]): TerminalDef => {
    const n = Number(id.slice(id.startsWith('Si') ? 2 : 1));
    const channel = (n % 2 === 0 ? 1 : 2) as 1 | 2;
    const base = { id, ...at(W, pos), optional: true };
    if (id.startsWith('T'))
      return {
        ...base,
        role: 'supply',
        supply: { system: 'DC', voltage: 24, conductor: '+', kind: 'test', limitCurrent: 0.025 },
        function: 'test-output',
        channel,
        note: `テスト出力 ${id}（端子台 ${pos}。PNP 25mA 以下。b 接点を通して安全入力 ${n === 0 ? 'Si0・Si2' : 'Si1・Si3'} へ戻す）`,
        hint: `テスト${n}`,
      };
    return { ...base, role: 'signal', function: 'safety-input', channel, note: `安全入力 ${id}（端子台 ${pos}。入力電流 4.5mA）`, hint: `安全入力${n}` };
  });
  const groups: SafetyChannelGroup[] = [0, 2].map((a) => ({
    id: `Si${a}-Si${a + 1}`,
    label: `安全入力 Si${a}/Si${a + 1}（T0→Si${a}、T1→Si${a + 1}）`,
    kind: 'input',
    configurable: true,
    mode: ['nc-nc', 'ossd'],
    channels: [
      { source: 'T0', input: `Si${a}` },
      { source: 'T1', input: `Si${a + 1}` },
    ],
  }));
  const leds = ledRows(['TS', 'Si0', 'Si1', 'Si2', 'Si3']);
  return {
    type: 'omron.nx-sih400',
    name: 'セーフティコントローラ（NX 安全入力ユニット）',
    model: 'NX-SIH400',
    maker: 'オムロン',
    category: 'safety',
    description:
      'オムロン NX シリーズの安全入力ユニット NX-SIH400（安全入力 Si0〜Si3 の 4 点・テスト出力 T0・T1 の 2 点（PNP 25mA 以下）、8 端子のスクリューレス・クランプ端子台、幅 12mm、PL e / カテゴリ 4、SIL 3）。' +
      '非常停止・ドアスイッチの b 接点 2 回路を T0→Si0・T1→Si1（または Si2・Si3）につなぎ、ライトカーテンなどの OSSD は Si へ直接入れる（入力の使い方はセーフティ CPU ユニット NX-SL3300 の設定で決める）。' +
      'テスト出力の電源は NX バスの I/O 電源から来る（端子台に +24V の端子はない）。NX-SL3300 と同じ NX バス（NX102・EtherCAT カプラ NX-ECC20□ など）に連結する。' +
      `出典: ${SOURCE}。`,
    estimated: '端子台の配列（A1 Si0・B1 Si1・A2 Si2・B2 Si3・A3 T0・B3 T1、A4・B4 は空き）と外形の見た目',
    labelPrefix: 'SI',
    width: W,
    height: H,
    svg: body(W, 'NX-SIH400', 4, leds),
    terminals,
    safetyChannels: groups,
    safety: SAFETY,
    loadCurrent: 0.02,
  };
}

/** NX-SOH200（安全出力 2 点、2A/点） */
export function buildNxSoh200(): DeviceDefinition {
  const W = 24;
  const terminals: TerminalDef[] = [
    {
      id: 'So0',
      ...at(W, 'A1'),
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 2 },
      function: 'ossd',
      channel: 1,
      optional: true,
      note: '安全出力 So0（端子台 A1。PNP 2.0A/点）。接触器のコイル・安全リレーの入力へ。負荷の戻りは IOG',
      hint: '安全出力0',
    },
    {
      id: 'So1',
      ...at(W, 'B1'),
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 2 },
      function: 'ossd',
      channel: 2,
      optional: true,
      note: '安全出力 So1（端子台 B1。PNP 2.0A/点）',
      hint: '安全出力1',
    },
    ...(['A2', 'B2'] as const).map(
      (pos, i): TerminalDef => ({
        id: `IOG${i + 1}`,
        label: 'IOG',
        ...at(W, pos),
        role: 'input',
        accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['-'] },
        optional: true,
        note: `I/O 電源 0V（端子台 ${pos}。2A/端子）。So${i} で駆動する負荷の戻りをつなぐ。NX バスの I/O 電源の 0V と同じ電位（図面では I/O 電源の 0V にもつなぐ）`,
        hint: 'I/O電源0V',
      }),
    ),
  ];
  const leds = ledRows(['TS', 'So0', 'So1']);
  return {
    type: 'omron.nx-soh200',
    name: 'セーフティコントローラ（NX 安全出力ユニット）',
    model: 'NX-SOH200',
    maker: 'オムロン',
    category: 'safety',
    description:
      'オムロン NX シリーズの安全出力ユニット NX-SOH200（安全出力 So0・So1 の 2 点、PNP、2.0A/点、ユニット合計 4.0A（40℃）、IOG（I/O 電源 0V）2A/端子、8 端子のスクリューレス・クランプ端子台、幅 12mm、PL e / カテゴリ 4、SIL 3）。' +
      'So0・So1 で接触器 2 台（ミラー接点付き）のコイルを 1 台ずつ駆動し、コイルの戻りを IOG へつなぐ。接触器の b 接点（ミラー接点）は直列にして NX-SIH400 の入力へ戻し、EDM（外部機器監視）にする。' +
      '出力の電源は NX バスの I/O 電源から来る。NX-SL3300 と同じ NX バス（NX102・EtherCAT カプラ NX-ECC20□ など）に連結する。' +
      `出典: ${SOURCE}。`,
    estimated: '端子台の配列（A1 So0・B1 So1・A2/B2 IOG、A3〜B4 は空き）と外形の見た目',
    labelPrefix: 'SO',
    width: W,
    height: H,
    svg: body(W, 'NX-SOH200', 4, leds),
    terminals,
    safetyChannels: [{ id: 'So0-So1', label: '安全出力 So0/So1', kind: 'output', channels: [{ output: 'So0' }, { output: 'So1' }] }],
    safety: SAFETY,
  };
}
