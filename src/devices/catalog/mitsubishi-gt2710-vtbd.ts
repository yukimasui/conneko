import { buildGot2000 } from '../mitsubishi/got2000';

/**
 * 三菱電機 GOT2000 シリーズ GT27 モデル GT2710-VTBD（10.4 型 TFT カラー、VGA 640×480、マルチタッチ、DC24V 電源、黒枠）。
 * 外形 W303 × H218 × D52 mm（GT2510-VTBD と同じ外形。1mm ≒ 1px）。見た目・端子は src/devices/mitsubishi/got2000.ts を参照。
 * GT27 は正面の右下に USB（ホスト）ポートの保護カバーがある。
 * 出典: 三菱電機 GOT2000 セレクションガイド（GT27 の電源仕様: DC24V +25%/−20%、最大負荷 48W 以下）、販売店の製品情報（外形 W303 × H218 × D52mm、
 *       Ethernet・RS-232・RS-422/485・USB・SD カード・増設インタフェース）
 */
export default buildGot2000({
  type: 'mitsubishi.gt2710-vtbd',
  model: 'GT2710-VTBD',
  frontUsb: true,
  description:
    '三菱電機 GOT2000 シリーズ GT27 モデルの 10.4 型 TFT カラー タッチパネル（VGA 640×480、マルチタッチ・ジェスチャー操作、黒枠、外形 W303 × H218 × D52mm、正面 IP67F）。電源は DC24V（+25% / −20%）を背面の電源端子台の +24V・0V に入れ、FG は接地する。消費電力は最大負荷（増設ユニット・オプションを含む）で 48W 以下。本体のみの消費電力は約 14W として消費電流 0.6A を見込んだ（推定）。Ethernet ポートで PLC（MELSEC iQ-R・iQ-F・Q の CPU 内蔵ポートや Ethernet ユニット、他社の PLC）と LAN ケーブルでつなぐ。RS-232（D-sub 9 ピン オス）・RS-422/485（D-sub 9 ピン メス）でシリアル接続もできる。USB（正面ホスト・背面ホスト・デバイス）、SD カード、増設インタフェース（通信ユニット・ビデオ/RGB ユニットなど）。図の下段は背面のインタフェースの概念図（並びは実機と異なる）。',
  estimated: '本体のみの消費電力（約 14W、0.6A）。資料で確かめられたのは最大負荷 48W 以下だけ',
  // 本体のみの消費電力 約 14W / DC24V（推定）
  loadCurrent: 0.6,
});
