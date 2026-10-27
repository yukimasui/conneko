import { buildDinPsu } from '../generic/din-psu';

/**
 * IDEC スイッチングパワーサプライ PS5R-V（DC24V 品。15/30/60/90/120/240W）。
 * DIN レール取付の金属ケース。入力端子（L・N・⏚）を上にして取り付け（取付説明の「入力端子側を上」）、出力 +V・-V は下側。
 * 正面に DC ON 表示灯（緑）と出力電圧調整（V.ADJ。時計回りで上がる）。
 * 外形: 幅 15W・30W 22.5mm、60W・90W 36mm、120W 46mm、240W 60mm。高さは 95mm（60W 品の外形図。ほかの容量も同じとした）。
 * 入力電流（AC100V 時 typ.）は、データシートの表の値（0.35 / 0.7 / 1.3 / 1.1 / 1.4 / 2.7A）を容量の順に当てはめた（推定）。
 */
export default buildDinPsu({
  type: 'idec.ps5r-v.dc24v',
  maker: 'IDEC',
  model: 'PS5R-V□24',
  modelOf: (c) => `PS5R-V${c.code}24`,
  description:
    'IDEC の DIN レール取付スイッチングパワーサプライ PS5R-V（DC24V 出力、入力 AC100〜240V）。容量は 15〜240W から選ぶ。出力 +V / -V はそれぞれ 2 端子あり内部でつながっている。',
  estimated:
    '出力端子の数（+V・-V 各 2）と並び、入力端子の並び、60W 以外の高さ（95mm）、容量ごとの入力電流（データシートの表の値の割当て）は推定',
  capacities: [
    { code: 'B', watt: 15, amps: 0.65, widthMm: 22.5, heightMm: 95, inputCurrent: 0.35 },
    { code: 'C', watt: 30, amps: 1.3, widthMm: 22.5, heightMm: 95, inputCurrent: 0.7 },
    { code: 'D', watt: 60, amps: 2.5, widthMm: 36, heightMm: 95, inputCurrent: 1.3 },
    { code: 'E', watt: 90, amps: 3.75, widthMm: 36, heightMm: 95, inputCurrent: 1.1 },
    { code: 'F', watt: 120, amps: 5, widthMm: 46, heightMm: 95, inputCurrent: 1.4 },
    { code: 'G', watt: 240, amps: 10, widthMm: 60, heightMm: 95, inputCurrent: 2.7 },
  ],
  defaultAmps: 2.5,
  inputAt: 'top',
  outputOrder: ['+V1', '+V2', '-V1', '-V2'],
  inputOrder: ['L', 'N', 'PE'],
  look: {
    caseEdge: '#9da2a8',
    caseMid: '#d3d7db',
    block: '#3f4347',
    band: '#eceef0',
    face: '#4a4f56',
    faceStroke: '#2d3136',
    brand: 'IDEC',
    brandColor: '#ffffff',
    series: 'PS5R-V',
    seriesColor: '#e8ecf0',
    slit: '#2b2f34',
    faceText: '#eef1f4',
    trimmer: '#1f62c4',
  },
});
