import { buildDinPsu } from '../generic/din-psu';

/**
 * オムロン スイッチング・パワーサプライ S8VK-G（DC24V 品。15/30/60/120/240W）。
 * DIN レール取付。下側に入力 L・N・PE、上側に直流出力 -V・+V（S82K と同じ上下の配置）、出力側に DC ON 表示灯（緑）と出力電圧調整トリマ（V.ADJ）。
 * 外形（幅 × 高さ）: 15W 22.5×90、30W・60W 32×90、120W 40×125、240W 60×125 mm（1mm = 2px）。
 * 入力電流（AC100V 入力時 typ.）: 15W 0.35A、60W 1.2A、120W 1.5A。
 * 30W は同じ容量の 5V 品（S8VK-G03005）の 0.6A、240W は AC115V 入力時の 2.4A から AC100V 時を 2.8A と見積もった（推定）。
 */
export default buildDinPsu({
  type: 'omron.s8vk-g.dc24v',
  maker: 'オムロン',
  model: 'S8VK-G□□□24',
  modelOf: (c) => `S8VK-G${c.code}24`,
  description:
    'オムロンの DIN レール取付スイッチング電源 S8VK-G（DC24V 出力、入力 AC100〜240V）。容量は 15〜240W から選ぶ。入力のヒューズは L 側に内蔵、PE は必ず接地する。出力 +V / -V はそれぞれ 2 端子あり内部でつながっている。',
  estimated:
    '出力端子の数（+V・-V 各 2）と左右の並び、入力端子の並び（L・N・PE）、30W の入力電流（5V 品の値）、240W の AC100V 時の入力電流（AC115V 時の値からの換算）は推定',
  capacities: [
    { code: '015', watt: 15, amps: 0.65, widthMm: 22.5, heightMm: 90, inputCurrent: 0.35 },
    { code: '030', watt: 30, amps: 1.3, widthMm: 32, heightMm: 90, inputCurrent: 0.6 },
    { code: '060', watt: 60, amps: 2.5, widthMm: 32, heightMm: 90, inputCurrent: 1.2 },
    { code: '120', watt: 120, amps: 5, widthMm: 40, heightMm: 125, inputCurrent: 1.5 },
    { code: '240', watt: 240, amps: 10, widthMm: 60, heightMm: 125, inputCurrent: 2.8 },
  ],
  defaultAmps: 2.5,
  inputAt: 'bottom',
  outputOrder: ['-V1', '-V2', '+V1', '+V2'],
  inputOrder: ['L', 'N', 'PE'],
  look: {
    caseEdge: '#b9bbb8',
    caseMid: '#e9eae7',
    block: '#3a3d41',
    band: '#f4f4f2',
    face: '#dfe0dd',
    faceStroke: '#9ea19d',
    brand: 'OMRON',
    brandColor: '#1f4e9c',
    series: 'S8VK',
    seriesColor: '#2b2b2b',
    slit: '#8f938f',
    faceText: '#2b2b2b',
    trimmer: '#e8e8e8',
  },
});
