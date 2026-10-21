import { buildXselFront } from '../iai/xsel-front';

/**
 * IAI プログラムコントローラー XSEL-P / Q（XSEL-RA/SA の前の世代。単軸ロボット・直交ロボット・ロボシリンダー RCS 用、AC サーボ 1〜4 軸仕様）。
 * 外形・電源・PIO ボード（50 極 MIL）の作りは XSEL-RA/SA と同じで、システム I/O は 18 極（AUTO 切替入力なし）、ティーチングは D-sub 25 ピン。
 * 内蔵 Ethernet・拡張モーション・USB はない（図では描かない）。作りは iai/xsel-front.ts（出典: 取扱説明書 MJ0148「XSEL-P/Q」）。
 */
export default buildXselFront({
  type: 'iai.xsel-p',
  model: 'XSEL-P/Q',
  name: 'プログラムコントローラー（AC サーボ多軸、旧世代）',
  generation: 'PQ',
  models: [
    { value: 'P', label: 'P: 標準仕様', safety: false },
    { value: 'Q', label: 'Q: グローバル仕様（安全カテゴリー対応）', safety: true },
    { value: 'PCT', label: 'PCT: 標準仕様（コンベアトラッキング）', safety: false },
    { value: 'QCT', label: 'QCT: グローバル仕様（コンベアトラッキング）', safety: true },
  ],
  net1Types: [],
  net2Types: ['none', 'DV', 'CC', 'PR'],
  hasEth: false,
  hasMst: false,
  hasUsb: false,
  description:
    'IAI の AC サーボ用プログラムコントローラー XSEL-P / Q（現行は XSEL-RA/SA・XSEL2。図は 1〜4 軸仕様）。SEL 言語でアクチュエーターを動かし、標準 I/O（入力 32 点・出力 16 点）で PLC・センサー・電磁弁とつなぐ。' +
    'AC 電源入力（PWR）: CP_L・CP_N に制御電源（単相 AC200V）、MP_R・MP_S・MP_T にモーター電源（三相 AC200V。単相仕様は MP_S・MP_T）、PE。' +
    'システム I/O（18 極）: EMGin +24V → EMG1 → 非常停止スイッチ → EMGin IN、ENBin +24V → ENB1 → セーフティーゲート → ENBin IN（出荷時は短絡）。Q（グローバル仕様）は EMG2・ENB2 と SDN・DET で外部の安全回路を組む（カテゴリー4 まで）。' +
    'Q タイプで AUTO にする場合はティーチングコネクター（D-sub 25 ピン）にダミープラグを差す。' +
    '標準 I/O（I/O1）・拡張 I/O（I/O2）: 50 極 MIL フラットコネクター（1 に +24V、50 に 0V）。入力ポート 000〜・出力ポート 300〜（出荷時 000 = プログラムスタート、300 = アラーム、301 = レディー、302 = 非常停止）。PIO ケーブル CB-X-PIO または MIL 50 極の変換端子台でつなぐ。' +
    'フィールドネットワーク: DeviceNet・CC-Link・PROFIBUS-DP。',
});
