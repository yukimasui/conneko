import { fieldbusBlock, IO_TYPE_LABELS, type IoType } from '../iai/fieldbus';
import {
  DC24_MINUS,
  DC24_PLUS,
  dshellV,
  dsub9V,
  groundMark,
  hif6Connector,
  hif6HeaderV,
  iaiDefs,
  led,
  milConnectorSide,
  milHeaderV,
  MM,
  n2,
  plugV,
  rj45Side,
  rj45V,
  screw,
  sevenSeg,
  slideSwitch,
  stopLoop,
  text,
} from '../iai/parts';
import { pioLinks, pioPins, selPio40, xselPio50 } from '../iai/pio';
import type { AcceptSpec, DeviceDefinition, InternalLink, ParamValues, PinDef, SafetyChannelGroup, TerminalDef } from '../types';

/**
 * IAI プログラムコントローラー XSEL2-TS / TSX（200V サーボ、単軸・直交用 / スカラ用の小筐体。1〜4 軸）。
 *
 * 出典: IAI 総合カタログ CJ9005「XSEL2」（型式項目・外観寸法・各部名称）、取扱説明書 MJ0478「XSEL2」
 *       （1.4 各部の名称と機能、3.4 電源回路の配線、3.5.3 システム I/O コネクターの割付けと配線、3.6 ドライバー停止コネクター）。
 *
 * 外観: 小筐体（TS/TSX）W222 × H195mm、奥行 125.3mm（大筐体 TL/TLX は W302mm。図は小筐体で描く）。黒っぽい正面パネルが
 * 電源部・ドライバーモジュール 2 枚・CPU 部に分かれる。電源部に 7 セグメント表示・ブレーキ電源・回生抵抗・モーター電源・制御電源・FG、
 * ドライバーモジュールに軸ごとのエンコーダー・モーターコネクターとブレーキ解除スイッチ、CPU 部に I/O スロット 1・2、Ethernet、USB、
 * システム I/O（2 列 × 12）、ティーチング、ドライバー停止、汎用 SIO。
 *
 * 制御電源入力: CP_3 L・CP_2 N（AC100〜230V）、CP_1 PE。モーター電源入力: MP_4 R・MP_3 S・MP_2 T・MP_1 PE（三相 AC200V。単相は L・N・NC）。
 * ブレーキ電源: +24V・0V（DC24V、1 軸あたり約 0.4A）。
 * システム I/O（24 極）: 1 EMG2 line+・2 EMG2 line−・3 EMG1 line+・4 EMG1 line−（ティーチングボックスの非常停止接点 2 系統）、
 *   5 EMGin In+・6 EMGin In−（非常停止検出入力）、7 EMGout 0V・8 EMGout +24V（同 24V 出力）、9 DETIN/AUTO1IN・10 DETOUT/AUTO1OUT、
 *   11 SHDWN Out+・12 SHDWN Out−（外部リレー駆動遮断の接点出力）、13〜16 ENB2・ENB1（イネーブル接点 2 系統）、17 ENBin In+、
 *   18・19 未接続、20 ENBout +24V、21 AUTO2IN・22 AUTO2OUT、23 RDY Out+・24 RDY Out−（レディー接点出力）。
 * ドライバー停止コネクター（TE 2294417-1）: SCON-CB の安全機能用 I/O と同じピン（/SRI1±・/SRI2±・EDM±）。使わない場合はダミープラグ DP-6。
 * I/O スロット: 1 に NP/PN（PIO 16/16、40 極 HIF6）・CC-Link・DeviceNet・PROFIBUS-DP、2 に NP/PN・CC-Link IE Field・EtherCAT・EtherNet/IP・PROFINET IO。
 *   XSEL 互換の 48 点 PIO ボード（N1/P1/N2/P2、50 極 MIL）はスロット 1・2 を占有する。
 */

const W = 222 * MM;
const H = 195 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

type Slot1 = 'E' | 'NP' | 'PN' | 'CC' | 'DV' | 'PR' | 'N1' | 'N2' | 'P1' | 'P2';
type Slot2 = 'E' | 'NP' | 'PN' | 'CIE' | 'EC' | 'EP' | 'PRT';
const SLOT1: Slot1[] = ['E', 'NP', 'PN', 'CC', 'DV', 'PR', 'N1', 'N2', 'P1', 'P2'];
const SLOT2: Slot2[] = ['E', 'NP', 'PN', 'CIE', 'EC', 'EP', 'PRT'];
const s1Of = (p: ParamValues) => String(p.slot1 ?? 'NP') as Slot1;
const s2Of = (p: ParamValues) => (is48(s1Of(p)) ? 'E' : (String(p.slot2 ?? 'E') as Slot2));
const is48 = (s: string) => s === 'N1' || s === 'N2' || s === 'P1' || s === 'P2';
const isPio16 = (s: string) => s === 'NP' || s === 'PN';
const axesOf = (p: ParamValues) => Math.max(1, Math.min(4, Number(p.axes ?? 2) || 2));
const three = (p: ParamValues) => Number(p.phase ?? 3) === 3;

/** システム I/O（左 1〜12、右 13〜24） */
const SYS: { pin: number; id: string; label: string; note: string }[] = [
  { pin: 1, id: 'EMG2+', label: 'EMG2 line+', note: 'ティーチングボックスの非常停止接点 系統 2（+側）' },
  { pin: 2, id: 'EMG2-', label: 'EMG2 line-', note: 'ティーチングボックスの非常停止接点 系統 2（−側）' },
  { pin: 3, id: 'EMG1+', label: 'EMG1 line+', note: 'ティーチングボックスの非常停止接点 系統 1（+側）' },
  { pin: 4, id: 'EMG1-', label: 'EMG1 line-', note: 'ティーチングボックスの非常停止接点 系統 1（−側）' },
  { pin: 5, id: 'EMGIN+', label: 'EMGin In+', note: '非常停止検出入力（+側。OFF で減速停止・サーボ OFF・駆動源遮断）' },
  { pin: 6, id: 'EMGIN-', label: 'EMGin In-', note: '非常停止検出入力（−側。EMGout 0V へ戻す）' },
  { pin: 7, id: 'EMGOUT0V', label: 'EMGout 0V', note: '非常停止検出入力用電源 0V' },
  { pin: 8, id: 'EMGOUT', label: 'EMGout +24V', note: '非常停止検出入力用 24V 電源出力' },
  { pin: 9, id: 'DETIN', label: 'DETIN/AUTO1IN', note: '外部接点溶着検出入力 / 外部モード切替えスイッチ 1 入力（使わない場合は 9-10 を短絡）' },
  { pin: 10, id: 'DETOUT', label: 'DETOUT/AUTO1OUT', note: '外部接点異常入力用・外部モード切替えスイッチ 1 用の 24V 電源出力' },
  { pin: 11, id: 'SHDWN+', label: 'SHDWN Out+', note: '外部リレー駆動遮断の接点出力（無電圧接点。モーター電源の供給を許可しているとき閉）' },
  { pin: 12, id: 'SHDWN-', label: 'SHDWN Out-', note: '外部リレー駆動遮断の接点出力（−側）' },
  { pin: 13, id: 'ENB2+', label: 'ENB2 line+', note: 'ティーチングボックスのイネーブル接点 系統 2（+側）' },
  { pin: 14, id: 'ENB2-', label: 'ENB2 line-', note: 'ティーチングボックスのイネーブル接点 系統 2（−側）' },
  { pin: 15, id: 'ENB1+', label: 'ENB1 line+', note: 'ティーチングボックスのイネーブル接点 系統 1（+側）' },
  { pin: 16, id: 'ENB1-', label: 'ENB1 line-', note: 'ティーチングボックスのイネーブル接点 系統 1（−側）' },
  { pin: 17, id: 'ENBIN', label: 'ENBin In+', note: 'イネーブル検出入力（ENBout からセーフティーゲート・イネーブルスイッチを通して戻す）' },
  { pin: 18, id: 'NC18', label: '−', note: '何も接続しない' },
  { pin: 19, id: 'NC19', label: '−', note: '何も接続しない' },
  { pin: 20, id: 'ENBOUT', label: 'ENBout +24V', note: 'イネーブル検出入力用 24V 電源出力' },
  { pin: 21, id: 'AUTO2IN', label: 'AUTO2IN', note: '外部モード切替えスイッチ 2 入力（使わない場合は 21-22 を短絡）' },
  { pin: 22, id: 'AUTO2OUT', label: 'AUTO2OUT', note: '外部モード切替えスイッチ 2 用の 24V 電源出力' },
  { pin: 23, id: 'RDY+', label: 'RDY Out+', note: 'レディー接点出力（無電圧接点。正常動作中に閉）' },
  { pin: 24, id: 'RDY-', label: 'RDY Out-', note: 'レディー接点出力（−側）' },
];
const sysL = plugV({ x: X(189), y: Y(110), ids: SYS.slice(0, 12).map((s) => s.id), pitch: 3.5 * MM, w: 5.5 * MM, wire: 'left' });
const sysR = plugV({ x: X(195), y: Y(110), ids: SYS.slice(12).map((s) => s.id), pitch: 3.5 * MM, w: 5.5 * MM, wire: 'right' });
const SYSPOS = { ...sysL.pos, ...sysR.pos };

const cp = plugV({ x: X(24), y: Y(150), ids: ['L', 'N', 'CPE'], pitch: 7.62 * MM, w: 8 * MM, wire: 'right', labels: { L: 'L', N: 'N', CPE: 'PE' }, labelColor: '#d8dadd', labelSize: 2.6, color: 'black' });
const mp = plugV({ x: X(5), y: Y(129), ids: ['R', 'S', 'T', 'MPE'], pitch: 7.62 * MM, w: 8 * MM, wire: 'left', labels: { R: 'R', S: 'S', T: 'T', MPE: 'PE' }, labelColor: '#d8dadd', labelSize: 2.6, color: 'black' });
const bk = plugV({ x: X(27), y: Y(98), ids: ['BK+', 'BK-'], pitch: 3.5 * MM, w: 5 * MM, wire: 'right', labels: { 'BK+': '+', 'BK-': '−' }, labelColor: '#d8dadd', labelSize: 3 });
const FG = { x: X(9), y: Y(186) };
const RB = { x: X(30), y: Y(85) };
const PG = (a: number) => ({ x: X(36 + 75 * Math.floor(a / 2) + 22 + 34 * (a % 2)), y: Y(66) });
const MOT = (a: number) => ({ x: X(36 + 75 * Math.floor(a / 2) + 22 + 34 * (a % 2)), y: Y(140) });
const SLOT1_AREA = { x: X(188), y: Y(32), w: 15 * MM, h: 70 * MM };
const SLOT2_AREA = { x: X(204), y: Y(32), w: 15 * MM, h: 70 * MM };
const PIO1 = { x: X(195.5), y: Y(66) };
const PIO2 = { x: X(211.5), y: Y(66) };
const ETH = { x: X(211), y: Y(18) };
const TP = { x: X(213), y: Y(125) };
const STOP = { x: X(213), y: Y(150) };
const SIO = { x: X(213), y: Y(172) };
const USB = { x: X(198), y: Y(22) };

const acAccepts = (p: ParamValues): AcceptSpec =>
  Number(p.phase ?? 3) === 100 ? { system: 'AC', minVoltage: 90, maxVoltage: 126.5 } : { system: 'AC', minVoltage: 180, maxVoltage: 253 };

const svg = (p: ParamValues) => {
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.4) => text(x, y, t, size, '#d8dadd', anchor);
  const axes = axesOf(p);
  const s1 = s1Of(p);
  const s2 = s2Of(p);
  const slot = (s: string, area: typeof SLOT1_AREA, pio: { x: number; y: number }, name: string) => {
    if (s === 'E') return `<rect x="${area.x}" y="${area.y}" width="${n2(area.w)}" height="${n2(area.h)}" rx="1" fill="#2d3036" stroke="#111" stroke-width="0.5"/>${lbl(n2(area.x + area.w / 2), n2(area.y + area.h / 2), name, 'middle', 2)}`;
    if (isPio16(s)) return `${hif6HeaderV(pio.x, pio.y, 40)}${lbl(pio.x, n2(area.y - 1), `${name} ${s}`, 'middle', 2)}`;
    return fieldbusBlock(s as IoType, area, 'right', '#d8dadd', true).svg;
  };
  return `
  ${iaiDefs(['#2a2f38', '#1b1f26'])}
  <rect x="0.5" y="${Y(2)}" width="${n2(W - 1)}" height="${Y(192)}" rx="3" fill="#cfd2d5" stroke="#6f7478" stroke-width="0.8"/>
  ${[18, 111, 204].map((x) => `<circle cx="${X(x)}" cy="${Y(5)}" r="3" fill="#fff" stroke="#6f7478" stroke-width="0.5"/>`).join('')}
  <rect x="${X(1.5)}" y="${Y(9)}" width="${X(34)}" height="${Y(183)}" rx="1.5" fill="url(#iaipanel-{{uid}})"/>
  <rect x="${X(36.5)}" y="${Y(9)}" width="${X(74)}" height="${Y(183)}" rx="1.5" fill="url(#iaipanel-{{uid}})"/>
  <rect x="${X(111.5)}" y="${Y(9)}" width="${X(74)}" height="${Y(183)}" rx="1.5" fill="url(#iaipanel-{{uid}})"/>
  <rect x="${X(186.5)}" y="${Y(9)}" width="${X(34)}" height="${Y(183)}" rx="1.5" fill="url(#iaipanel-{{uid}})"/>
  <!-- 電源部 -->
  ${sevenSeg(X(4), Y(13), 28 * MM, 11 * MM)}
  ${['RDY', 'ALM', 'EMG', 'PSE'].map((nm, i) => `${led(X(7 + i * 7), Y(28), i === 0 ? 'g' : 'off', 3, 2)}${lbl(X(7 + i * 7), Y(31.5), nm, 'middle', 1.8)}`).join('')}
  ${text(X(5), Y(44), 'IAI', 9, '#d2232a', 'start', 'bold', ' font-style="italic"')}
  ${text(X(5), Y(50), '<tspan font-style="italic" font-size="5">X</tspan>-SEL CONTROLLER', 2.6, '#d8dadd', 'start', 'bold')}
  <rect x="${X(25)}" y="${Y(58)}" width="${X(8)}" height="${X(8)}" rx="0.6" fill="#111"/>${lbl(X(24), Y(63), 'BK SW', 'end', 2)}
  <rect x="${X(25.5)}" y="${Y(79)}" width="${X(7)}" height="${X(12)}" rx="0.6" fill="url(#iaigreen-{{uid}})"/>${lbl(X(24.5), Y(86), 'RB', 'end')}
  ${bk.svg}${lbl(X(26), Y(100.5), 'BK PWR', 'end', 2.2)}
  ${mp.svg}${lbl(X(13), Y(127), three(p) ? 'MP 3φ' : 'MP 1φ', 'start', 2.2)}
  ${cp.svg}${lbl(X(23), Y(148), 'CP', 'start', 2.2)}
  ${screw(FG.x, FG.y, 3.2)}${groundMark(X(15), Y(186), '#d8dadd')}
  <!-- ドライバーモジュール -->
  ${Array.from({ length: 4 }, (_, a) => {
    const pg = PG(a);
    const m = MOT(a);
    if (a >= axes) return `<rect x="${n2(pg.x - 9)}" y="${n2(pg.y - 24)}" width="18" height="${n2(m.y - pg.y + 64)}" rx="1" fill="#22262d" stroke="#111" stroke-width="0.4"/>`;
    return `${lbl(pg.x, Y(18), `AXIS ${a + 1}`, 'middle', 2.2)}${slideSwitch(pg.x, Y(26), 8, 4.4)}${lbl(pg.x, Y(32), 'RLS / NOM', 'middle', 1.8)}
  ${dshellV(pg.x, pg.y, 48, 16)}${lbl(pg.x, Y(83), `PG${a + 1}`, 'middle')}
  <rect x="${n2(m.x - 10)}" y="${n2(m.y - 14)}" width="20" height="28" rx="1" fill="#111" stroke="#000" stroke-width="0.5"/>
  ${[0, 1].map((r) => [0, 1].map((c) => `<rect x="${n2(m.x - 7 + c * 9)}" y="${n2(m.y - 10 + r * 12)}" width="5" height="7" fill="#e3c070"/>`).join('')).join('')}
  ${lbl(m.x, Y(150), `M${a + 1}`, 'middle')}`;
  }).join('')}
  <!-- CPU 部 -->
  ${is48(s1) ? `${milHeaderV(X(203), Y(66), 50)}${lbl(X(203), Y(29), `I/O ${s1}`, 'middle', 2)}` : `${slot(s1, SLOT1_AREA, PIO1, 'SLOT1')}${slot(s2, SLOT2_AREA, PIO2, 'SLOT2')}`}
  ${rj45V(ETH.x, ETH.y)}
  <rect x="${n2(USB.x - 4)}" y="${n2(USB.y - 3)}" width="8" height="6" rx="0.6" fill="#8d9196"/><rect x="${n2(USB.x - 2.6)}" y="${n2(USB.y - 1.4)}" width="5.2" height="2.8" fill="#222"/>${lbl(USB.x, Y(26.5), 'USB', 'middle', 2)}
  ${['PWR', 'STS', 'ML', 'NL'].map((nm, i) => `${led(X(190), Y(13 + i * 3), i < 2 ? 'g' : 'off', 2.4, 1.8)}${lbl(X(192), Y(13.7 + i * 3), nm, 'start', 1.8)}`).join('')}
  ${sysL.svg}${sysR.svg}${lbl(X(195), Y(108), 'SYSTEM I/O', 'middle', 2)}
  ${dshellV(TP.x, TP.y, 34, 13)}${lbl(TP.x, Y(106.5), 'TP', 'middle', 2)}
  <rect x="${n2(STOP.x - 7)}" y="${n2(STOP.y - 7)}" width="14" height="14" rx="1" fill="url(#iaiblack-{{uid}})"/><rect x="${n2(STOP.x - 4.5)}" y="${n2(STOP.y - 4.5)}" width="9" height="9" rx="0.6" fill="#0b0b0c" stroke="#666" stroke-width="0.4"/>${lbl(STOP.x, Y(158), 'DRV STOP', 'middle', 1.8)}
  ${dsub9V(SIO.x, SIO.y)}${lbl(SIO.x, Y(182), 'SIO', 'middle', 2)}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const ac = acAccepts(p);
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const cpAc: AcceptSpec = { system: 'AC', minVoltage: 90, maxVoltage: 253 };
  const ts: TerminalDef[] = [
    { id: 'L', label: 'L（CP）', note: '制御電源 AC100〜230V（L 相）', ...at(cp.pos.L), role: 'input', accepts: cpAc },
    { id: 'N', label: 'N（CP）', note: '制御電源 AC100〜230V（N 相）', ...at(cp.pos.N), role: 'input', accepts: cpAc },
    { id: 'CPE', label: 'PE（CP）', note: '保護接地', ...at(cp.pos.CPE), role: 'ground' },
    { id: 'R', label: three(p) ? 'R（MP）' : 'L（MP）', note: three(p) ? 'モーター電源 三相 AC200V（R 相）' : 'モーター電源 単相（L 相）', ...at(mp.pos.R), role: 'input', accepts: ac },
    { id: 'S', label: three(p) ? 'S（MP）' : 'N（MP）', note: three(p) ? 'モーター電源 三相 AC200V（S 相）' : 'モーター電源 単相（N 相）', ...at(mp.pos.S), role: 'input', accepts: ac },
    three(p)
      ? { id: 'T', label: 'T（MP）', note: 'モーター電源 三相 AC200V（T 相）', ...at(mp.pos.T), role: 'input', accepts: ac }
      : { id: 'T', label: 'NC（MP）', note: '単相仕様では接続しない', ...at(mp.pos.T), role: 'signal', optional: true },
    { id: 'MPE', label: 'PE（MP）', note: '保護接地', ...at(mp.pos.MPE), role: 'ground' },
    { id: 'FG', label: 'FG', note: 'FG（フレームグラウンド）接続端子', x: FG.x, y: FG.y, side: 'left', role: 'ground', optional: true },
    { id: 'BK+', label: 'BK PWR +', note: 'ブレーキ電源 DC24V（1 軸あたり約 0.4A。ブレーキ付きのとき）', ...at(bk.pos['BK+']), role: 'input', accepts: DC24_PLUS, optional: true },
    { id: 'BK-', label: 'BK PWR −', note: 'ブレーキ電源 0V', ...at(bk.pos['BK-']), role: 'input', accepts: DC24_MINUS, optional: true },
    { id: 'RB', label: 'RB（外部回生抵抗）', note: '外部回生抵抗ユニットの接続', x: RB.x, y: RB.y, side: 'right', role: 'connector', connector: { kind: 'IAI-RB', pins: 0, width: 24, length: 14, facing: 'front' }, optional: true },
    ...SYS.map((s): TerminalDef => {
      const base = { id: s.id, label: `${s.label}（${s.pin}）`, note: s.note, ...at(SYSPOS[s.id]) };
      if (s.id === 'EMGOUT' || s.id === 'ENBOUT') return { ...base, role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } };
      if (s.id === 'DETOUT' || s.id === 'AUTO2OUT') return { ...base, role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' }, optional: true };
      if (s.id === 'EMGIN+' || s.id === 'ENBIN') return { ...base, role: 'signal', function: 'safety-input' };
      if (s.id === 'DETIN') return { ...base, role: 'signal', function: 'edm', optional: true };
      return { ...base, role: 'signal', optional: true };
    }),
    { id: 'ETH', label: 'Ethernet（RJ-45）', note: '内蔵の Ethernet ポート', x: ETH.x, y: ETH.y, side: 'right', role: 'connector', connector: rj45Side(['ethernet']), optional: true },
    { id: 'USB', label: 'USB（Mini-B）', note: 'パソコンのティーチングソフト用', x: USB.x, y: USB.y, side: 'top', role: 'connector', connector: { kind: 'USB-MINIB', pins: 0, width: 10, length: 10, facing: 'front', protocols: ['usb'] }, optional: true },
    { id: 'TP', label: 'TP（ティーチング）', note: 'ティーチングボックス・パソコンの接続用。AUTO で使う場合はダミープラグを差す', x: TP.x, y: TP.y, side: 'right', role: 'connector', connector: { kind: 'IAI-SEL-TP26', pins: 0, width: 34, length: 13, facing: 'front', protocols: ['iai-sel-sio'] }, optional: true },
    { id: 'STO', label: 'ドライバー停止コネクター', note: 'TE 2294417-1（8 極）。/SRI1・/SRI2 の 2 チャンネルでドライバーの出力を停止する。使わない場合はダミープラグ DP-6', x: STOP.x, y: STOP.y, side: 'right', role: 'connector', connector: { kind: 'IAI-STO8', pins: 8, width: 14, length: 14, facing: 'front' }, optional: true },
    { id: 'SIO', label: '汎用 SIO（D-sub 9 ピン）', note: '汎用の RS-232C / RS-485（SIO 切替えスイッチで選択）', x: SIO.x, y: SIO.y, side: 'right', role: 'connector', connector: { kind: 'DSUB9', pins: 0, width: 32, length: 14, facing: 'front', protocols: ['rs-232c', 'rs-485'] }, optional: true },
  ];
  for (let a = 0; a < axesOf(p); a++) {
    const pg = PG(a);
    const m = MOT(a);
    ts.push(
      { id: `PG${a + 1}`, label: `PG${a + 1}（${a + 1} 軸目 エンコーダー）`, note: 'アクチュエーターのエンコーダーケーブル', x: pg.x, y: pg.y, side: 'top', role: 'connector', connector: { kind: 'IAI-XSEL-PG', pins: 0, width: 16, length: 48 }, optional: true },
      { id: `M${a + 1}`, label: `M${a + 1}（${a + 1} 軸目 モーター）`, note: 'アクチュエーターのモーターケーブル', x: m.x, y: n2(m.y + 14), side: 'bottom', role: 'connector', connector: { kind: 'IAI-XSEL2-MOT', pins: 0, width: 20, length: 28 }, optional: true },
    );
  }
  const s1 = s1Of(p);
  const s2 = s2Of(p);
  if (is48(s1)) {
    ts.push({ id: 'I/O1', label: `I/O（PIO ${s1}、MIL 50 極）`, note: 'XSEL 互換の 48 点 PIO ボード（スロット 1・2 を占有）。CB-X-PIO または MIL 50 極の変換端子台でつなぐ', x: X(203), y: Y(66), side: 'right', role: 'connector', connector: milConnectorSide(50), optional: true });
  } else {
    if (isPio16(s1)) ts.push({ id: 'I/O1', label: `スロット 1（PIO ${s1}、40 極 HIF6）`, note: '入力ポート 000〜015・出力ポート 300〜315。CB-PAC-PIO でつなぐ', x: PIO1.x, y: PIO1.y, side: 'left', role: 'connector', connector: hif6Connector(40), optional: true });
    else if (s1 !== 'E') ts.push(...fieldbusBlock(s1 as IoType, SLOT1_AREA, 'right', '#d8dadd', true).terminals);
    if (isPio16(s2)) ts.push({ id: 'I/O2', label: `スロット 2（PIO ${s2}、40 極 HIF6）`, note: '入力ポート 016〜031・出力ポート 316〜331。CB-PAC-PIO でつなぐ', x: PIO2.x, y: PIO2.y, side: 'right', role: 'connector', connector: hif6Connector(40), optional: true });
    else if (s2 !== 'E') ts.push(...fieldbusBlock(s2 as IoType, SLOT2_AREA, 'right', '#d8dadd', true).terminals.map((t) => (t.id === 'NET1' ? { ...t, id: 'NET3' } : t.id === 'NET2' ? { ...t, id: 'NET4' } : t)));
  }
  return ts;
};

const pioPoints = (p: ParamValues) => {
  const s1 = s1Of(p);
  const s2 = s2Of(p);
  const sets: { pts: ReturnType<typeof selPio40>; pol: 'npn' | 'pnp'; rated: number }[] = [];
  if (is48(s1)) sets.push({ pts: xselPio50('I/O1', s1.endsWith('2') ? '16/32' : '32/16', 0, 300, true), pol: s1.startsWith('P') ? 'pnp' : 'npn', rated: 0.1 });
  else {
    if (isPio16(s1)) sets.push({ pts: selPio40('I/O1', 0, 300), pol: s1 === 'PN' ? 'pnp' : 'npn', rated: 0.05 });
    if (isPio16(s2)) sets.push({ pts: selPio40('I/O2', 16, 316), pol: s2 === 'PN' ? 'pnp' : 'npn', rated: 0.05 });
  }
  return sets;
};

const stoPins: PinDef[] = [
  { id: 'STO#1', label: 'NC（1）', role: 'signal', optional: true },
  { id: 'STO#2', label: 'NC（2）', role: 'signal', optional: true },
  { id: 'STO#3', label: '/SRI1-（3）', role: 'input', accepts: DC24_MINUS, optional: true, note: '停止入力 1 の −側（0V）' },
  { id: 'STO#4', label: '/SRI1+（4）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 1, note: '停止入力 1（+24V で DRV STOP 解除、開放でモーター電流遮断）' },
  { id: 'STO#5', label: '/SRI2-（5）', role: 'input', accepts: DC24_MINUS, optional: true, note: '停止入力 2 の −側（0V）' },
  { id: 'STO#6', label: '/SRI2+（6）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 2, note: '停止入力 2（+24V で DRV STOP 解除、開放でモーター電流遮断）' },
  { id: 'STO#7', label: 'EDM-（7）', role: 'signal', optional: true, note: '外部機器モニター出力 −側' },
  { id: 'STO#8', label: 'EDM+（8）', role: 'signal', signal: { dir: 'out', kind: 'contact' }, optional: true, note: '外部機器モニター出力 +側' },
];

const pins = (p: ParamValues): PinDef[] => [...stoPins, ...pioPoints(p).flatMap((s) => pioPins(s.pts, s.pol))];

const links = (p: ParamValues): InternalLink[] => [
  // ティーチングボックスの非常停止・イネーブル接点（TB またはダミープラグで閉）。Conneko では常に閉の導通として扱う
  { from: 'EMG1+', to: 'EMG1-' },
  { from: 'EMG2+', to: 'EMG2-' },
  { from: 'ENB1+', to: 'ENB1-' },
  { from: 'ENB2+', to: 'ENB2-' },
  // EMGin の −側と EMGout の 0V は内部で同じ基準（フォトカプラーの入力回路）
  { from: 'SHDWN+', to: 'SHDWN-', switch: 'NO' },
  { from: 'RDY+', to: 'RDY-', switch: 'NO' },
  { from: 'STO#8', to: 'STO#7', switch: 'output', ratedCurrent: 0.1 },
  { from: 'CPE', to: 'MPE' },
  { from: 'CPE', to: 'FG' },
  ...pioPoints(p).flatMap((s) => pioLinks(s.pts, s.pol, s.rated)),
];

const safetyChannels: SafetyChannelGroup[] = [
  stopLoop('EMG', '非常停止（EMGout → EMGin）', 'EMGIN+'),
  stopLoop('ENB', 'イネーブル（ENBout → ENBin）', 'ENBIN'),
  { id: 'DRVSTOP', label: 'ドライバー停止（/SRI1・/SRI2）', kind: 'input', mode: ['nc-nc', 'ossd'], configurable: true, channels: [{ input: 'STO#4' }, { input: 'STO#6' }] },
];

const def: DeviceDefinition = {
  type: 'iai.xsel2',
  name: 'プログラムコントローラー（200V サーボ多軸）',
  model: 'XSEL2-TS',
  maker: 'IAI',
  category: 'plc',
  description:
    'IAI の 200V サーボ用プログラムコントローラー XSEL2（単軸・直交用 TS / スカラ用 TSX の小筐体。図は 1〜4 軸の小筐体、大筐体 TL/TLX は幅 302mm）。SEL 言語でアクチュエーターを動かし、PLC なしでも運転できる。' +
    '制御電源 L・N（AC100〜230V）・PE、モーター電源 R・S・T（三相 AC200V、単相仕様は L・N）・PE、ブレーキ電源 +24V・0V。' +
    'システム I/O: EMGout +24V → EMG1・EMG2（ティーチングボックスの非常停止接点）→ 非常停止スイッチ → EMGin In+（In− は EMGout 0V へ）、ENBout → ENB1・ENB2 → セーフティーゲート → ENBin。' +
    'SHDWN（駆動遮断の接点出力）・DETIN（接点溶着検出）で外部の駆動源遮断回路を組むと安全カテゴリー4 相当にできる。RDY はレディー接点出力。ドライバー停止コネクター（/SRI1・/SRI2・EDM）は使わない場合ダミープラグ DP-6。' +
    'I/O スロット: 1 に PIO（NP/PN 16/16、40 極 HIF6）・CC-Link・DeviceNet・PROFIBUS-DP、2 に PIO・CC-Link IE Field・EtherCAT・EtherNet/IP・PROFINET IO。XSEL 互換 48 点 PIO ボード（N1/N2/P1/P2、50 極 MIL）はスロット 1・2 を占有。内蔵 Ethernet、汎用 SIO（RS-232C / RS-485）。',
  labelPrefix: 'XSEL',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  safetyChannels,
  distinctGroups: [['L', 'N'], ['R', 'S', 'T']],
  params: [
    {
      key: 'model',
      label: 'タイプ',
      options: [
        { value: 'TS', label: 'TS: 単軸・直交用（小筐体）' },
        { value: 'TSX', label: 'TSX: スカラ用（小筐体）' },
      ],
      default: 'TS',
    },
    { key: 'axes', label: '軸数', options: [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} 軸` })), default: 2 },
    {
      key: 'phase',
      label: '電源電圧',
      options: [
        { value: 3, label: '三相 AC200V' },
        { value: 2, label: '単相 AC200V' },
        { value: 100, label: '単相 AC100V' },
      ],
      default: 3,
    },
    {
      key: 'slot1',
      label: 'I/O スロット 1',
      options: SLOT1.map((s) => ({
        value: s,
        label: s === 'E' ? 'E: 未使用' : isPio16(s) ? `${s}: PIO（${s === 'NP' ? 'NPN' : 'PNP'}、16/16）` : is48(s) ? `${s}: 48 点 PIO（${s.startsWith('N') ? 'NPN' : 'PNP'}、${s.endsWith('1') ? '32/16' : '16/32'}。スロット 1・2 を占有）` : IO_TYPE_LABELS[s as IoType],
      })),
      default: 'NP',
    },
    {
      key: 'slot2',
      label: 'I/O スロット 2',
      options: SLOT2.map((s) => ({ value: s, label: s === 'E' ? 'E: 未使用' : isPio16(s) ? `${s}: PIO（${s === 'NP' ? 'NPN' : 'PNP'}、16/16）` : IO_TYPE_LABELS[s as IoType] })),
      default: 'E',
    },
    {
      key: 'loadCurrent',
      label: '入力電流の目安（モーター合計）',
      unit: 'A',
      options: [
        { value: 3, label: '〜400W（約 3A）' },
        { value: 6, label: '〜800W（約 6A）' },
        { value: 12, label: '〜1600W（約 12A）' },
      ],
      default: 6,
    },
  ],
  loadCurrent: { param: 'loadCurrent' },
};

export default def;
