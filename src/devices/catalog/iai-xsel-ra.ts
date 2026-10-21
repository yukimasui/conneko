import { buildXselFront } from '../iai/xsel-front';

/**
 * IAI プログラムコントローラー XSEL-RA / SA（単軸ロボット・直交ロボット・リニアサーボ・ロボシリンダー RCS 用、AC サーボ 1〜4 軸仕様）。
 * SCARA 用の XSEL-RAX / SAX も正面の作りは同じため、タイプのパラメーターで選べるようにした。作りは iai/xsel-front.ts
 * （出典: 総合カタログ CJ9005「XSEL-RA/SA」、取扱説明書 MJ0359）。
 */
export default buildXselFront({
  type: 'iai.xsel-ra',
  model: 'XSEL-RA/SA',
  name: 'プログラムコントローラー（AC サーボ多軸）',
  generation: 'RA',
  models: [
    { value: 'RA', label: 'RA: 標準タイプ', safety: false },
    { value: 'SA', label: 'SA: 安全カテゴリー対応タイプ', safety: true },
    { value: 'RAX', label: 'RAX: スカラロボット用 標準タイプ', safety: false },
    { value: 'SAX', label: 'SAX: スカラロボット用 安全カテゴリー対応タイプ', safety: true },
  ],
  net1Types: ['none', 'EP', 'EC'],
  net2Types: ['none', 'DV', 'CC', 'CIE', 'PR'],
  hasEth: true,
  hasMst: true,
  hasUsb: true,
  description:
    'IAI の AC サーボ用プログラムコントローラー XSEL-RA / SA（単軸ロボット・直交ロボット・リニアサーボ・RCS 用。図は 1〜4 軸仕様。XSEL-RAX / SAX はスカラロボット用で正面の作りは同じ）。SEL 言語で最大 255 プログラム・16 タスク。' +
    'AC 電源入力: CP_L・CP_N に制御電源（単相 AC200〜230V ±10%）、MP_R・MP_S・MP_T にモーター電源（三相 AC200〜230V。単相仕様は MP_S・MP_T に単相）、PE を接地。ノイズフィルター（SA は必須）・漏電ブレーカー・サーキットブレーカーを通して供給する。' +
    'システム I/O: EMGin +24V → EMG1（ティーチングボックスの非常停止接点）→ 非常停止スイッチ → EMGin IN、ENBin +24V → ENB1 → セーフティーゲート → ENBin IN と配線する（出荷時は 5-8・6-7・9-10・15-18・16-17・19-20 を短絡線で接続）。' +
    'RA は駆動源遮断リレー内蔵。SA（安全カテゴリー対応、カテゴリー4 まで）は EMG2・ENB2 の 2 系統目と、SDN 接点出力・DET 入力を使って外部に駆動源遮断回路を組む。RDY はレディー接点出力。' +
    'I/O スロット（I/O1・I/O2）: PIO ボード N1/P1（入力 32 / 出力 16）、N2/P2（入力 16 / 出力 32）。50 極 MIL コネクターで 1 に +24V、50 に 0V。I/O1 は入力ポート 000〜・出力ポート 300〜（出荷時 000 = プログラムスタート、300 = アラーム、301 = レディー、302 = 非常停止）、I/O2 は 032〜・316〜。' +
    'ネットワークボード: 位置 1 に EtherNet/IP・EtherCAT、位置 2 に DeviceNet・CC-Link・CC-Link IE Field・PROFIBUS-DP（EP と CIE は同時に使えない）。内蔵 Ethernet、RS-232C、拡張モーション制御マスター（MECHATROLINK-Ⅲ）。',
});
