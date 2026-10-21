/**
 * 東洋技研の標準品（1:1）コネクタ端子台。コネクタのピンと端子が 1 対 1 でつながる。
 * シリーズ・極数ごとの寸法（幅[mm]、取付けタブ込み）は各カタログの寸法図による。
 */
import type { DeviceDefinition, ParamDef, ParamValues } from '../types';
import { buildConnectorBlock, type Series } from './connector-block';
import { cnMakerParam, crimpParam, fcnAbRows, fcnPinLabel, markerParam, milAbRows } from './rows';

/** シリーズ・極数ごとの幅[mm] */
export const WIDTH_MM: Record<Series, Record<string, number>> = {
  // PCN7: 20P 80 / 34P 128 / 40P 149 / 50P 184、FCN40 149（奥行 40）
  pcn7: { MIL20: 80, MIL34: 128, MIL40: 149, MIL50: 184, FCN40: 149 },
  // PCX: 20P 49.5 / 34P 67.5 / 40P 75 / 50P 92.5、FCN40 75（奥行 43）
  pcx: { MIL20: 49.5, MIL34: 67.5, MIL40: 75, MIL50: 92.5, FCN40: 75 },
  // PCV5: 20P 57 / 34P 92 / 40P 107 / 50P 132、FCN40 107（奥行 43）
  pcv5: { MIL20: 57, MIL34: 92, MIL40: 107, MIL50: 132, FCN40: 107 },
  // PCW: PCV5 と同じ幅（20P 57 / 34P 92 / 40P 107 / 50P 132、FCN40 107）
  pcw: { MIL20: 57, MIL34: 92, MIL40: 107, MIL50: 132, FCN40: 107 },
};

/** 搭載コネクタの形式 */
const MIL_PARTS: Record<string, string> = {
  H: 'ヒロセ電機 HIF3BA-□PA-2.54DSA',
  T: 'オムロン XG4A-□31',
  J: '日本航空電子工業 PS-□PE-D4T1-LP1',
};

const SOURCES: Record<Series, string> = {
  pcn7: 'https://www.togi.co.jp/series/interface/204/',
  pcx: 'https://www.togi.co.jp/series/interface/210/',
  pcv5: 'https://www.togi.co.jp/series/interface/208/',
  pcw: 'https://www.togi.co.jp/series/interface/577/',
};

/** 形式（PCV5 は極数の後ろに「2」が付く: PCV5-1H342） */
function modelName(series: Series, cnMaker: string, poles: number, p: ParamValues): string {
  switch (series) {
    case 'pcn7':
      return `PCN7${p.crimp === 'R' ? 'R' : ''}-1${cnMaker}${poles}`;
    case 'pcx':
      return `PCX-1${cnMaker}${poles}${p.marker === 'M' ? '-M' : ''}`;
    case 'pcv5':
      return `PCV5-1${cnMaker}${poles}2`;
    case 'pcw':
      return `PCW-1${cnMaker}${poles}`;
  }
}

/** MIL コネクタの 1:1 タイプ */
export function buildMilStandard(series: Series, poles: 20 | 34 | 40 | 50): DeviceDefinition {
  const makers: ('H' | 'T' | 'J')[] = series === 'pcw' ? ['H', 'T'] : ['H', 'T', 'J'];
  const params: ParamDef[] = [cnMakerParam(makers)];
  if (series === 'pcx') params.push(markerParam);
  if (series === 'pcn7') params.push(crimpParam);
  const model = (p: ParamValues) => modelName(series, String(p.cnMaker ?? 'H'), poles, p);
  const label = series.toUpperCase();
  return buildConnectorBlock({
    type: `toyogiken.${series}-1h${poles}${series === 'pcv5' ? '2' : ''}`,
    name: 'MILコネクタ変換端子台',
    model,
    series,
    widthMm: WIDTH_MM[series][`MIL${poles}`],
    connector: 'MIL',
    poles,
    rows: (p) => milAbRows(poles, String(p.marker ?? 'AB')),
    params,
    description:
      `東洋技研 ${label} シリーズの標準品（1:1）コネクタ端子台、MIL ${poles}極（${MIL_PARTS.H.replace('□', String(poles))} など。搭載コネクタはパラメータで選ぶ）。` +
      `外形 ${WIDTH_MM[series][`MIL${poles}`]}mm 幅、IEC35mm（DIN）レール取付け。定格 AC/DC125V 1A。` +
      `端子はコネクタのピンと 1 対 1 で、奥段が B1〜B${poles / 2}（MIL ピン 2, 4, …）、手前段が A1〜A${poles / 2}（MIL ピン 1, 3, …、▲側）。` +
      `${series === 'pcx' ? '記名板「-M」は 1〜数字連番（印字が MIL ピン番号）。' : ''}` +
      `PLC の MIL ${poles}極の I/O ユニットとは MIL⇔MIL ケーブル（東洋技研 KB${poles}N-1H1H など）でつなぐ。出典: ${SOURCES[series]}`,
  });
}

/** FCN 40P（タイコエレクトロニクス 1747053-1）の 1:1 タイプ */
export function buildFcnStandard(series: Series): DeviceDefinition {
  const model = series === 'pcv5' ? 'PCV5-4F402' : series === 'pcn7' ? 'PCN7-4F40' : `${series.toUpperCase()}-4F40`;
  const params: ParamDef[] = series === 'pcn7' ? [crimpParam] : [];
  return buildConnectorBlock({
    type: `toyogiken.${series}-4f40${series === 'pcv5' ? '2' : ''}`,
    name: 'FCNコネクタ変換端子台',
    model: series === 'pcn7' ? (p) => (p.crimp === 'R' ? 'PCN7R-4F40' : 'PCN7-4F40') : model,
    series,
    widthMm: WIDTH_MM[series].FCN40,
    connector: 'FCN',
    poles: 40,
    rows: fcnAbRows(),
    pinLabel: fcnPinLabel,
    ...(params.length ? { params } : {}),
    description:
      `東洋技研 ${series.toUpperCase()} シリーズの標準品（1:1）コネクタ端子台、FCN 40極（タイコエレクトロニクス 1747053-1、三菱電機 MELSEC iQ-R / Q / L の 40 ピンコネクタと同じ系列）。` +
      `外形 ${WIDTH_MM[series].FCN40}mm 幅、IEC35mm（DIN）レール取付け。定格 AC/DC125V 1A。` +
      `端子はコネクタのピンと 1 対 1 で、奥段が B1〜B20、手前段が A1〜A20（三菱電機の I/O ユニットのピン番号 B01〜B20 / A01〜A20 と同じ）。` +
      `I/O ユニットとは FCN⇔FCN ケーブル（東洋技研 KB40N-4F4F など）でつなぐ（CN を三菱の I/O ユニットの CN1 へケーブルでつなぐ）。出典: ${SOURCES[series]}`,
  });
}
