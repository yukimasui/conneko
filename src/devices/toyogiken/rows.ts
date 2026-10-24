/**
 * 東洋技研のコネクタ端子台の端子の並び（記名板の印字とコネクタのピンの対応）。
 *
 * - 1:1 タイプ（MIL）: 奥段が B1〜Bn、手前段が A1〜An。A_k はコネクタの MIL ピン 2k−1（▲側の列）、B_k は 2k。
 *   「-M」付き（1〜数字連番の記名板）は印字が MIL のピン番号そのもの（A_k → 2k−1、B_k → 2k）。
 * - 1:1 タイプ（FCN 40P）: 奥段が B1〜B20、手前段が A1〜A20（三菱電機の 40 ピンコネクタのピン番号と同じ並び）。
 *   ピン ID は三菱電機の I/O ユニット（RX41C4 など）と同じ規則（fcnPinNo）にそろえ、FCN どうしのケーブルで同じ信号になる。
 * - KEYENCE 対応（K1 など）: 手前段が 000〜015・COM0（KEYENCE ピン No.1〜17）、奥段が 100〜115・COM1（No.18〜34）。
 * - 三菱電機対応（M1・M2・C など）: 00〜0F が三菱のピン B20〜B05、10〜1F が A20〜A05、
 *   +V（入力ユニットでは COM）が B01・B02、0V（入力ユニットでは NC）が A01・A02。
 */
import { keyenceToStd } from '../keyence/kv-parts';
import { fcnPinNo } from '../catalog/mitsubishi-rx41c4';
import type { ParamDef } from '../types';
import type { Rows, Term } from './connector-block';

const HEX = '0123456789ABCDEF';
const hex2 = (n: number) => `${HEX[n >> 4]}${HEX[n & 15]}`;
const pad2 = (n: number) => String(n).padStart(2, '0');

/* ------------------------------------------------------------------ */
/* パラメータ                                                          */
/* ------------------------------------------------------------------ */

/** 搭載コネクタのメーカー（MIL）。形式の「1□」の□に入る */
export const cnMakerParam = (makers: ('H' | 'T' | 'J')[] = ['H', 'T', 'J']): ParamDef => ({
  key: 'cnMaker',
  label: '搭載コネクタ',
  options: makers.map((m) => ({
    value: m,
    label: m === 'H' ? 'H: ヒロセ電機 HIF3BA' : m === 'T' ? 'T: オムロン XG4A' : 'J: 日本航空電子 PS',
  })),
  default: 'H',
});

/** 記名板の種類（PCX・PCXV）。M は 1〜数字連番 */
export const markerParam: ParamDef = {
  key: 'marker',
  label: '記名板',
  options: [
    { value: 'AB', label: 'A・B 連番（A1, B1, …）' },
    { value: 'M', label: '-M: 1〜数字連番（1, 2, …）' },
  ],
  default: 'AB',
};

/** 使用する圧着端子（PCN7）。R は丸形圧着端子用（形式が PCN7R） */
export const crimpParam: ParamDef = {
  key: 'crimp',
  label: '圧着端子',
  options: [
    { value: 'Y', label: 'Y 形圧着端子（標準、セルフアップ）' },
    { value: 'R', label: 'R: 丸形圧着端子用（PCN7R）' },
  ],
  default: 'Y',
};

/* ------------------------------------------------------------------ */
/* 1:1 タイプ                                                          */
/* ------------------------------------------------------------------ */

/** MIL 1:1（A・B 連番）。marker が 'M' なら印字を MIL ピン番号にする */
export function milAbRows(poles: number, marker: string = 'AB'): Rows {
  const cols = poles / 2;
  const term = (row: 'A' | 'B', k: number): Term => {
    const n = row === 'A' ? 2 * k - 1 : 2 * k;
    const label = marker === 'M' ? String(n) : `${row}${k}`;
    const every5 = marker === 'M' ? n % 5 === 0 : k % 5 === 0;
    return {
      id: `${row}${k}`,
      label,
      note: `コネクタの MIL ピン ${n}（つないだユニットのピン一覧で MIL ピン番号 ${n} の信号）`,
      pins: [n],
      ...(every5 ? { mark: 'black' as const } : {}),
    };
  };
  return {
    upper: Array.from({ length: cols }, (_, i) => term('B', i + 1)),
    lower: Array.from({ length: cols }, (_, i) => term('A', i + 1)),
  };
}

/** FCN 40P 1:1（A1〜A20 / B1〜B20） */
export function fcnAbRows(): Rows {
  const term = (row: 'A' | 'B', k: number): Term => ({
    id: `${row}${k}`,
    label: `${row}${k}`,
    note: `コネクタの FCN ピン ${row}${pad2(k)}（三菱電機の 40 ピンコネクタのピン番号と同じ）`,
    pins: [fcnPinNo(row, k)],
    ...(k % 5 === 0 ? { mark: 'black' as const } : {}),
  });
  return {
    upper: Array.from({ length: 20 }, (_, i) => term('B', i + 1)),
    lower: Array.from({ length: 20 }, (_, i) => term('A', i + 1)),
  };
}

/** FCN 40P のピンの表示名（ピン ID は三菱の I/O ユニットと同じ規則） */
export function fcnPinLabel(n: number): string {
  // fcnPinNo の逆: 奇数 → B 列、偶数 → A 列
  const row = n % 2 === 1 ? 'B' : 'A';
  const k = row === 'B' ? (41 - n) / 2 : (42 - n) / 2;
  return `FCN ${row}${pad2(k)}`;
}

/* ------------------------------------------------------------------ */
/* KEYENCE 対応（MIL 34P）                                              */
/* ------------------------------------------------------------------ */

/** KEYENCE のピン No.k（1〜34）の端子 */
const kvTerm = (id: string, label: string, k: number, extra: Partial<Term> = {}): Term => {
  const std = keyenceToStd(k, 34);
  const meaning =
    k === 17 || k === 34
      ? `${k === 17 ? 'COM0' : 'COM1'}（ユニットのコモン）`
      : `${k < 17 ? '先頭チャネル' : '次のチャネル'}の ${pad2(k < 17 ? k - 1 : k - 18)} 番（先頭が R000 のユニットなら R${k < 17 ? '0' : '1'}${pad2(k < 17 ? k - 1 : k - 18)}）`;
  return { id, label, note: `KEYENCE の I/O ユニットのピン No.${k}（MIL ピン ${std}）。${meaning}`, pins: [std], ...extra };
};

/** 入出力 16 点 × 2 の端子（000〜015 / 100〜115）。4 点ごとに目印の色 */
function kvIoTerms(ch: 0 | 1): Term[] {
  return Array.from({ length: 16 }, (_, i) => {
    const label = `${ch}${pad2(i)}`;
    return kvTerm(label, label, ch === 0 ? i + 1 : i + 18, i % 4 === 3 ? { mark: 'orange' } : {});
  });
}

/** KEYENCE 対応 34 端子（K1）: 手前段 000〜015・COM0、奥段 100〜115・COM1 */
export function kvK1Rows(): Rows {
  return {
    upper: [...kvIoTerms(1), kvTerm('COM1', 'COM1', 34, { mark: 'blue' })],
    lower: [...kvIoTerms(0), kvTerm('COM0', 'COM0', 17, { mark: 'blue' })],
  };
}

/**
 * KEYENCE 対応 40 端子（分岐端子付き）。
 * - K1: 右端の 4 端子が奥段 COM1（No.34）、手前段 COM0（No.17）
 * - K2: 奥段の 4 端子は Service（COM）（コネクタにつながらない分岐用コモン）、手前段の 4 端子は KEYENCE COM（No.17・No.34 の両方）
 * - D（PCW）: 手前段 C1 ×4（No.17）、奥段 C2 ×4（No.34）
 */
export function kvBranchRows(kind: 'K1' | 'K2' | 'D'): Rows {
  const four = (f: (i: number) => Term) => Array.from({ length: 4 }, (_, i) => f(i + 1));
  if (kind === 'K1') {
    return {
      upper: [...kvIoTerms(1), ...four((i) => kvTerm(`COM1-${i}`, 'COM1', 34, { mark: 'blue' }))],
      lower: [...kvIoTerms(0), ...four((i) => kvTerm(`COM0-${i}`, 'COM0', 17, { mark: 'blue' }))],
    };
  }
  if (kind === 'D') {
    return {
      upper: [...kvIoTerms(1), ...four((i) => kvTerm(`C2-${i}`, 'C2', 34, { mark: 'blue' }))],
      lower: [...kvIoTerms(0), ...four((i) => kvTerm(`C1-${i}`, 'C1', 17, { mark: 'blue' }))],
    };
  }
  const com17 = keyenceToStd(17, 34);
  const com34 = keyenceToStd(34, 34);
  return {
    upper: [
      ...kvIoTerms(1),
      ...four((i) => ({
        id: `SV-${i}`,
        label: 'SV',
        note: 'Service（COM）: コネクタにはつながらない分岐用のコモン（4 端子が内部で短絡、10A）。センサーの電源の分岐などに使う',
        bus: 'SV',
      })),
    ],
    lower: [
      ...kvIoTerms(0),
      ...four((i) => ({
        id: `COM-${i}`,
        label: 'COM',
        note: `KEYENCE COM: ユニットの COM0（No.17、MIL ピン ${com17}）と COM1（No.34、MIL ピン ${com34}）の両方につながる（内部で短絡）`,
        pins: [com17, com34],
        mark: 'blue' as const,
      })),
    ],
  };
}

/* ------------------------------------------------------------------ */
/* 三菱電機対応（40 ピン、32 点）                                        */
/* ------------------------------------------------------------------ */

/** 入出力 00〜0F（B20〜B05）・10〜1F（A20〜A05） */
function melsecIo(hi: 0 | 1): Term[] {
  return Array.from({ length: 16 }, (_, i) => {
    const row = hi === 0 ? 'B' : 'A';
    const k = 20 - i;
    const label = hex2(hi * 16 + i);
    return {
      id: label,
      label,
      note: `三菱電機の 40 ピンコネクタの ${row}${pad2(k)}（入力ユニットなら X、出力ユニットなら Y の ${label}。実際の番号はユニットの先頭番号 + ${label}）`,
      pins: [fcnPinNo(row, k)],
      ...(i % 4 === 3 ? { mark: 'orange' as const } : {}),
    };
  });
}

/** B01・B02（+V / COM）につながる端子 */
const melsecB = (id: string, label: string): Term => ({
  id,
  label,
  note: '三菱電機の 40 ピンコネクタの B01・B02（出力ユニットでは外部供給電源の +（12/24VDC）、入力ユニットでは COM）',
  pins: [fcnPinNo('B', 1), fcnPinNo('B', 2)],
  mark: label === '+V' ? 'red' : 'blue',
});

/** A01・A02（0V / NC）につながる端子 */
const melsecA = (id: string, label: string): Term => ({
  id,
  label,
  note: '三菱電機の 40 ピンコネクタの A01・A02（シンク出力ユニットでは COM（0V）、入力ユニットでは空き）',
  pins: [fcnPinNo('A', 1), fcnPinNo('A', 2)],
  mark: label === '0V' ? 'black' : undefined,
});

/** 三菱電機対応の記名板（出力ユニット用 / 入力ユニット用）の切換え */
export const melsecMarkerParam: ParamDef = {
  key: 'marker',
  label: '記名板',
  options: [
    { value: 'out', label: '出力ユニット用（+V / 0V）' },
    { value: 'in', label: '入力ユニット用（付属: COM / NC）' },
  ],
  default: 'out',
};

/** PCN7 の三菱電機対応品の結線タイプ（電源部の位置と 00〜0F の段） */
export const melsecWiringParam: ParamDef = {
  key: 'wiring',
  label: '結線タイプ',
  options: [
    { value: 'M1', label: 'M1: 電源部が左端（奥段 00〜0F）' },
    { value: 'M2', label: 'M2: 電源部が右端（手前段 00〜0F）' },
  ],
  default: 'M1',
};

/**
 * PCN7 の三菱電機対応 34 端子（M1・M2）。
 * - M1: 電源部が左端。奥段 +V・00〜0F、手前段 0V・10〜1F
 * - M2: 電源部が右端。奥段 10〜1F・+V、手前段 00〜0F・0V
 * 端子 ID は出力ユニット用の記名板の印字（+V・0V）。入力ユニット用の記名板では +V が COM、0V が NC。
 */
export function melsecM12Rows(wiring: string, marker: string): Rows {
  const plus = melsecB('+V', marker === 'in' ? 'COM' : '+V');
  const zero = melsecA('0V', marker === 'in' ? 'NC' : '0V');
  if (wiring === 'M2') return { upper: [...melsecIo(1), plus], lower: [...melsecIo(0), zero] };
  return { upper: [plus, ...melsecIo(0)], lower: [zero, ...melsecIo(1)] };
}

/**
 * PCX の三菱電機対応（M2）: 奥段 10〜1F、手前段 00〜0F、電源部が右端。
 * - TB34-M2-X（入力用）: 奥段の右端が COM（B01・B02）、手前段の右端が NC（A01・A02）
 * - TB34-M2-Y（出力用）: 奥段の右端が +V（B01・B02）、手前段の右端が 0V（A01・A02）
 * - TB40-M2-X（入力用、分岐端子付き）: 奥段の右端 4 端子が COM（B01・B02）、手前段の右端 4 端子が Service（COM）（コネクタにつながらない）
 * - TB40-M2-Y（出力用、分岐端子付き）: 奥段の右端 4 端子が +V（B01・B02）、手前段の右端 4 端子が 0V（A01・A02）
 */
export function melsecM2Rows(variant: 'TB34-X' | 'TB34-Y' | 'TB40-X' | 'TB40-Y'): Rows {
  const four = (f: (i: number) => Term) => Array.from({ length: 4 }, (_, i) => f(i + 1));
  switch (variant) {
    case 'TB34-X':
      return { upper: [...melsecIo(1), melsecB('COM', 'COM')], lower: [...melsecIo(0), melsecA('NC', 'NC')] };
    case 'TB34-Y':
      return { upper: [...melsecIo(1), melsecB('+V', '+V')], lower: [...melsecIo(0), melsecA('0V', '0V')] };
    case 'TB40-X':
      return {
        upper: [...melsecIo(1), ...four((i) => melsecB(`COM-${i}`, 'COM'))],
        lower: [
          ...melsecIo(0),
          ...four((i) => ({
            id: `SV-${i}`,
            label: 'SV',
            note: 'Service（COM）: コネクタにはつながらない分岐用のコモン（4 端子が内部で短絡、10A）。センサーの電源（0V など）の分岐に使う',
            bus: 'SV',
          })),
        ],
      };
    case 'TB40-Y':
      return {
        upper: [...melsecIo(1), ...four((i) => melsecB(`+V-${i}`, '+V'))],
        lower: [...melsecIo(0), ...four((i) => melsecA(`0V-${i}`, '0V'))],
      };
  }
}

/** PCW の三菱電機対応（C タイプ）: 手前段 00〜0F・C1 ×4（B01・B02）、奥段 10〜1F・C2 ×4（A01・A02） */
export function melsecCRows(): Rows {
  const four = (f: (i: number) => Term) => Array.from({ length: 4 }, (_, i) => f(i + 1));
  return {
    upper: [...melsecIo(1), ...four((i) => ({ ...melsecA(`C2-${i}`, 'C2'), mark: 'blue' as const }))],
    lower: [...melsecIo(0), ...four((i) => ({ ...melsecB(`C1-${i}`, 'C1'), mark: 'blue' as const }))],
  };
}

/** 三菱電機対応の MIL 40P のピンの表示名（ピン ID は FCN と同じ規則。三菱のピン番号を添える） */
/** 三菱用の MIL 40 極の端子台のピンの表示名（MIL の物理的なピン番号と、KB40N-4F1H でつながる三菱のピン番号） */
export const melsecMilPinLabel = (n: number) => `MIL ピン ${n}（KB40N-4F1H で三菱の ${fcnPinLabel(41 - n).replace('FCN ', '')} に当たる）`;
