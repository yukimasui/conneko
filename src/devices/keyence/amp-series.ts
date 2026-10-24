/**
 * KEYENCE の DIN レール取付アンプの各シリーズ（PS-N、LV-N、LR-XN、PX-10、CZ-V21A/V22A）。
 * 見た目と組み立ては din-amp.ts の buildDinAmp。
 *
 * 配線の出典（KEYENCE の取扱説明書・カタログ。Web の入出力回路図が非公開のものは第三者の転載で確認）:
 * - PS-N: PS-N10 シリーズ 取扱説明書 p.7・p.11 https://www.manualsdir.com/manuals/657880/keyence-ps-n10-series.html
 *   （親機 茶/青/黒 = 出力/桃 = 外部入力、子機 PS-N12 は黒だけ）。M8 タイプのピンの機能は、同じ構成の FS-N11CN の
 *   KEYENCE 入出力回路図（https://www.keyence.com/products/sensor/fiber-optic/fs-n/models/fs-n11cn/io-circuit/）による推定
 *   （ピン 1 = +V・3 = 0V は親機のみ、4 = 出力、2 = 外部入力）
 * - LV-N: LV-N10 シリーズ 取扱説明書 p.7〜8 https://www.manualsdir.com/manuals/657909/keyence-lv-n10-series.html
 *   （子機 LV-N12 は黒/白/桃）。LV-N11CN の M8 ピンの機能は PS-N と同じく推定
 * - LR-XN: LR-X カタログ p.20〜21・p.25 https://5.imimg.com/data5/SELLER/Doc/2022/9/EF/PO/AN/29295296/laser-sensor-lr-x100.pdf
 *   仕様 https://www.keyence.co.jp/products/sensor/photoelectric/lr-x/specs/
 * - PX-10: 取扱説明書 https://www.manualsdir.com/manuals/657881/keyence-px-10.html
 *   仕様 https://www.keyence.co.jp/products/sensor/photoelectric/px/specs/
 * - CZ-V21A / V22A: 取扱説明書 https://www.manualsdir.com/manuals/657886/keyence-cz-v22ap-cz-v21ap.html
 *   仕様 https://www.keyence.co.jp/products/sensor/photoelectric/cz-v20/specs/
 */
import type { BusSpec, DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildDinAmp } from './din-amp';
import { OUTPUT_PARAM, outName, sensorInput, switchedOut, type Lead } from './sensor-parts';

const plus = (v: string): Lead => ({ color: 'BN', label: `+V（${v}）`, role: 'plus' });
const MINUS: Lead = { color: 'BU', label: '0V', role: 'minus' };
const out = (color: Lead['color'], label: string): Lead => ({ color, label, role: 'out', signal: switchedOut });
const inp = (color: Lead['color'], label: string): Lead => ({ color, label, role: 'in', signal: sensorInput });
const nc = (color: Lead['color'], label = '未使用（+V / 0V は親機のみ）'): Lead => ({ color, label, role: 'nc' });

/** 白線（ピン 2）を出力2 と外部入力のどちらに使うか（初期設定で選ぶ機種） */
export const PIN2_PARAM: ParamDef = {
  key: 'pin2',
  label: '白線（ピン2）の機能',
  options: [
    { value: 'out', label: '制御出力2' },
    { value: 'in', label: '外部入力' },
  ],
  default: 'out',
};
const whSelectable = (inLabel: string): Lead => ({
  color: 'WH',
  label: `制御出力2 / ${inLabel}（params の pin2 で選ぶ）`,
  role: 'out',
  signal: (p: ParamValues) => (p.pin2 === 'in' ? sensorInput(p) : switchedOut(p)),
});

const hostBus = (kind: string, slots: number): BusSpec => ({ kind, host: { slots } });
const unitBus = (kind: string): BusSpec => ({ kind });

const NP = (p: ParamValues) => (p.output === 'P' ? 'P' : 'N');

/* ------------------------------------------------------------------ */
/* PS-N（アンプ分離型光電センサ）                                        */
/* ------------------------------------------------------------------ */

export function buildPsn(unit: 'main' | 'expansion', conn: 'cable' | 'M8'): DeviceDefinition {
  const main = unit === 'main';
  const series = `PS-N1${main ? 1 : 2}${conn === 'M8' ? 'C' : ''}`;
  const desc =
    `KEYENCE のアンプ分離型光電センサ PS-N シリーズのアンプ ${series}N / ${series}P（${main ? '親機' : '子機'}、${conn === 'M8' ? 'M8 4ピン コネクタ' : 'ケーブル 2m'}、DIN レール取付）。` +
    'センサヘッド（PS シリーズ、別売）は左端に差し込む（ヘッドには電気配線がない）。出力形式は params の output で NPN / PNP を選ぶ。' +
    (main
      ? conn === 'M8'
        ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力、2（白）= 外部入力（ピンの機能は FS-N11CN の回路図からの推定）。'
        : '芯線は茶 = +24V、青 = 0V、黒 = 制御出力、桃 = 外部入力。'
      : '親機（PS-N11）の横に連結して使い、電源は親機から供給される。図面では mount で親機に装着する（最大 16 台）。' +
        (conn === 'M8' ? 'M8 のピン 4 = 制御出力、2 = 外部入力（ピン 1・3 は未使用。推定）。' : 'ケーブルは黒（制御出力）1 本だけで、外部入力はない。')) +
    '外部入力は NPN タイプは 0V、PNP タイプは +V と短絡で ON。制御出力はオープンコレクタ 30V、単体 100mA 以下・増設時 20mA 以下。電源 DC24V（DC10〜30V）、消費電流 24V 時 28mA（PNP 30mA）以下。';
  const cableLeads = main
    ? [plus('DC10〜30V'), MINUS, out('BK', '制御出力（NPN/PNP は出力形式による）'), inp('PK', '外部入力')]
    : [out('BK', '制御出力（NPN/PNP は出力形式による）')];
  const pinLeads = main
    ? [plus('DC10〜30V'), inp('WH', '外部入力'), MINUS, out('BK', '制御出力')]
    : [nc('BN'), inp('WH', '外部入力'), nc('BU'), out('BK', '制御出力')];
  return buildDinAmp({
    type: `keyence.ps-n${main ? '11' : '12'}${conn === 'M8' ? '.m8' : ''}`,
    name: `光電センサ アンプ（アンプ分離型・${main ? '親機' : '子機'}）`,
    model: `${series}N / ${series}P`,
    description: desc,
    labelPrefix: 'PH',
    series: `PS-N ${main ? '親機' : '子機'}`,
    modelText: (p) => `${series}${NP(p)}`,
    title: (p) => `光電アンプ PS-N ${main ? '親機' : '子機'}・${outName(p)}`,
    left: 'head',
    headLabel: 'ヘッド PS-xx',
    accent: '#d8262a',
    display: ['3000', '2500'],
    conn,
    cableLeads,
    pinLeads,
    vmin: 10,
    vmax: 30,
    rated: main ? 0.1 : 0.02,
    params: [OUTPUT_PARAM],
    loadCurrent: main ? 0.03 : undefined,
    bus: main ? hostBus('ps-n', 16) : unitBus('ps-n'),
  });
}

/* ------------------------------------------------------------------ */
/* LV-N（デジタルレーザセンサ）の子機・M8 親機                            */
/* ------------------------------------------------------------------ */

export const LVN_HOST_BUS = hostBus('lv-n', 16);

export function buildLvn(unit: 'expansion' | 'main-m8'): DeviceDefinition {
  const main = unit === 'main-m8';
  const series = main ? 'LV-N11C' : 'LV-N12';
  return buildDinAmp({
    type: main ? 'keyence.lv-n11.m8' : 'keyence.lv-n12',
    name: `レーザセンサ アンプ（${main ? '親機' : '子機'}）`,
    model: `${series}N / ${series}P`,
    description:
      `KEYENCE のデジタルレーザセンサ LV-N シリーズのアンプ ${series}N / ${series}P（${main ? '親機、M8 4ピン コネクタ、1 出力 + 外部入力 1' : '子機、ケーブル 2m、2 出力 + 外部入力 1'}、DIN レール取付）。` +
      'センサヘッド（LV-NH シリーズ、別売）は左端に差し込む。出力形式は params の output で NPN / PNP を選ぶ。' +
      (main
        ? 'M8 のピン 1（茶）= +24V、3（青）= 0V、4（黒）= 制御出力、2（白）= 外部入力（ピンの機能は FS-N11CN の回路図からの推定）。'
        : '親機（LV-N11 / LV-N11C）の横に連結して使い、電源は親機から供給される（図面では mount で装着、最大 16 台）。ケーブルは 3 芯で、黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力。') +
      '外部入力は NPN タイプは 0V、PNP タイプは +V と短絡で ON。制御出力はオープンコレクタ 30V、単体 100mA 以下（2 出力合計）・増設時 20mA 以下。電源 DC24V（DC10〜30V）。',
    labelPrefix: 'LS',
    series: `LV-N ${main ? '親機' : '子機'}`,
    modelText: (p) => `${series}${NP(p)}`,
    title: (p) => `レーザアンプ LV-N ${main ? '親機 M8' : '子機'}・${outName(p)}`,
    left: 'head',
    headLabel: 'ヘッド LV-NH',
    display: ['3500', '3000'],
    conn: main ? 'M8' : 'cable',
    cableLeads: [out('BK', '制御出力1'), out('WH', '制御出力2'), inp('PK', '外部入力')],
    pinLeads: [plus('DC10〜30V'), inp('WH', '外部入力'), MINUS, out('BK', '制御出力')],
    vmin: 10,
    vmax: 30,
    rated: main ? 0.1 : 0.02,
    outputTotal: main ? 0.1 : undefined,
    params: [OUTPUT_PARAM],
    loadCurrent: main ? 0.03 : undefined,
    bus: main ? LVN_HOST_BUS : unitBus('lv-n'),
  });
}

/* ------------------------------------------------------------------ */
/* LR-XN（CMOS レーザセンサ LR-X のアンプ）                              */
/* ------------------------------------------------------------------ */

export function buildLrxn(unit: 'main' | 'expansion' | 'main-m8'): DeviceDefinition {
  const series = unit === 'main' ? 'LR-XN11' : unit === 'expansion' ? 'LR-XN12' : 'LR-XN11C';
  const m8 = unit === 'main-m8';
  const name = (p: ParamValues) => (m8 ? series : `${series}${NP(p)}`);
  return buildDinAmp({
    type: `keyence.${series.toLowerCase().replace('c', '')}${m8 ? '.m8' : ''}`,
    name: `レーザセンサ アンプ（LR-X 用・${unit === 'expansion' ? '子機' : '親機'}）`,
    model: m8 ? 'LR-XN11C' : `${series}N / ${series}P`,
    description:
      `KEYENCE の CMOS レーザセンサ LR-X シリーズのアンプ ${m8 ? 'LR-XN11C（M8 4ピン コネクタ、増設不可）' : `${series}N / ${series}P（${unit === 'main' ? '親機' : '子機'}、ケーブル 2m）`}、DIN レール取付。` +
      'センサヘッド（LR-XH シリーズ）は左端に差し込む。' +
      (m8
        ? 'NPN / PNP と、白線（ピン 2）を出力2 と外部入力のどちらに使うかは本体の設定で選ぶ（params の output・pin2）。M8 のピン 1（茶）= +V、3（青）= 0V、4（黒）= 制御出力1、2（白）= 制御出力2 / 外部入力。'
        : unit === 'main'
          ? '出力形式は params の output で NPN / PNP を選ぶ。芯線は茶 = +V、青 = 0V、黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力。'
          : '親機（LR-XN11）の横に連結して使い、電源は親機から供給される（図面では mount で装着、最大 8 台）。出力形式は params の output で選ぶ。芯線は黒 = 制御出力1、白 = 制御出力2、桃 = 外部入力。') +
      '外部入力（チューニング / 投光停止 / ゼロシフトなど）は NPN は 0V、PNP は +V と短絡で ON。制御出力はオープンコレクタ DC30V 以下、単体 1 出力 100mA 以下（2 出力合計 100mA）、増設時 50mA 以下。電源 DC16〜30V（子機 4 台以上は 20V 以上）。',
    labelPrefix: 'LS',
    series: `LR-X ${unit === 'expansion' ? '子機' : '親機'}`,
    modelText: name,
    title: (p) => `LR-X アンプ ${unit === 'expansion' ? '子機' : m8 ? '親機 M8' : '親機'}・${outName(p)}`,
    left: 'head',
    headLabel: 'ヘッド LR-XH',
    display: ['100.0', '85.0'],
    conn: m8 ? 'M8' : 'cable',
    cableLeads:
      unit === 'main'
        ? [plus('DC16〜30V'), MINUS, out('BK', '制御出力1'), out('WH', '制御出力2'), inp('PK', '外部入力')]
        : [out('BK', '制御出力1'), out('WH', '制御出力2'), inp('PK', '外部入力')],
    pinLeads: [plus('DC16〜30V'), whSelectable('外部入力'), MINUS, out('BK', '制御出力1')],
    vmin: 16,
    vmax: 30,
    rated: unit === 'expansion' ? 0.05 : 0.1,
    outputTotal: unit === 'expansion' ? undefined : 0.1,
    params: m8 ? [OUTPUT_PARAM, PIN2_PARAM] : [OUTPUT_PARAM],
    bus: unit === 'main' ? hostBus('lr-xn', 8) : unit === 'expansion' ? unitBus('lr-xn') : undefined,
  });
}

/* ------------------------------------------------------------------ */
/* PX-10（耐油・防水型光電センサのアンプ）                                */
/* ------------------------------------------------------------------ */

export function buildPx10(): DeviceDefinition {
  return buildDinAmp({
    type: 'keyence.px-10',
    name: '光電センサ アンプ（耐油・防水型 PX 用）',
    model: 'PX-10 / PX-10P',
    description:
      'KEYENCE の耐油・防水型光電センサ PX シリーズのアンプ PX-10（NPN）/ PX-10P（PNP）（ケーブルタイプ、DIN レール取付）。' +
      'センサヘッド（PX-H71 / H72 / H61 など、別売）を左端につなぐ。出力形式は params の output で選ぶ。' +
      '芯線は茶 = +V、青 = 0V、黒 = 検出出力、白 = アラーム出力、桃 = 外部入力（NPN は 0V、PNP は +V と短絡で ON）。' +
      '制御出力はオープンコレクタ（NPN 40V / PNP 30V）、1 出力 100mA 以下・2 出力合計 100mA 以下。電源 DC12〜24V（リップル 10% 以下）。' +
      'コネクタタイプ（PX-10C / PX-10CP）はコネクタの形状を確認できていないため未実装。',
    labelPrefix: 'PH',
    series: 'PX-10',
    modelText: (p) => `PX-10${p.output === 'P' ? 'P' : ''}`,
    title: (p) => `PX アンプ・${outName(p)}`,
    left: 'head',
    headLabel: 'ヘッド PX-H',
    display: ['2000', '1800'],
    conn: 'cable',
    cableLeads: [plus('DC12〜24V'), MINUS, out('BK', '検出出力'), out('WH', 'アラーム出力'), inp('PK', '外部入力')],
    vmin: 10.8,
    vmax: 26.4,
    rated: 0.1,
    outputTotal: 0.1,
    params: [OUTPUT_PARAM],
  });
}

/* ------------------------------------------------------------------ */
/* CZ-V21A / CZ-V22A（デジタル RGB センサのアンプ）                       */
/* ------------------------------------------------------------------ */

export function buildCzv(unit: 'main' | 'expansion'): DeviceDefinition {
  const main = unit === 'main';
  const series = main ? 'CZ-V21A' : 'CZ-V22A';
  const outs: Lead[] = [out('BK', '制御出力1'), out('WH', '制御出力2'), out('GY', '制御出力3'), out('OG', '制御出力4')];
  return buildDinAmp({
    type: main ? 'keyence.cz-v21a' : 'keyence.cz-v22a',
    name: `RGB センサ アンプ（${main ? '親機' : '子機'}）`,
    model: `${series} / ${series}P`,
    description:
      `KEYENCE のデジタル RGB センサ CZ-V20 シリーズのアンプ ${series}（NPN）/ ${series}P（PNP）（${main ? '親機' : '子機'}、ケーブルタイプ、4 出力、DIN レール取付）。` +
      'ファイバ（CZ-H シリーズのヘッド）を左端に差し込む。出力形式は params の output で選ぶ。' +
      (main
        ? '芯線は茶 = DC24V、青 = 0V、黒・白・灰・橙 = 制御出力1〜4、桃 = 外部チューニング入力、紫 = 外部バンク切換 / シフト入力。'
        : '親機（CZ-V21A）の横に連結して使い、電源は親機から供給される（図面では mount で装着、最大 3 台）。芯線は黒・白・灰・橙 = 制御出力1〜4、紫 = 外部バンク切換 / シフト入力（茶・青・桃はない）。') +
      '外部入力は NPN は 0V、PNP は +V と短絡で ON。制御出力はオープンコレクタ（NPN 40V / PNP 30V）、1 出力 100mA 以下・4 出力合計 200mA 以下（増設時 20mA 以下）。電源 DC24V（リップル 10% 以下）。',
    labelPrefix: 'CS',
    series: `CZ-V20 ${main ? '親機' : '子機'}`,
    modelText: (p) => `${series}${p.output === 'P' ? 'P' : ''}`,
    title: (p) => `RGB センサ アンプ ${main ? '親機' : '子機'} 4出力・${outName(p)}`,
    left: 'fiber',
    accent: '#2a7ad8',
    display: ['999', '1000'],
    conn: 'cable',
    cableLeads: main
      ? [plus('DC24V'), MINUS, ...outs, inp('PK', '外部チューニング入力'), inp('VT', '外部バンク切換 / シフト入力')]
      : [...outs, inp('VT', '外部バンク切換 / シフト入力')],
    vmin: 21.6,
    vmax: 26.4,
    rated: main ? 0.1 : 0.02,
    outputTotal: main ? 0.2 : undefined,
    params: [OUTPUT_PARAM],
    bus: main ? hostBus('cz-v20', 3) : unitBus('cz-v20'),
  });
}
