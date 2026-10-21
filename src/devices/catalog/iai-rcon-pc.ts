import { buildRcon24 } from '../iai/rcon';

/**
 * IAI R-unit RCON の 24V ドライバーユニット RCON-PC（パルスモーター。ロボシリンダー RCP6/RCP5/RCP4/RCP3/RCP2 用）。
 * RCON-PC-1（1 軸）・RCON-PC-2（2 軸）・RCON-PCF-1（高推力 56SP/60P/86P、1 軸）。上面の帯は緑。
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」（ユニット名称と単品型式・電源容量）、取扱説明書 MJ0384「3.2 24V ドライバーユニット」。
 */
export default buildRcon24({
  type: 'iai.rcon-pc',
  model: 'RCON-PC',
  name: 'R-unit 24V ドライバーユニット（パルスモーター）',
  stripe: '#3fae49',
  motorKind: 'IAI-RCON-MPG',
  models: [
    { value: 'RCON-PC-2', label: 'RCON-PC-2（2 軸）', axes: 2 },
    { value: 'RCON-PC-1', label: 'RCON-PC-1（1 軸）', axes: 1 },
    { value: 'RCON-PCF-1', label: 'RCON-PCF-1（高推力 1 軸）', axes: 1 },
  ],
  mpOptions: [
    { value: 0.8, label: 'RCP2 20P/28P × 1 軸（0.8A）' },
    { value: 1.9, label: '28P〜56P × 1 軸（1.9A）' },
    { value: 2.3, label: '高出力設定 × 1 軸（定格 2.3A）' },
    { value: 3.8, label: '28P〜56P × 2 軸（3.8A）' },
    { value: 4.6, label: '高出力設定 × 2 軸（定格 4.6A）' },
    { value: 5.7, label: 'PCF 56SP/60P/86P × 1 軸（5.7A）' },
  ],
  mpDefault: 3.8,
  description:
    'IAI の R-unit（RCON）の 24V ドライバーユニット（パルスモーター用）。ゲートウェイユニット（RCON-GW など）の右に連結し、ロボシリンダー RCP6/RCP5/RCP4/RCP3/RCP2 を 1 ユニットで 1〜2 軸動かす。' +
    '制御電源とモーター電源はゲートウェイユニットから連結で供給される（モーター電源の消費: 28P〜56P は 1 軸 1.9A、高出力設定で 2.3A、PCF は 5.7A）。' +
    '前面の駆動源遮断コネクターは軸ごとに MPO（モーター電源出力）と MPI（モーター電源入力）があり、通常は短絡、外部で駆動源を遮断する場合は接触器などの接点を入れる。' +
    'モーター・エンコーダーコネクター（MPG Ⅰ・Ⅱ）にアクチュエーターのケーブルをつなぐ。',
});
