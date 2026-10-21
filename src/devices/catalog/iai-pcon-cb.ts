import { buildCbSeries, networkList } from '../iai/cb-series';

/**
 * IAI ポジションコントローラー PCON-CB / PCON-CGB（ロボシリンダー RCP6/RCP5/RCP4/RCP3/RCP2 用、パルスモーター）。
 * 出典: IAI 総合カタログ CJ9005「PCON-CB/CFB」（型式項目・基本仕様・PIO 入出力回路・PIO パターンと信号割付け・
 *       外形寸法図・各部名称）、取扱説明書 MJ0342「PCON-CB/CGB/CFB/CGFB/CBP/CGBP」（電源コネクターの配線）。
 * https://www.iai-robot.co.jp/download/catalog/
 */
export default buildCbSeries({
  type: 'iai.pcon-cb',
  series: 'PCON',
  variant: 'CB',
  name: 'ポジションコントローラー（ロボシリンダー用）',
  panel: ['#1f4b47', '#163633'],
  motorKind: 'IAI-RCP-MPG',
  actuators: 'RCP6/RCP5/RCP4/RCP3/RCP2',
  out15: 'LOAD/TRQS/*ALML',
  motorParam: {
    key: 'loadCurrent',
    label: 'モーター（負荷電流）',
    unit: 'A',
    options: [
      { value: 1, label: '20P/28P/28SP（最大 1A）' },
      { value: 2.2, label: '28P〜56P（最大 2.2A）' },
      { value: 4.2, label: '高出力設定（パワーコン。最大 4.2A）' },
    ],
    default: 2.2,
  },
  description:
    'IAI のロボシリンダー（RCP6/RCP5/RCP4/RCP3/RCP2、パルスモーター）用の 1 軸ポジションコントローラー。電源は DC24V ±10%（制御電源とモーター電源を兼ねる。負荷電流は最大 2.2A、高出力設定で最大 4.2A）。' +
    'タイプ: CB（標準）/ CGB（安全カテゴリー対応。モーター駆動電源を外部の接触器などで遮断する回路を組む）。' +
    `I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6 コネクター）、パルス列（差動入力）、フィールドネットワーク（${networkList}）。` +
    'PIO は付属の PIO ケーブル CB-PAC-PIO（片側バラ線。Conneko では iai.cb-pac-pio）で PLC の入出力や端子台につなぐ。PIO の 1A・2A に I/O 用電源 +24V（P24）、19B・20B に 0V（N）を供給する。' +
    'NPN 仕様の入力はプラスコモン（PLC の NPN 出力で駆動）、出力は NPN（ON で 0V に引き込む、最大 50mA）。PNP 仕様は入力がマイナスコモン、出力が PNP。' +
    '電源コネクター: 24V・0V（制御電源）、MPI・MPO（モーター駆動電源。通常は短絡）、EMG-（+24V で非常停止解除）、S1・S2（ティーチングボックスの停止スイッチ）、BK（ブレーキ強制解除）。' +
    'PIO パターン（パラメーター No.25）でピンの信号が変わる（0: 位置決め 64 点、2: 256 点、3: 512 点、4/5: 電磁弁モードなど）。',
});
