import { buildRconGateway } from '../iai/rcon-gw';

/**
 * IAI R-unit RCON のゲートウェイユニット RCON-GW / RCON-GWG（フィールドネットワーク経由で連結したドライバーユニットを制御する親）。
 * 作りは iai/rcon-gw.ts（出典: 総合カタログ CJ9005「R-unit (RCON)」、取扱説明書 MJ0384「RCON」）。
 */
export default buildRconGateway({
  type: 'iai.rcon-gw',
  prefix: 'RCON-GW',
  name: 'R-unit ゲートウェイユニット',
  labelPrefix: 'RCON',
  nets: ['DV', 'CC', 'CIE', 'CIT', 'PR', 'EC', 'ECM', 'EP', 'PRT', 'ML3', 'SSN', 'N'],
  defaultNet: 'EC',
  models: [
    { value: 'GW', label: 'RCON-GW（標準）', model: 'RCON-GW' },
    { value: 'GWG', label: 'RCON-GWG（安全カテゴリー対応）', model: 'RCON-GWG' },
  ],
  description:
    'IAI の R-unit（RCON）のゲートウェイユニット。右にドライバーユニット（RCON-PC/AC/DC・200V の RCON-SC）・EC 接続ユニット・PIO ユニットなどを連結し、PLC からフィールドネットワーク経由で最大 16 軸を制御する（右端にターミナルユニット）。' +
    '制御電源コネクター: CP に +24V、GND に 0V（連結した全ユニットの制御電源・ブレーキ電源。最大 9.0A）、FG を接地。モーター電源コネクター: 24V・0V（24V ドライバーユニット・エレシリンダーのモーター電源。最大 37.5A）。' +
    '制御電源とモーター電源は別系統で供給でき、モーター電源だけを接触器などで遮断できる。システム I/O: STOP+（内蔵 24V）→ 非常停止スイッチの b 接点 → STOP−（OFF で全ドライバーの駆動源を遮断）。S1・S2 はティーチングボックスの停止スイッチ、AUTO/MANU± は外部モード切替え（出荷時は 1-6、2-7、3-8 を短絡）。' +
    'フィールドネットワーク（上面）: DeviceNet・CC-Link・CC-Link IE Field・CC-Link IE TSN・PROFIBUS-DP・EtherCAT（モーション）・EtherNet/IP・PROFINET IO・MECHATROLINK-Ⅲ・SSCNETⅢ/H。GWG は安全カテゴリー対応（外部回路で 4 まで）。',
});
