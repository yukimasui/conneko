import { buildRcon24 } from '../iai/rcon';

/**
 * IAI R-unit RCON の 24V ドライバーユニット RCON-AC（DC24V AC サーボモーター。ロボシリンダー RCA/RCA2/RCL 用）。
 * RCON-AC-1（1 軸）・RCON-AC-2（2 軸）。上面の帯は青。
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」、取扱説明書 MJ0384「3.2 24V ドライバーユニット」。
 */
export default buildRcon24({
  type: 'iai.rcon-ac',
  model: 'RCON-AC',
  name: 'R-unit 24V ドライバーユニット（AC サーボ）',
  stripe: '#2a6cc4',
  motorKind: 'IAI-RCON-MPG-AC',
  mpOptions: [
    { value: 1, label: '5W × 1 軸（1.0A）' },
    { value: 1.3, label: '10〜30W × 1 軸（1.3A）' },
    { value: 1.7, label: '20W（20S）× 1 軸（1.7A）' },
    { value: 2.6, label: '10〜30W × 2 軸（2.6A）' },
    { value: 3.4, label: '20W（20S）× 2 軸（3.4A）' },
  ],
  mpDefault: 2.6,
  description:
    'IAI の R-unit（RCON）の 24V ドライバーユニット（DC24V AC サーボモーター用）。ゲートウェイユニット（RCON-GW など）の右に連結し、ロボシリンダー RCA/RCA2/RCL を 1 ユニットで 1〜2 軸動かす。' +
    '制御電源とモーター電源はゲートウェイユニットから連結で供給される（モーター電源の定格: 10〜30W は 1 軸 1.3A）。' +
    '前面の駆動源遮断コネクターは軸ごとに MPO・MPI があり、通常は短絡、外部で遮断する場合は接点を入れる。',
});
