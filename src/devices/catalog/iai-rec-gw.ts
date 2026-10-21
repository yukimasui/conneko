import { buildRconGateway } from '../iai/rcon-gw';

/**
 * IAI R-unit REC の EC ゲートウェイユニット REC-GW（エレシリンダー専用の多軸コントローラー）。
 * 右に EC 接続ユニット RCON-EC を連結し（1 台で 4 軸）、エレシリンダーをフィールドネットワークから制御する。
 * 前面・電源・システム I/O の作りは RCON-GW と共通（iai/rcon-gw.ts）で、筐体は黒。
 * 出典: IAI 総合カタログ CJ9005「R-unit (REC)」（構成ユニット説明: W30 × H115 × D95mm、DC24V ±10%、0.8A）、
 *       取扱説明書 MJ0394「REC」（フィールドネットワーク: CC-Link・CC-Link IE Field・DeviceNet・EtherCAT・EtherNet/IP・PROFIBUS-DP・PROFINET IO）。
 */
export default buildRconGateway({
  type: 'iai.rec-gw',
  prefix: 'REC-GW',
  name: 'R-unit EC ゲートウェイユニット（エレシリンダー用）',
  labelPrefix: 'REC',
  nets: ['CC', 'CIE', 'DV', 'EC', 'EP', 'PR', 'PRT'],
  defaultNet: 'EC',
  dark: true,
  description:
    'IAI のエレシリンダー専用の多軸コントローラー REC の EC ゲートウェイユニット。右に EC 接続ユニット RCON-EC（1 台で 4 軸）を連結し、PLC からフィールドネットワーク経由でエレシリンダーを制御する（右端にターミナルユニット）。' +
    '制御電源コネクター: CP に +24V、GND に 0V、FG。モーター電源コネクター: 24V・0V（エレシリンダーのモーター電源）。システム I/O: STOP+（内蔵 24V）→ 非常停止スイッチの b 接点 → STOP−。' +
    'フィールドネットワーク（上面）: CC-Link・CC-Link IE Field・DeviceNet・EtherCAT・EtherNet/IP・PROFIBUS-DP・PROFINET IO。',
});
