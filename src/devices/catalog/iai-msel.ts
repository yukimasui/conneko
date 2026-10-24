import { fieldbusBlock, IO_TYPE_LABELS, type IoType } from '../iai/fieldbus';
import {
  DC24_PLUS,
  hif6Connector,
  hif6HeaderV,
  iaiDefs,
  iaiLogo,
  led,
  MM,
  mountTab,
  n2,
  plugV,
  screw,
  sevenSeg,
  slideSwitch,
  smallBlackConnector,
  text,
  whiteConnectorV,
  stopLoop,
} from '../iai/parts';
import { pioLinks, pioPins, selPio40, type Polarity } from '../iai/pio';
import type { CommonLimit, DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * IAI プログラムコントローラー MSEL（ロボシリンダー RCP6/RCP5/RCP4/RCP3/RCP2 用、パルスモーター最大 4 軸）。
 *
 * 出典: IAI 総合カタログ CJ9005「MSEL」（機種一覧・型式項目・基本仕様・PIO 信号表・標準 I/O 内部回路・各部名称・外形寸法）、
 *       取扱説明書 MJ0336「MSEL」（2.3 配線方法: AC 電源入力・システム I/O・モーター駆動電源ライン・PIO・SIO）。
 *
 * 外観: 幅 130mm × 高さ 195mm（ねじ固定、取付けタブ込み）、奥行 125mm。深緑の正面パネル。
 * 上に 7 セグメント表示と LED（RDY・ALM・EMG・HPS・CKE）、ブレーキ解除スイッチ（軸ごと）、中央に MPG1〜4（白いモーター・
 * エンコーダーコネクター）、左下に AC 電源（緑 3 極ねじ式）、右側に MODE（MANU/AUTO）・TP（ティーチング）・USB・
 * システム I/O（2 列 × 6 段）・I/O1（標準 PIO 40 極）・I/O2（拡張 PIO またはフィールドバス）、下にモーター駆動電源（MPI/MPO）。
 *
 * AC 電源（MSTB2.5/3-STF-5.08）: 3 N・2 L（単相 AC100〜230V ±10%）、1 PE。電源電流 2.9A（AC100V）/ 1.4A（AC200V）。
 * システム I/O（DFMC1.5/6-ST-3.5、12 極。左列が非常停止、右列がイネーブル）:
 *   12 EMGIN（非常停止検出入力）、11 EMGOUT（非常停止検出用 24V 出力 DC30V 0.5A）、10 EMGS1+・9 EMGS1-、8 EMGS2+・7 EMGS2-
 *   （ティーチングボックスの非常停止接点。PC タイプは TB 未接続時に 1+/1- が短絡）、
 *   6 ENBIN（イネーブル検出入力）、5 ENBOUT（同 24V 出力）、4 ENBS1+・3 ENBS1-、2 ENBS2+・1 ENBS2-。
 *   出荷時は 4-5、3-6、10-11、9-12 間を短絡線で接続（EMGOUT → EMGS1+ → TB → EMGS1- → EMGIN）。
 * モーター駆動電源ライン（FKIC2.5HC/2-ST-5.08）: 1 MPO（内蔵 24V のモーター電源出力）、2 MPI（モーター電源外部入力）。通常は短絡。
 * 標準 I/O（I/O1、HIF6 40 極）: 1A・2A P24、5A〜20A 入力ポート 000〜015、1B〜16B 出力ポート 300〜315（100mA/点、8 点で 400mA）、19B・20B N。
 * 拡張 I/O（I/O2）: PIO（入力 016〜031・出力 316〜331、50mA/点）、または DeviceNet・CC-Link・PROFIBUS-DP・EtherNet/IP・EtherCAT・PROFINET IO。
 */

const W = 130 * MM;
const H = 195 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

const EXT_TYPES: (IoType | 'none')[] = ['none', 'NP', 'PN', 'DV', 'CC', 'PR', 'EP', 'EC', 'PRT'];

const SYS_L = ['EMGIN', 'EMGOUT', 'EMGS1+', 'EMGS1-', 'EMGS2+', 'EMGS2-'];
const SYS_R = ['ENBIN', 'ENBOUT', 'ENBS1+', 'ENBS1-', 'ENBS2+', 'ENBS2-'];
const sysL = plugV({ x: X(102), y: Y(63), ids: SYS_L, pitch: 3.5 * MM, w: 4.5 * MM, wire: 'left' });
const sysR = plugV({ x: X(106.5), y: Y(63), ids: SYS_R, pitch: 3.5 * MM, w: 4.5 * MM, wire: 'right' });
const pwr = plugV({ x: X(19), y: Y(138), ids: ['N', 'L', 'PE'], pitch: 6 * MM, w: 9 * MM, wire: 'left', labels: { N: 'N', L: 'L', PE: 'PE' }, labelSize: 3.2 });
const mp = plugV({ x: X(84), y: Y(170), ids: ['MPI', 'MPO'], pitch: 5.08 * MM, w: 6 * MM, wire: 'right' });
const IO1 = { x: X(110), y: Y(111) };
const IO2_AREA = { x: X(92), y: Y(138), w: 22 * MM, h: 46 * MM };
const TP = { x: X(112), y: Y(34.5) };
const USB = { x: X(106.5), y: Y(53.5) };
const MPG = (i: number) => ({ x: X(74), y: Y(33 + i * 29.3), w: 12 * MM, h: 25 * MM });

const axesOf = (p: ParamValues) => Math.max(1, Math.min(4, Number(p.axes ?? 4) || 4));
const extOf = (p: ParamValues) => String(p.ext ?? 'none') as IoType | 'none';
const stdPolarity = (p: ParamValues): Polarity => (String(p.io ?? 'NP') === 'PN' ? 'pnp' : 'npn');
const isG = (p: ParamValues) => String(p.model ?? 'PC').includes('G');
/** 高推力モーター（56SP/60P/86P）対応タイプ（PCF / PGF） */
const isF = (p: ParamValues) => String(p.model ?? 'PC').endsWith('F');

const svg = (p: ParamValues) => {
  const ext = extOf(p);
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.6) => text(x, y, t, size, '#e9eef0', anchor);
  const extPio = ext === 'NP' || ext === 'PN';
  const fb = ext !== 'none' && !extPio ? fieldbusBlock(ext, IO2_AREA, 'right', '#e9eef0', true) : undefined;
  const axes = axesOf(p);
  return `
  ${iaiDefs(['#1f5a52', '#164540'])}
  ${mountTab(X(8), Y(0), 10 * MM, 8 * MM, true)}${mountTab(X(122), Y(0), 10 * MM, 8 * MM, true)}
  ${mountTab(X(8), Y(187), 10 * MM, 8 * MM, false)}${mountTab(X(122), Y(187), 10 * MM, 8 * MM, false)}
  <rect x="0.5" y="${Y(4)}" width="${W - 1}" height="${Y(187)}" rx="3" fill="#dfe2e5" stroke="#7d8287" stroke-width="0.8"/>
  <rect x="${X(2)}" y="${Y(5.5)}" width="${X(126)}" height="${Y(184)}" rx="2.5" fill="url(#iaipanel-{{uid}})" stroke="#0e2a26" stroke-width="0.6"/>
  ${iaiLogo(X(25), Y(22), 13)}
  ${sevenSeg(X(44), Y(8), 34 * MM, 19 * MM)}
  ${['RDY', 'ALM', 'EMG', 'HPS', 'CKE'].map((nm, i) => `${led(X(51 + i * 5.2), Y(33.5), i === 0 ? 'g' : 'off', 3, 2)}${lbl(X(51 + i * 5.2), Y(31), nm, 'middle', 2)}`).join('')}
  ${lbl(X(43), Y(37), 'BK RLS', 'end', 2.2)}${lbl(X(43), Y(40.5), 'NOM', 'end', 2.2)}
  ${Array.from({ length: 4 }, (_, i) => `<rect x="${X(46 + i * 5.2)}" y="${Y(36)}" width="${X(3.8)}" height="${X(5.4)}" rx="0.4" fill="#f4f4f4" stroke="#333" stroke-width="0.4"/><rect x="${X(46.6 + i * 5.2)}" y="${Y(38.6)}" width="${X(2.6)}" height="${X(2.2)}" fill="#222"/>${lbl(X(47.9 + i * 5.2), Y(44), String(i + 1), 'middle', 2)}`).join('')}
  <!-- MPG1〜4 -->
  ${Array.from({ length: 4 }, (_, i) => {
    const m = MPG(i);
    return i < axes
      ? `${whiteConnectorV(m.x, m.y, m.w / 2, m.h, 12)}${lbl(X(70), Y(46 + i * 29.3), `MPG${i + 1}`, 'end')}${[0, 1, 2].map((k) => led(X(83), Y(40 + i * 29.3 + k * 3.4), 'off', 2.2, 1.6)).join('')}${lbl(X(85), Y(36.5 + i * 29.3), 'B.ABS', 'start', 1.8)}`
      : `<rect x="${m.x}" y="${m.y}" width="${n2(m.w / 2)}" height="${m.h}" rx="0.8" fill="#163a35" stroke="#0e2a26" stroke-width="0.5"/>${lbl(X(70), Y(46 + i * 29.3), `MPG${i + 1}`, 'end')}`;
  }).join('')}
  ${smallBlackConnector(X(74.5), Y(152), X(5), X(9), 2)}${lbl(X(73), Y(157), 'ABS', 'end', 2.2)}
  <!-- AC 電源 -->
  <rect x="${X(17.5)}" y="${Y(131)}" width="${X(12)}" height="${X(28)}" rx="1" fill="url(#iaigreen-{{uid}})" stroke="#0d3317" stroke-width="0.5"/>
  ${screw(X(23.5), Y(134), 2.4)}${screw(X(23.5), Y(156), 2.4)}
  ${pwr.svg}
  <!-- モーター駆動電源ライン -->
  ${mp.svg}${lbl(X(83), Y(173), 'MPI', 'end', 2.4)}${lbl(X(83), Y(178), 'MPO', 'end', 2.4)}
  <!-- 右側 -->
  ${slideSwitch(X(110), Y(18), 7, 4.4)}${lbl(X(110), Y(14), 'MODE', 'middle', 2.2)}${lbl(X(104), Y(18.8), 'MANU', 'end', 2)}${lbl(X(116), Y(18.8), 'AUTO', 'start', 2)}
  <rect x="${X(108.5)}" y="${Y(23.5)}" width="${X(7)}" height="${X(22)}" rx="1" fill="#c9ccd0" stroke="#555" stroke-width="0.4"/>
  <rect x="${X(110)}" y="${Y(27)}" width="${X(4)}" height="${X(15)}" rx="1" fill="#141518"/>${lbl(X(117), Y(35), 'TP')}
  <rect x="${X(103)}" y="${Y(49.5)}" width="${X(7)}" height="${X(8)}" rx="0.6" fill="#d0d3d6" stroke="#555" stroke-width="0.4"/>
  <rect x="${X(104.5)}" y="${Y(51.5)}" width="${X(4)}" height="${X(4)}" rx="0.4" fill="#2a2c30"/>${lbl(X(111.5), Y(54.5), 'USB')}
  ${lbl(X(101.5), Y(61.5), 'EMG', 'end', 2.2)}${lbl(X(111.5), Y(61.5), 'ENB', 'start', 2.2)}
  ${sysL.svg}${sysR.svg}
  ${['IN', 'OUT', '1+', '1-', '2+', '2-'].map((t, i) => lbl(X(119), Y(65.5 + i * 3.5), t, 'start', 2)).join('')}
  ${hif6HeaderV(IO1.x, IO1.y, 40)}${lbl(X(104), Y(111.5), 'I/O1', 'end')}
  ${
    extPio
      ? `${hif6HeaderV(X(110), Y(160), 40)}${lbl(X(104), Y(160.5), 'I/O2', 'end')}`
      : fb
        ? fb.svg
        : `<rect x="${X(94)}" y="${Y(140)}" width="${X(18)}" height="${X(40)}" rx="1" fill="#163a35" stroke="#0e2a26" stroke-width="0.5"/>${lbl(X(103), Y(161), 'I/O2', 'middle')}`
  }
  ${text(X(22), Y(184), '<tspan font-size="7" font-style="italic">M</tspan>SEL', 4.8, '#e9eef0', 'start', 'bold')}${lbl(X(42), Y(184), 'CONTROLLER', 'start', 2.4)}
  ${lbl(X(42), Y(178.5), `MSEL-${String(p.model ?? 'PC')}`, 'start', 2.4)}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const ext = extOf(p);
  const ac = { system: 'AC' as const, minVoltage: 90, maxVoltage: 253 };
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const ts: TerminalDef[] = [
    { id: 'L', label: 'L', note: '電源入力（単相 AC100〜230V ±10%）', ...at(pwr.pos.L), role: 'input', accepts: ac },
    { id: 'N', label: 'N', note: '電源入力（単相 AC100〜230V ±10%）', ...at(pwr.pos.N), role: 'input', accepts: ac },
    { id: 'PE', label: 'PE', note: '保護接地', ...at(pwr.pos.PE), role: 'ground' },
    { id: 'EMGIN', label: 'EMGIN', note: '非常停止検出入力（EMGOUT の 24V が来ていれば非常停止解除）', ...at(sysL.pos.EMGIN), role: 'signal', function: 'safety-input' },
    { id: 'EMGOUT', label: 'EMGOUT', note: '非常停止検出入力用 24V 電源出力（DC30V、最大 0.5A）', ...at(sysL.pos.EMGOUT), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.5, kind: 'test' } },
    { id: 'EMGS1+', label: 'EMGS1+', note: 'ティーチングボックスの非常停止接点 1（+側）', ...at(sysL.pos['EMGS1+']), role: 'signal', optional: true },
    { id: 'EMGS1-', label: 'EMGS1-', note: 'ティーチングボックスの非常停止接点 1（−側）', ...at(sysL.pos['EMGS1-']), role: 'signal', optional: true },
    { id: 'EMGS2+', label: 'EMGS2+', note: 'ティーチングボックスの非常停止接点 2（+側。PG タイプで使用）', ...at(sysL.pos['EMGS2+']), role: 'signal', optional: true },
    { id: 'EMGS2-', label: 'EMGS2-', note: 'ティーチングボックスの非常停止接点 2（−側。PG タイプで使用）', ...at(sysL.pos['EMGS2-']), role: 'signal', optional: true },
    { id: 'ENBIN', label: 'ENBIN', note: 'イネーブル検出入力', ...at(sysR.pos.ENBIN), role: 'signal', function: 'safety-input' },
    { id: 'ENBOUT', label: 'ENBOUT', note: 'イネーブル検出入力用 24V 電源出力（DC30V、最大 0.5A）', ...at(sysR.pos.ENBOUT), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.5, kind: 'test' } },
    { id: 'ENBS1+', label: 'ENBS1+', note: 'ティーチングボックスのイネーブル接点 1（+側）', ...at(sysR.pos['ENBS1+']), role: 'signal', optional: true },
    { id: 'ENBS1-', label: 'ENBS1-', note: 'ティーチングボックスのイネーブル接点 1（−側）', ...at(sysR.pos['ENBS1-']), role: 'signal', optional: true },
    { id: 'ENBS2+', label: 'ENBS2+', note: 'ティーチングボックスのイネーブル接点 2（+側。PG タイプで使用）', ...at(sysR.pos['ENBS2+']), role: 'signal', optional: true },
    { id: 'ENBS2-', label: 'ENBS2-', note: 'ティーチングボックスのイネーブル接点 2（−側。PG タイプで使用）', ...at(sysR.pos['ENBS2-']), role: 'signal', optional: true },
    { id: 'MPI', label: 'MPI', note: 'モーター電源外部入力（通常は MPO と短絡。外部で遮断する場合は間に接触器の接点を入れる）', ...at(mp.pos.MPI), role: 'input', accepts: DC24_PLUS },
    { id: 'MPO', label: 'MPO', note: 'モーター電源外部出力（内蔵 DC24V）', ...at(mp.pos.MPO), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 8 } },
    {
      id: 'I/O1',
      label: 'I/O1（標準 PIO 40極 HIF6）',
      note: '標準 I/O（入力ポート 000〜015・出力ポート 300〜315）。PIO ケーブル CB-PAC-PIO でつなぐ',
      x: IO1.x,
      y: IO1.y,
      side: 'right',
      role: 'connector',
      connector: hif6Connector(40),
      optional: true,
    },
    { id: 'TP', label: 'TP（ティーチング）', note: 'ティーチングボックス・パソコン（RS-232C）の接続用（HDR-EC26、26 ピン）。PG タイプで AUTO にする場合はダミープラグ DP-4S を差す', x: TP.x, y: TP.y, side: 'right', role: 'connector', connector: { kind: 'IAI-SEL-TP26', pins: 0, width: 30, length: 14, facing: 'front', protocols: ['iai-sel-sio'] }, optional: true },
    { id: 'USB', label: 'USB', note: 'ティーチング用 USB（B タイプ）', x: USB.x, y: USB.y, side: 'right', role: 'connector', connector: { kind: 'USB-B', pins: 0, width: 12, length: 12, facing: 'front', protocols: ['usb'] }, optional: true },
  ];
  for (let i = 0; i < axesOf(p); i++) {
    const m = MPG(i);
    ts.push({
      id: `MPG${i + 1}`,
      label: `MPG${i + 1}（${i + 1} 軸目 モーター・エンコーダー）`,
      note: isF(p)
        ? '高推力パルスモーター（56SP/60P/86P）のロボシリンダー（適応コントローラー P4 の RCP6 など）のモーター・エンコーダー一体ケーブルをつなぐ'
        : 'ロボシリンダー（RCP6/RCP5/RCP4/RCP3/RCP2）のモーター・エンコーダー一体ケーブルをつなぐ',
      x: n2(m.x + m.w / 4),
      y: n2(m.y + m.h / 2),
      side: 'left',
      role: 'connector',
      // PCF / PGF（高推力モーター対応）は PCON-CFB と同じ種類（RCP6 の適応コントローラー P4）
      connector: { kind: isF(p) ? 'IAI-RCP-MPG-CFB' : 'IAI-RCP-MPG', pins: 0, width: m.h, length: 14, facing: 'front' },
      optional: true,
    });
  }
  if (ext === 'NP' || ext === 'PN') {
    ts.push({
      id: 'I/O2',
      label: 'I/O2（拡張 PIO 40極 HIF6）',
      note: '拡張 I/O（入力ポート 016〜031・出力ポート 316〜331）。PIO ケーブル CB-PAC-PIO でつなぐ',
      x: X(110),
      y: Y(160),
      side: 'right',
      role: 'connector',
      connector: hif6Connector(40),
      optional: true,
    });
  } else if (ext !== 'none') {
    // MSEL の EtherNet/IP ボードは Ethernet（無手順）通信もできる
    ts.push(
      ...fieldbusBlock(ext, IO2_AREA, 'right', '#e9eef0', true).terminals.map((t) =>
        t.connector?.protocols?.includes('ethernet-ip') ? { ...t, connector: { ...t.connector, protocols: ['ethernet-ip', 'ethernet'] } } : t,
      ),
    );
  }
  return ts;
};

const extPoints = () => selPio40('I/O2', 16, 316);

const pins = (p: ParamValues): PinDef[] => {
  const ext = extOf(p);
  return [
    ...pioPins(selPio40('I/O1', 0, 300), stdPolarity(p)),
    ...(ext === 'NP' || ext === 'PN' ? pioPins(extPoints(), ext === 'PN' ? 'pnp' : 'npn') : []),
  ];
};

const links = (p: ParamValues): InternalLink[] => {
  const ext = extOf(p);
  const g = isG(p);
  return [
    // ティーチングボックスの非常停止・イネーブル接点（PC タイプは TB 未接続時に内部で 1+/1- を短絡。PG タイプは TB またはダミープラグ）。Conneko では機器の外のもので開く b 接点（safetyContact）として扱い、安全入力のループの接点に数える
    { from: 'EMGS1+', to: 'EMGS1-', switch: 'NC', safetyContact: true },
    { from: 'ENBS1+', to: 'ENBS1-', switch: 'NC', safetyContact: true },
    ...(g
      ? [
          { from: 'EMGS2+', to: 'EMGS2-', switch: 'NC' as const, safetyContact: true },
          { from: 'ENBS2+', to: 'ENBS2-', switch: 'NC' as const, safetyContact: true },
        ]
      : []),
    ...pioLinks(selPio40('I/O1', 0, 300), stdPolarity(p), 0.1),
    ...(ext === 'NP' || ext === 'PN' ? pioLinks(extPoints(), ext === 'PN' ? 'pnp' : 'npn', 0.05) : []),
  ];
};

/** 標準 I/O の出力 16 点は、8 点ごと（ポート 300〜307・308〜315）に合計 400mA まで */
const stdOutputGroups = (): CommonLimit[] => {
  const outs = selPio40('I/O1', 0, 300).filter((pt) => pt.kind === 'out');
  return [0, 8].map((k) => {
    const g = outs.slice(k, k + 8);
    return { outputs: g.map((pt) => pt.id), current: 0.4, label: `出力ポート ${300 + k}〜${300 + k + g.length - 1}` };
  });
};

const def: DeviceDefinition = {
  type: 'iai.msel',
  name: 'プログラムコントローラー（ロボシリンダー 4 軸用）',
  model: 'MSEL',
  maker: 'IAI',
  category: 'plc',
  description:
    'IAI のロボシリンダー（RCP6/RCP5/RCP4/RCP3/RCP2、パルスモーター）を最大 4 軸動かすプログラムコントローラー（SEL 言語、最大 30,000 ポジション）。PLC なしで単独運転でき、汎用の入出力を持つ。' +
    '電源: L・N に単相 AC100〜230V ±10%（電源電流 2.9A @AC100V / 1.4A @AC200V）、PE を接地。' +
    'システム I/O: EMGOUT（内蔵 24V）→ 非常停止スイッチの b 接点 → EMGIN、ENBOUT → イネーブルスイッチ → ENBIN（出荷時は短絡線で EMGOUT-EMGS1+、EMGS1-‐EMGIN、ENBOUT-ENBS1+、ENBS1-‐ENBIN を接続）。' +
    'PG/PGF タイプ（安全カテゴリー対応）は外部に駆動源遮断回路を設け、MPO-MPI 間に接触器の接点を入れる（通常は MPO-MPI を短絡）。' +
    'MPG1〜4 には、PC/PG タイプは適応コントローラー P3 の RCP6 など、PCF/PGF タイプは高推力モーター（56SP/60P/86P）の P4 のアクチュエーターをつなぐ（PCON-CFB と同じ種類のコネクターとして扱う）。' +
    '標準 I/O（I/O1）: 40 極 HIF6、入力 16 点（ポート 000〜015）・出力 16 点（ポート 300〜315、100mA/点・8 点で 400mA）。NPN / PNP は型式で選ぶ。1A・2A に +24V、19B・20B に 0V。PIO ケーブル CB-PAC-PIO で配線する。' +
    '拡張 I/O（I/O2）: 拡張 PIO（ポート 016〜031 / 316〜331）または DeviceNet・CC-Link・PROFIBUS-DP・EtherNet/IP・EtherCAT・PROFINET IO。',
  labelPrefix: 'MSEL',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  commonLimits: stdOutputGroups(),
  safetyChannels: [stopLoop('EMG', '非常停止（EMGOUT → EMGIN）', 'EMGIN'), stopLoop('ENB', 'イネーブル（ENBOUT → ENBIN）', 'ENBIN')],
  params: [
    {
      key: 'model',
      label: 'タイプ',
      options: [
        { value: 'PC', label: 'PC: 標準タイプ' },
        { value: 'PG', label: 'PG: 安全カテゴリー対応タイプ' },
        { value: 'PCF', label: 'PCF: 56SP/60P/86P モーター対応タイプ' },
        { value: 'PGF', label: 'PGF: 安全カテゴリー対応 56SP/60P/86P モーター対応タイプ' },
      ],
      default: 'PC',
    },
    {
      key: 'axes',
      label: '接続軸数',
      options: [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} 軸` })),
      default: 4,
    },
    {
      key: 'io',
      label: '標準 I/O 種類',
      options: [
        { value: 'NP', label: 'NP: NPN 仕様' },
        { value: 'PN', label: 'PN: PNP 仕様' },
      ],
      default: 'NP',
    },
    {
      key: 'ext',
      label: '拡張 I/O（I/O2）',
      options: EXT_TYPES.map((t) => ({ value: t, label: t === 'none' ? 'なし' : t === 'NP' ? 'NP: 拡張 PIO（NPN）' : t === 'PN' ? 'PN: 拡張 PIO（PNP）' : IO_TYPE_LABELS[t] })),
      default: 'none',
    },
  ],
  loadCurrent: 2.9,
};

export default def;

