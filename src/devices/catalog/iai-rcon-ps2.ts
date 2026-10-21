import { MM, n2, plugV, text } from '../iai/parts';
import { blackSocket, frontConnector, ledLabel, RCON_H, rconBody, rconDefs, rconUnitBus } from '../iai/rcon';
import type { AcceptSpec, DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * IAI R-unit RCON の 200V 電源ユニット RCON-PS2-3（200V ドライバーユニット RCON-SC のモーター電源）。
 *
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」（ユニット構成: 最も左の 200V ドライバーユニットの左隣に連結）、
 *       取扱説明書 MJ0384「3.3 200V 電源ユニット」。W45.2 × H115 × D95mm。
 * AC200V 入力コネクター（PC5/4-GF-7.62）: 1 L1・2 L2・3 L3・4 保護接地。単相の場合は L1（Live）・L2（Neutral）、L3 は接続しない。
 * 接続できるモーター合計は三相 2,400W、単相 1,600W。外付け回生抵抗コネクター（RB+・RB−・PE）は上面。
 * 200V ドライバーユニットを連結する場合、右端には 200V 用ターミナルユニット RCON-GW-TRS（付属）を使う。
 */

const W = 45.2 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);
const ac = plugV({ x: X(15), y: Y(62), ids: ['L1', 'L2', 'L3', 'PE'], pitch: 7.62 * MM, w: 12 * MM, wire: 'left', labels: { L1: 'L1', L2: 'L2', L3: 'L3', PE: '⏚' }, labelColor: '#2b2d30', labelSize: 3 });
const RB = { x: X(22.6), y: Y(9) };

const three = (p: ParamValues) => Number(p.phase ?? 3) === 3;
const AC: AcceptSpec = { system: 'AC', minVoltage: 180, maxVoltage: 253 };

const svg = (p: ParamValues) => `
  ${rconDefs()}
  ${rconBody(W, 'RCON-PS2-3', '#7d8187')}
  ${blackSocket(RB.x, RB.y + 2, 16 * MM, 5 * MM)}
  ${ledLabel(X(38), Y(14), 'PWR', 'g', 'end')}${ledLabel(X(38), Y(17), 'ALM', 'off', 'end')}${ledLabel(X(38), Y(20), 'CHARGE', 'off', 'end')}
  ${text(X(22.6), Y(32), '200V POWER', 3, '#3a3c40', 'middle', 'bold')}
  ${text(X(22.6), Y(36), three(p) ? '3φ AC200V' : '1φ AC200V', 2.6, '#3a3c40', 'middle')}
  ${ac.svg}
  ${text(X(21), Y(57.5), 'AC200V IN', 2.4, '#3a3c40', 'middle')}`;

const terminals = (p: ParamValues): TerminalDef[] => {
  const at = (id: string) => ({ x: ac.pos[id].x, y: ac.pos[id].y, side: ac.pos[id].side });
  return [
    { id: 'L1', label: 'L1', note: three(p) ? 'AC200V 第一相' : 'AC200V Live', ...at('L1'), role: 'input', accepts: AC },
    { id: 'L2', label: 'L2', note: three(p) ? 'AC200V 第二相' : 'AC200V Neutral', ...at('L2'), role: 'input', accepts: AC },
    three(p)
      ? { id: 'L3', label: 'L3', note: 'AC200V 第三相', ...at('L3'), role: 'input', accepts: AC }
      : { id: 'L3', label: 'L3', note: '単相の場合は接続しない', ...at('L3'), role: 'signal', optional: true },
    { id: 'PE', label: '⏚', note: '保護接地', ...at('PE'), role: 'ground' },
    frontConnector('RB', 'RB（外付け回生抵抗）', '外付け回生抵抗ユニット（RESU-2/RESUD-2）の接続（上面）', RB.x, RB.y, { kind: 'IAI-RB', pins: 0, width: 30, length: 10, facing: 'front' }, 'top'),
  ];
};

const def: DeviceDefinition = {
  type: 'iai.rcon-ps2',
  name: 'R-unit 200V 電源ユニット',
  model: 'RCON-PS2-3',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の R-unit（RCON・RSEL）の 200V 電源ユニット。最も左の 200V ドライバーユニット（RCON-SC）の左隣に連結し、AC200V から 200V ドライバーユニットのモーター電源を作る。' +
    'AC200V 入力: L1・L2・L3（三相 AC200〜230V ±10%。単相は L1・L2 で L3 は未接続）と保護接地。接続できるモーター合計は三相 2,400W・単相 1,600W。' +
    '200V ドライバーユニットを連結した系の右端には 200V 用ターミナルユニット RCON-GW-TRS を使う。',
  labelPrefix: 'PS',
  width: W,
  height: RCON_H,
  svg,
  terminals,
  distinctGroups: [['L1', 'L2', 'L3']],
  params: [
    {
      key: 'phase',
      label: '電源',
      options: [
        { value: 3, label: '三相 AC200V' },
        { value: 1, label: '単相 AC200V' },
      ],
      default: 3,
    },
  ],
  bus: rconUnitBus({}),
};

export default def;
