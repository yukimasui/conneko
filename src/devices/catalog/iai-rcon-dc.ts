import { buildRcon24 } from '../iai/rcon';

/**
 * IAI R-unit RCON の 24V ドライバーユニット RCON-DC（DC ブラシレスモーター。ロボシリンダー RCD 用）。
 * RCON-DC-1（1 軸）・RCON-DC-2（2 軸）。上面の帯は茶。
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」、取扱説明書 MJ0384「3.2 24V ドライバーユニット」。
 */
export default buildRcon24({
  type: 'iai.rcon-dc',
  model: 'RCON-DC',
  name: 'R-unit 24V ドライバーユニット（DC ブラシレス）',
  stripe: '#8a5a3a',
  motorKind: 'IAI-RCON-MPG-DC',
  mpOptions: [
    { value: 0.7, label: 'RCD 3W × 1 軸（0.7A）' },
    { value: 1.4, label: 'RCD 3W × 2 軸（1.4A）' },
  ],
  mpDefault: 1.4,
  description:
    'IAI の R-unit（RCON）の 24V ドライバーユニット（DC ブラシレスモーター用）。ゲートウェイユニット（RCON-GW など）の右に連結し、ロボシリンダー RCD を 1 ユニットで 1〜2 軸動かす。' +
    '制御電源とモーター電源はゲートウェイユニットから連結で供給される（モーター電源の定格 1 軸 0.7A）。前面の駆動源遮断コネクターは軸ごとに MPO・MPI があり、通常は短絡する。',
});
