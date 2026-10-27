import { buildTempSensor } from '../generic/temp-sensor';

/**
 * 汎用の測温抵抗体 Pt100（3 導線式、シース形、リード線引出し）。作りは src/devices/generic/temp-sensor.ts
 *
 * 出典: JIS C 1604（3 導線式の端子記号 A・B・B）。リード線の色（A 赤、B 白・白）はメーカーで違い、資料で確かめられなかったため推定。
 */
export default buildTempSensor({
  type: 'generic.rtd-pt100',
  name: '測温抵抗体（Pt100）',
  model: 'Pt100 3 導線式 シース形',
  description:
    '汎用の測温抵抗体 Pt100（白金、0℃ で 100Ω、3 導線式、シース形、リード線引出し）。温度調節器・PLC の測温抵抗体入力の A・B・B へつなぐ' +
    '（オムロン E5CC なら 4 に A、5・6 に B）。3 本の線は同じ太さ・長さにする（導線の抵抗を打ち消すため）。端子 ID の b は 2 本目の B。' +
    'リード線の色（A 赤、B 白・白）は推定（メーカーで違う）。',
  caption: 'Pt100',
  leads: [
    { id: 'A', label: 'A', color: '#d42020', colorName: '赤', note: 'A（抵抗体の片側、赤。色は推定）', hint: 'Pt A' },
    { id: 'B', label: 'B', color: '#f4f4f4', colorName: '白', note: 'B（抵抗体のもう片側、白。色は推定）', hint: 'Pt B' },
    { id: 'b', label: 'B', color: '#f4f4f4', colorName: '白', note: 'B（B と同じ側の 2 本目の導線、白。色は推定）', hint: 'Pt B' },
  ],
  estimated: 'リード線の色（A 赤、B 白・白）は推定（メーカーで違う）',
});
