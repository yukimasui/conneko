import { buildMelsecBlock } from '../toyogiken/plc';
import { crimpParam, melsecM12Rows, melsecMarkerParam, melsecWiringParam } from '../toyogiken/rows';

/**
 * 東洋技研 PCN7-4F40-TB34-M1 / M2（三菱電機 PLC 対応、ネジ式、FCN 40 極 → 34 端子）。
 * - M1: 電源部が左端。奥段 +V・00〜0F、手前段 0V・10〜1F
 * - M2: 電源部が右端。奥段 10〜1F・+V、手前段 00〜0F・0V
 * 入力ユニットに使うときは付属の記名板（+V → COM、0V → NC）に差し替える（パラメータ marker）。外形 128 × 40mm。
 * 出典: https://www.togi.co.jp/series/interface/205/ （カタログ PCN7-□40-TB34-□ の記名板・結線図）
 */
export default buildMelsecBlock({
  type: 'toyogiken.pcn7-4f40-tb34-m1',
  model: (p) => `PCN7${p.crimp === 'R' ? 'R' : ''}-4F40-TB34-${p.wiring === 'M2' ? 'M2' : 'M1'}`,
  series: 'pcn7',
  widthMm: 128,
  connector: 'FCN',
  poles: 40,
  rows: (p) => melsecM12Rows(String(p.wiring), String(p.marker)),
  params: [melsecWiringParam, melsecMarkerParam, crimpParam],
  source: 'https://www.togi.co.jp/series/interface/205/',
  description:
    '東洋技研 PCN7 シリーズの三菱電機 PLC 対応コネクタ端子台（ネジ式、FCN 40 極、34 端子）。結線タイプ M1（電源部が左端、00〜0F が奥段）/ M2（電源部が右端、00〜0F が手前段）はパラメータで選ぶ。定格 AC/DC24V、0.5A（COM 2A）。',
});
