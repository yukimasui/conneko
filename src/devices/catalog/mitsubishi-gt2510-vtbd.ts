import { buildGot2000 } from '../mitsubishi/got2000';

/**
 * 三菱電機 GOT2000 シリーズ GT25 モデル GT2510-VTBD（10.4 型 TFT カラー、VGA 640×480、DC24V 電源、黒枠）。
 * 見た目・端子は src/devices/mitsubishi/got2000.ts を参照。
 */
export default buildGot2000({
  type: 'mitsubishi.gt2510-vtbd',
  model: 'GT2510-VTBD',
  description:
    '三菱電機 GOT2000 シリーズ GT25 モデルの 10.4 型 TFT カラー タッチパネル（VGA 640×480、黒枠、外形 W303 × H218 × D52mm）。電源は DC24V（+25% / −20%）を背面の電源端子台の +24V・0V に入れ、FG は接地する。消費電力は本体のみで約 12W（バックライト・増設オプションを含む最大は約 34W）。Ethernet ポートで PLC（MELSEC iQ-R・iQ-F の CPU 内蔵ポートや Ethernet ユニット、他社の PLC）と LAN ケーブルでつなぐ。RS-232（D-sub 9 ピン オス）・RS-422/485（D-sub 9 ピン メス）でシリアル接続もできる。USB（ホスト・デバイス）、SD カード。図の下段は背面のインタフェースの概念図（並びは実機と異なる）。',
  // 本体のみの消費電力 約 12W / DC24V
  loadCurrent: 0.5,
});
