import { DC24_PLUS, MM, n2, text } from '../iai/parts';
import { blackSocket, cpLoadParam, DRIVER_W, frontConnector, ledLabel, mpLoadParam, RCON_H, rconBody, rconDefs, rconUnitBus, toggle } from '../iai/rcon';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * IAI R-unit RCON の EC 接続ユニット RCON-EC-4（エレシリンダー（EC シリーズ）を 4 軸までつなぐ）。
 *
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」、取扱説明書 MJ0384「3.6 EC 接続ユニット」。
 * W22.6 × H115 × D95mm。前面に LED（T RUN・SYS、軸ごとの LS0・LS1/ALM）、ジョグスイッチ（軸ごと）、
 * EC 接続用コネクター（DF62 13 ピン × 4。1 24V(MP)・2 GND・3〜5 IN0〜2・6/10 SD±・7〜9 OUT0〜2・11 BKRLS・12 24V(CP)・13 FG）、
 * 駆動源遮断コネクター（DFMC1.5/4-ST-3.5、2×4: 8〜5 が MPI_1〜4、4〜1 が MPO_1〜4）。
 */

const W = DRIVER_W;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);
const EC = (i: number) => ({ x: X(9), y: Y(30 + i * 11) });
const CUT = { x: X(7), y: Y(78), dx: X(8.6), dy: X(3.5) };

const svg = () => {
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 1.8) => text(x, y, t, size, '#3a3c40', anchor);
  return `
  ${rconDefs()}
  ${rconBody(W, 'RCON-EC-4', '#e07a2a')}
  ${ledLabel(X(16), Y(10.5), 'T RUN', 'g', 'end')}${ledLabel(X(16), Y(13.5), 'SYS', 'g', 'end')}
  ${[0, 1, 2, 3].map((i) => `${led2(X(4), Y(18 + i * 2.4))}${led2(X(7), Y(18 + i * 2.4))}${toggle(X(14), Y(18 + i * 2.4))}${lbl(X(19), Y(18.6 + i * 2.4), String(i + 1), 'start', 1.6)}`).join('')}
  ${[0, 1, 2, 3].map((i) => `${blackSocket(EC(i).x, EC(i).y, 9 * MM, 8.6 * MM)}${lbl(X(17.5), Y(30.8 + i * 11), `EC${i + 1}`, 'start', 1.9)}`).join('')}
  <rect x="${n2(CUT.x - 4)}" y="${n2(CUT.y - 4)}" width="${n2(CUT.dx + 8)}" height="${n2(CUT.dy * 3 + 8)}" rx="1" fill="url(#rcblack-{{uid}})"/>
  ${[0, 1, 2, 3].map((r) => [0, 1].map((k) => `<rect x="${n2(CUT.x + k * CUT.dx - 2)}" y="${n2(CUT.y + r * CUT.dy - 1.4)}" width="4" height="2.8" rx="0.4" fill="#5d6166"/>`).join('')).join('')}`;
};

/** 小さな LED（LS0・LS1/ALM） */
function led2(x: number, y: number) {
  return `<rect x="${n2(x - 1)}" y="${n2(y - 0.8)}" width="2" height="1.6" rx="0.3" fill="#3b3f3c" stroke="#111" stroke-width="0.3"/>`;
}

const terminals: TerminalDef[] = [
  ...[0, 1, 2, 3].map((i) =>
    frontConnector(`EC${i + 1}`, `EC${i + 1}（${i + 1} 軸目 エレシリンダー）`, 'エレシリンダー（EC シリーズ）の接続ケーブル（DF62 13 ピン。モーター電源・制御電源・通信・入出力）', EC(i).x, EC(i).y, {
      kind: 'IAI-EC13',
      pins: 0,
      width: 16,
      length: 18,
      facing: 'front',
      protocols: ['iai-ec'],
    }),
  ),
  ...[0, 1, 2, 3].flatMap((i): TerminalDef[] => [
    {
      id: `MPI${i + 1}`,
      label: `MPI_${i + 1}`,
      note: `${i + 1} 軸目のモーター電源入力（MPO_${i + 1} と短絡するか、外部で遮断する場合は接点を通してつなぐ）`,
      x: n2(CUT.x - 4),
      y: n2(CUT.y + i * CUT.dy),
      side: 'left',
      role: 'input',
      accepts: DC24_PLUS,
      optional: true,
    },
    {
      id: `MPO${i + 1}`,
      label: `MPO_${i + 1}`,
      note: `${i + 1} 軸目のモーター電源出力（ゲートウェイユニットのモーター電源 24V が連結で来る）`,
      x: n2(CUT.x + CUT.dx + 4),
      y: n2(CUT.y + i * CUT.dy),
      side: 'right',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 6 },
      optional: true,
    },
  ]),
];

const def: DeviceDefinition = {
  type: 'iai.rcon-ec',
  name: 'R-unit EC 接続ユニット',
  model: 'RCON-EC-4',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の R-unit（RCON・REC）の EC 接続ユニット。ゲートウェイユニットの右に連結し、エレシリンダー（EC シリーズ）を 4 軸までつないでフィールドネットワークから制御する。' +
    'エレシリンダーのモーター電源・制御電源はゲートウェイユニットから連結で来て、EC 接続用コネクターのケーブルで各軸へ送る。駆動源遮断コネクターの MPI_n・MPO_n で軸ごとにモーター電源を外部で遮断できる（使わない場合は短絡）。' +
    '制御電源の消費はユニット 0.1A ＋ エレシリンダー 1 軸あたり 0.3A（ブレーキ付き 0.5A）。',
  labelPrefix: 'EC',
  width: W,
  height: RCON_H,
  svg,
  terminals,
  params: [
    cpLoadParam(
      [
        { value: 0.4, label: '1 軸（0.4A）' },
        { value: 0.7, label: '2 軸（0.7A）' },
        { value: 1, label: '3 軸（1.0A）' },
        { value: 1.3, label: '4 軸（1.3A）' },
        { value: 2.1, label: '4 軸・ブレーキ付き（2.1A）' },
      ],
      1.3,
    ),
    mpLoadParam(
      [
        { value: 2, label: '1〜2 軸（約 2A）' },
        { value: 4, label: '3〜4 軸（約 4A）' },
        { value: 8, label: '4 軸・大型（約 8A）' },
      ],
      4,
    ),
  ],
  bus: rconUnitBus({ CP: { param: 'cpLoad' }, MP: { param: 'mpLoad' } }),
};

export default def;
