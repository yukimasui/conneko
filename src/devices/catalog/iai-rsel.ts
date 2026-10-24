import { fieldbusBlock, IO_TYPE_LABELS, type IoType } from '../iai/fieldbus';
import { DC24_MINUS, DC24_PLUS, hif6Connector, hif6HeaderV, iaiDefs, MM, n2, plugV, rj45Side, slideSwitch, stopLoop, text } from '../iai/parts';
import { pioLinks, pioPins, selPio40 } from '../iai/pio';
import { ledLabel, RCON_BUS, RCON_H, rconBody, rconDefs } from '../iai/rcon';
import type { DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * IAI R-unit のプログラムコントローラー RSEL-G（SEL ユニット。連結したドライバーユニットを SEL 言語のプログラムで動かす親）。
 *
 * 出典: IAI 総合カタログ CJ9005「R-unit (RSEL)」（各部名称・ユニット構成）、取扱説明書 MJ0392「RSEL」
 *       （3.1 SEL ユニット: 制御電源・モーター電源・ティーチングコネクター・Ethernet・I/O スロット・システム I/O、3.1.5 PIO 仕様）。
 * 外観: W56.6 × H115 × D95mm、アイボリーの樹脂。前面に Ethernet、LED（MODE・PWR・T.RUN・SYS・STOP・ENB）、ティーチングコネクター、
 * I/O スロット（PIO 40 極 HIF6 またはフィールドネットワーク）、モードスイッチ、USB、システム I/O（2 列 × 8）、モーター電源・制御電源（緑）。
 *
 * システム I/O・PSA-24 通信（DFMC1.5/8-ST-3.5、16 極）: 16 PS24 SD+、15 NC、14 STOPIN（停止入力）、13 STOPOUT（停止用 24V 出力）、
 *   12 STOPS1+・11 STOPS1−、10 STOPS2+・9 STOPS2−（停止接点 1・2。ティーチングボックスの停止スイッチ）、8 PS24 SD−、7 GND、
 *   6 ENBIN（イネーブル入力）、5 ENBOUT（イネーブル用 24V 出力）、4 ENBS1+・3 ENBS1−、2 ENBS2+・1 ENBS2−。
 *   出荷時は STOPOUT → STOPS1 → STOPS2 → STOPIN、ENBOUT → ENBS1 → ENBS2 → ENBIN の順に短絡線でつながっている。
 * 制御電源: 3 CP（+24V）・2 GND・1 FG、モーター電源: 2 24V・1 0V（システムとして最大 30A）。
 * PIO（I/O スロット、NP/PN）: 1A・2A P24、5A〜20A 入力ポート 000〜015、1B〜16B 出力ポート 300〜315、19B・20B N（入力 4mA、出力 50mA/点）。
 */

const W = n2(56.6 * MM);
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

const IO_TYPES: (IoType | 'E')[] = ['NP', 'PN', 'CC', 'CIE', 'DV', 'EC', 'EP', 'PR', 'PRT', 'E'];
const ioOf = (p: ParamValues) => String(p.io ?? 'NP') as IoType | 'E';

const SYS_L = ['PS24SD+', 'NC', 'STOPIN', 'STOPOUT', 'STOPS1+', 'STOPS1-', 'STOPS2+', 'STOPS2-'];
const SYS_R = ['PS24SD-', 'GND', 'ENBIN', 'ENBOUT', 'ENBS1+', 'ENBS1-', 'ENBS2+', 'ENBS2-'];
const PINNO: Record<string, number> = Object.fromEntries([...SYS_L.map((id, i) => [id, 16 - i]), ...SYS_R.map((id, i) => [id, 8 - i])]);
const sysL = plugV({ x: X(27), y: Y(55), ids: SYS_L, pitch: 3.5 * MM, w: 4.6 * MM, color: 'black', wire: 'left' });
const sysR = plugV({ x: X(32), y: Y(55), ids: SYS_R, pitch: 3.5 * MM, w: 4.6 * MM, color: 'black', wire: 'left' });
const mp = plugV({ x: X(41), y: Y(50), ids: ['MP+', 'MP0V'], pitch: 7.5 * MM, w: 10 * MM, wire: 'right', labels: { 'MP+': '24V', MP0V: '0V' }, labelColor: '#2b2d30', labelSize: 2.2 });
const cp = plugV({ x: X(43), y: Y(70), ids: ['CP', 'GND0', 'FG'], pitch: 5 * MM, w: 8 * MM, wire: 'right', labels: { CP: 'CP', GND0: '0V', FG: 'FG' }, labelColor: '#2b2d30', labelSize: 2 });
const ETH = { x: X(46), y: Y(15) };
const TP = { x: X(9), y: Y(28) };
const USB = { x: X(46), y: Y(42) };
const PIO = { x: X(12), y: Y(66) };
const SLOT = { x: X(3), y: Y(44), w: 18 * MM, h: 44 * MM };

const svg = (p: ParamValues) => {
  const io = ioOf(p);
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 1.9) => text(x, y, t, size, '#3a3c40', anchor);
  const slot =
    io === 'NP' || io === 'PN'
      ? `${hif6HeaderV(PIO.x, PIO.y, 40)}${lbl(X(19.5), Y(52), 'I/O', 'start', 2)}${lbl(X(19.5), Y(55), io === 'PN' ? 'PNP' : 'NPN', 'start', 2)}${ledLabel(X(20.5), Y(80), 'RUN', 'g')}${ledLabel(X(20.5), Y(83), 'ERR', 'off')}`
      : io === 'E'
        ? `<rect x="${X(4)}" y="${Y(45)}" width="${X(16)}" height="${X(42)}" rx="1" fill="#e2ded1" stroke="#b5b0a3" stroke-width="0.4"/>`
        : fieldbusBlock(io, SLOT, 'left', '#3a3c40').svg;
  return `
  ${rconDefs()}
  ${iaiDefs(['#ece8dc', '#d9d5c8'])}
  ${rconBody(W, `RSEL-G-${io}`)}
  <rect x="${n2(ETH.x - 11)}" y="${n2(ETH.y - 12)}" width="22" height="24" rx="1" fill="url(#rcshield-{{uid}})" stroke="#5d6166" stroke-width="0.5"/>
  <rect x="${n2(ETH.x - 8)}" y="${n2(ETH.y - 8)}" width="16" height="14" rx="0.6" fill="#111"/><rect x="${n2(ETH.x - 3)}" y="${n2(ETH.y + 6)}" width="6" height="3" fill="#111"/>
  ${lbl(ETH.x, Y(23.5), 'Ethernet', 'middle')}
  ${ledLabel(X(26), Y(10), 'MODE', 'g')}${ledLabel(X(26), Y(13), 'PWR', 'g')}${ledLabel(X(26), Y(16), 'T.RUN', 'g')}${ledLabel(X(26), Y(19), 'SYS', 'g')}${ledLabel(X(26), Y(22), 'STOP', 'off')}${ledLabel(X(26), Y(25), 'ENB', 'off')}
  <rect x="${n2(TP.x - 6)}" y="${n2(TP.y - 15)}" width="12" height="30" rx="1" fill="url(#rcblack-{{uid}})"/><rect x="${n2(TP.x - 3)}" y="${n2(TP.y - 11)}" width="6" height="22" rx="0.8" fill="#0b0b0c"/>
  ${lbl(X(13.5), Y(28.5), 'TP')}
  ${slideSwitch(X(32), Y(31), 8, 4)}${lbl(X(32), Y(28), 'MANU / AUTO', 'middle', 1.7)}
  <rect x="${X(28)}" y="${Y(35)}" width="${X(8)}" height="${X(4)}" rx="0.5" fill="#d9381e"/>${lbl(X(37), Y(38), 'SYS.SW')}
  <rect x="${n2(USB.x - 4)}" y="${n2(USB.y - 2.5)}" width="8" height="5" rx="0.6" fill="#8d9196" stroke="#333" stroke-width="0.3"/><rect x="${n2(USB.x - 2.6)}" y="${n2(USB.y - 1.2)}" width="5.2" height="2.4" fill="#222"/>${lbl(USB.x, Y(45.5), 'USB', 'middle')}
  ${slot}
  ${lbl(X(29.5), Y(53.5), 'STOP', 'middle')}${lbl(X(34.5), Y(53.5), 'ENB', 'middle')}
  ${sysL.svg}${sysR.svg}
  ${mp.svg}${cp.svg}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const io = ioOf(p);
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const sys = (id: string, pos: { x: number; y: number; side: 'left' | 'right' }, rest: Omit<TerminalDef, 'id' | 'x' | 'y' | 'side' | 'label'>): TerminalDef => ({ id, label: `${id}（${PINNO[id]}）`, ...at(pos), ...rest });
  const ts: TerminalDef[] = [
    { id: 'CP', label: 'CP（+24V）', note: '制御電源 +24V 入力（連結した全ユニットの制御電源・ブレーキ電源）', ...at(cp.pos.CP), role: 'input', accepts: DC24_PLUS },
    { id: 'GND0', label: '0V', note: '制御電源 0V', ...at(cp.pos.GND0), role: 'input', accepts: DC24_MINUS },
    { id: 'FG', label: 'FG', note: 'フレームグラウンド', ...at(cp.pos.FG), role: 'ground' },
    { id: 'MP+', label: '24V（MP）', note: 'モーター電源 +24V 入力（連結した 24V ドライバーユニット・エレシリンダーへ。最大 30A）', ...at(mp.pos['MP+']), role: 'input', accepts: DC24_PLUS },
    { id: 'MP0V', label: '0V（MP）', note: 'モーター電源 0V', ...at(mp.pos.MP0V), role: 'input', accepts: DC24_MINUS },
    sys('STOPOUT', sysL.pos.STOPOUT, { note: '停止用 24V 出力', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } }),
    sys('STOPIN', sysL.pos.STOPIN, { note: '停止入力（STOPOUT から停止接点 1・2 と非常停止スイッチを通して戻す）', role: 'signal', function: 'safety-input' }),
    sys('STOPS1+', sysL.pos['STOPS1+'], { note: '停止接点出力 1（ティーチングボックスの停止スイッチ）', role: 'signal', optional: true }),
    sys('STOPS1-', sysL.pos['STOPS1-'], { note: '停止接点出力 1', role: 'signal', optional: true }),
    sys('STOPS2+', sysL.pos['STOPS2+'], { note: '停止接点出力 2', role: 'signal', optional: true }),
    sys('STOPS2-', sysL.pos['STOPS2-'], { note: '停止接点出力 2', role: 'signal', optional: true }),
    sys('ENBOUT', sysR.pos.ENBOUT, { note: 'イネーブル用 24V 出力', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } }),
    sys('ENBIN', sysR.pos.ENBIN, { note: 'イネーブル入力（ENBOUT からイネーブル接点 1・2 とセーフティーゲートなどを通して戻す）', role: 'signal', function: 'safety-input' }),
    sys('ENBS1+', sysR.pos['ENBS1+'], { note: 'イネーブル接点出力 1', role: 'signal', optional: true }),
    sys('ENBS1-', sysR.pos['ENBS1-'], { note: 'イネーブル接点出力 1', role: 'signal', optional: true }),
    sys('ENBS2+', sysR.pos['ENBS2+'], { note: 'イネーブル接点出力 2', role: 'signal', optional: true }),
    sys('ENBS2-', sysR.pos['ENBS2-'], { note: 'イネーブル接点出力 2', role: 'signal', optional: true }),
    sys('PS24SD+', sysL.pos['PS24SD+'], { note: 'PSA-24 との RS-485 通信 +', role: 'signal', optional: true }),
    sys('PS24SD-', sysR.pos['PS24SD-'], { note: 'PSA-24 との RS-485 通信 −', role: 'signal', optional: true }),
    sys('NC', sysL.pos.NC, { note: '未接続', role: 'signal', optional: true }),
    sys('GND', sysR.pos.GND, { note: 'シグナルグラウンド', role: 'signal', optional: true }),
    { id: 'ETH', label: 'Ethernet（RJ-45）', note: '内蔵の Ethernet ポート', x: ETH.x, y: ETH.y, side: 'right', role: 'connector', connector: rj45Side(['ethernet']), optional: true },
    { id: 'TP', label: 'TP（ティーチング）', note: 'ティーチングボックス・パソコンの接続用（HDR-EC26）。未接続の場合は停止・ディセーブルになるため、使わないときはダミープラグ DP-4S を差す', x: TP.x, y: TP.y, side: 'left', role: 'connector', connector: { kind: 'IAI-SEL-TP26', pins: 0, width: 30, length: 12, facing: 'front', protocols: ['iai-sel-sio'] }, optional: true },
    { id: 'USB', label: 'USB（Mini-B）', note: 'パソコンのティーチングソフト用', x: USB.x, y: USB.y, side: 'right', role: 'connector', connector: { kind: 'USB-MINIB', pins: 0, width: 10, length: 10, facing: 'front', protocols: ['usb'] }, optional: true },
  ];
  if (io === 'NP' || io === 'PN') {
    ts.push({ id: 'PIO', label: 'I/O スロット（PIO 40極 HIF6）', note: '入力ポート 000〜015・出力ポート 300〜315。PIO ケーブル CB-PAC-PIO でつなぐ', x: PIO.x, y: PIO.y, side: 'left', role: 'connector', connector: hif6Connector(40), optional: true });
  } else if (io !== 'E') {
    ts.push(...fieldbusBlock(io, SLOT, 'left', '#3a3c40').terminals.map((t) => (t.connector?.protocols?.includes('ethernet-ip') ? { ...t, connector: { ...t.connector, protocols: ['ethernet-ip', 'ethernet'] } } : t)));
  }
  return ts;
};

const pioPts = () => selPio40('PIO', 0, 300);
const pins = (p: ParamValues): PinDef[] => (ioOf(p) === 'NP' || ioOf(p) === 'PN' ? pioPins(pioPts(), ioOf(p) === 'PN' ? 'pnp' : 'npn') : []);
const links = (p: ParamValues): InternalLink[] => [
  // ティーチングコネクターを通るティーチングボックスの停止・イネーブル接点（TB またはダミープラグ DP-4S で閉）。Conneko では機器の外のもので開く b 接点（safetyContact）として扱い、安全入力のループの接点に数える
  { from: 'STOPS1+', to: 'STOPS1-', switch: 'NC', safetyContact: true },
  { from: 'STOPS2+', to: 'STOPS2-', switch: 'NC', safetyContact: true },
  { from: 'ENBS1+', to: 'ENBS1-', switch: 'NC', safetyContact: true },
  { from: 'ENBS2+', to: 'ENBS2-', switch: 'NC', safetyContact: true },
  ...(ioOf(p) === 'NP' || ioOf(p) === 'PN' ? pioLinks(pioPts(), ioOf(p) === 'PN' ? 'pnp' : 'npn', 0.05) : []),
];

const def: DeviceDefinition = {
  type: 'iai.rsel',
  name: 'R-unit プログラムコントローラー（SEL ユニット）',
  model: 'RSEL-G',
  maker: 'IAI',
  category: 'plc',
  description:
    'IAI の R-unit のプログラムコントローラー RSEL（SEL ユニット、安全カテゴリー対応タイプ G）。右に 24V ドライバーユニット（RCON-PC/AC/DC）・200V ドライバーユニット・EC 接続ユニット・PIO ユニットを連結し、SEL 言語のプログラムで動かす（PLC なしで運転できる）。' +
    '制御電源コネクター: CP に +24V、0V、FG。モーター電源コネクター: 24V・0V（24V ドライバーユニット・エレシリンダー用、最大 30A）。' +
    'システム I/O: STOPOUT（内蔵 24V）→ 停止接点 1・2（ティーチングボックス）→ 非常停止スイッチ → STOPIN、ENBOUT → イネーブル接点 1・2 → セーフティーゲートなど → ENBIN（出荷時は短絡線で直結）。ティーチングコネクターを使わないときはダミープラグ DP-4S を差す。' +
    'I/O スロット: PIO（NPN / PNP、入力ポート 000〜015・出力ポート 300〜315、40 極 HIF6）またはフィールドネットワーク（CC-Link・CC-Link IE Field・DeviceNet・EtherCAT・EtherNet/IP・PROFIBUS-DP・PROFINET IO）。内蔵 Ethernet。',
  labelPrefix: 'RSEL',
  width: W,
  height: RCON_H,
  svg,
  terminals,
  pins,
  links,
  safetyChannels: [stopLoop('STOP', '停止（STOPOUT → STOPIN）', 'STOPIN'), stopLoop('ENB', 'イネーブル（ENBOUT → ENBIN）', 'ENBIN')],
  params: [
    { key: 'io', label: 'I/O 種類（I/O スロット）', options: IO_TYPES.map((t) => ({ value: t, label: t === 'E' ? 'E: 未使用' : IO_TYPE_LABELS[t] })), default: 'NP' },
    {
      key: 'cpLoad',
      label: '制御電源の消費（CP）',
      unit: 'A',
      options: [{ value: 1, label: 'SEL ユニット（約 1.0A）' }],
      default: 1,
    },
  ],
  bus: { kind: RCON_BUS, host: {}, supply: { CP: 9, MP: 30 }, load: { CP: { param: 'cpLoad' } } },
};

export default def;
