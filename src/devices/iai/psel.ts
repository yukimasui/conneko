import { DC24_MINUS, DC24_PLUS, dshellV, hif6Connector, hif6HeaderV, iaiDefs, led, MM, mountTab, n2, plugH, slideSwitch, smallBlackConnector, stopLoop, text, whiteConnectorV } from './parts';
import { hif40No, pioLinks, pioPins, portNo, type PioPoint, type Polarity } from './pio';
import type { AcceptSpec, ConnectorSpec, DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * IAI の小型プログラムコントローラー PSEL / ASEL（DC24V、2 軸まで。DS-S-C1 の後継で I/O の割付けは互換）の作り。
 *
 * 出典: 取扱説明書 MJ0172「PSEL」、MJ0165「ASEL」（第 2 章 仕様: 製品基本仕様・各部の名称及び機能・I/O インターフェイスリスト・
 *       制御電源・システム I/O コネクタ・モータ電源コネクタ、第 3 章 外形寸法図・PIO ケーブルの接続）。
 *
 * 外観: 幅 43mm × 高さ 159mm（取付ピッチ 151mm）、奥行 110mm。正面の上から 1 軸目・2 軸目のモーターコネクター（M1・M2）、
 * ブレーキ解除スイッチ（BK1・BK2）、エンコーダーコネクター（PG1・PG2）、左に PIO コネクター（I/O、34 極）、
 * 下に LED（PWR・RDY・ALM・EMG・SV1・SV2）、MANU/AUTO スイッチ、USB、ティーチングコネクター（TP）。
 * 下面に制御電源・システム I/O コネクター（MC1.5/6、CP EMG ENB）とモーター電源コネクター（MSTB2.5/2、MP）。
 * Conneko では下面の 2 つのコネクターを正面の下端に並べて描く（電線は下へ出る）。
 *
 * 制御電源・システム I/O（6 極）: 1 EMG+・2 EMG−（非常停止スイッチ。B 接点、内部給電型）、3 ENB+・4 ENB−（イネーブルスイッチ。B 接点、内部給電型）、
 *   5 0V・6 24V（制御電源 DC24V ±10%、最大 1.2A。0V は内部 GND と共通）。
 * モーター電源（2 極）: 1 0V・2 24V（DC24V ±10%。0V は制御電源の 0V と内部でつながる）。
 * PIO（34 極、1A〜17A・1B〜17B）: 1A が +24V（P24）、17B が 0V（N）。1B〜5A が入力ポート 016〜023、5B〜13A が入力ポート 000〜015、
 *   13B〜17A が出力ポート 300〜307（100mA/点、8 点で 400mA）。付属のフラットケーブル CB-DS-PIO（34 芯、片側バラ線）でつなぐ。
 */

export interface PselSpec {
  type: string;
  series: 'PSEL' | 'ASEL';
  name: string;
  description: string;
  /** 1 軸あたりのモーター電源の最大電流[A] */
  mpPerAxis: number;
  /** 対応アクチュエーター（モーター・エンコーダーコネクターの説明に使う） */
  actuators: string;
}

/** PSEL / ASEL に共通の推定の値 */
const ESTIMATED = 'PIO（34 極）のコネクターの形式は推定（資料で確認できず、付属ケーブル CB-DS-PIO とだけつながる専用の種類にした）';

const W = 43 * MM;
const H = 159 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

/** PIO コネクター（34 極）。ピン番号の並びは HIF6 と同じ考え方（nA → 2n−1、nB → 2n）。実物の形式は資料で確認できないため専用の種類にする */
export const PSEL_IO_CONNECTOR: ConnectorSpec = { ...hif6Connector(34), kind: 'IAI-DS-IO34' };

const IO = { x: X(10), y: Y(42) };
const M = (i: number) => ({ x: X(25), y: Y(11 + i * 13) });
const BK = (i: number) => ({ x: X(31), y: Y(39 + i * 22) });
const PG = (i: number) => ({ x: X(25), y: Y(43 + i * 22) });
const TP = { x: X(32), y: Y(124) };
const USB = { x: X(32), y: Y(106) };

const SYS_IDS = ['EMG+', 'EMG-', 'ENB+', 'ENB-', '0V', '24V'];
const sysPlug = plugH({ x: X(2.5), y: Y(141), ids: SYS_IDS, pitch: 3.5 * MM, h: 8 * MM });
const mpPlug = plugH({ x: X(27.5), y: Y(141), ids: ['MP0V', 'MP24V'], pitch: 5.08 * MM, h: 8 * MM });

/** 入力ポートの出荷時の機能（プログラムモード） */
const IN_FUNC: Record<number, string> = {
  0: 'プログラムスタート',
  16: 'プログラム番号指定 1',
  17: 'プログラム番号指定 2',
  18: 'プログラム番号指定 4',
  19: 'プログラム番号指定 8',
  20: 'プログラム番号指定 10',
  21: 'プログラム番号指定 20',
  22: 'プログラム番号指定 40',
  23: 'ソフトウェアリセット',
};
const OUT_FUNC: Record<number, string> = { 300: 'アラーム', 301: 'レディー' };

/** PIO 34 極のピン（出荷時のプログラムモードの割付け） */
export function pselPio34(cn: string): PioPoint[] {
  const order: { row: 'A' | 'B'; n: number }[] = [];
  for (let n = 1; n <= 17; n++) order.push({ row: 'A', n }, { row: 'B', n });
  const inPorts = [...Array.from({ length: 8 }, (_, i) => 16 + i), ...Array.from({ length: 16 }, (_, i) => i)];
  return order.map(({ row, n }, k): PioPoint => {
    const id = `${cn}#${hif40No(row, n)}`;
    const no = `${n}${row}`;
    if (k === 0) return { id, no, kind: 'p24', name: 'P24', func: '24V' };
    if (k === 33) return { id, no, kind: 'n', name: 'N', func: '0V' };
    if (k <= 24) {
      const port = inPorts[k - 1];
      const f = IN_FUNC[port];
      return { id, no, kind: 'in', name: `IN${portNo(port)}`, note: `入力ポート ${portNo(port)}${f ? `（出荷時: ${f}）` : ''}` };
    }
    const port = 300 + (k - 25);
    const f = OUT_FUNC[port];
    return { id, no, kind: 'out', name: `OUT${portNo(port)}`, note: `出力ポート ${portNo(port)}${f ? `（出荷時: ${f}）` : ''}` };
  });
}

const polarityOf = (p: ParamValues): Polarity => (String(p.io ?? 'NPN') === 'PNP' ? 'pnp' : 'npn');
const axesOf = (p: ParamValues) => (Number(p.axes ?? 2) === 1 ? 1 : 2);

export function buildPsel(spec: PselSpec): DeviceDefinition {
  const svg = (p: ParamValues) => {
    const axes = axesOf(p);
    const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.4) => text(x, y, t, size, '#e9eef0', anchor);
    const motor = (i: number) => {
      const m = M(i);
      if (i >= axes) return `<rect x="${X(19)}" y="${n2(m.y - 9)}" width="${X(13)}" height="${X(9)}" rx="0.8" fill="#2a2c30" stroke="#1a1b1d" stroke-width="0.5"/>`;
      return `${whiteConnectorV(X(19), m.y - 9, 13 * MM, 9 * MM, 3)}${lbl(X(34), m.y - 3, `M${i + 1}`)}`;
    };
    const enc = (i: number) => {
      const g = PG(i);
      const b = BK(i);
      if (i >= axes) return `<rect x="${X(19)}" y="${n2(g.y - 1)}" width="${X(13)}" height="${X(16)}" rx="0.8" fill="#2a2c30" stroke="#1a1b1d" stroke-width="0.5"/>`;
      return `${slideSwitch(b.x, b.y, 9, 4.4)}${lbl(X(25.5), b.y + 1, `BK${i + 1}`, 'end', 2)}${lbl(X(36.5), b.y + 1, 'RLS NOM', 'start', 1.5)}
      ${whiteConnectorV(X(19), g.y - 1, 13 * MM, 16 * MM, 8)}${lbl(X(34), g.y + 8, `PG${i + 1}`)}`;
    };
    const sysLabels: Record<string, string> = { 'EMG+': 'EMG+', 'EMG-': 'EMG−', 'ENB+': 'ENB+', 'ENB-': 'ENB−', '0V': '0V', '24V': '24V' };
    return `
  ${iaiDefs(['#3c4046', '#2a2d31'])}
  ${mountTab(X(21.5), 0, X(12), Y(7), true)}
  ${mountTab(X(21.5), Y(152), X(12), Y(7), false)}
  <rect x="${X(0.5)}" y="${Y(4)}" width="${X(42)}" height="${Y(151)}" rx="2.5" fill="url(#iaipanel-{{uid}})" stroke="#15171a" stroke-width="0.8"/>
  <rect x="${X(1.5)}" y="${Y(5)}" width="${X(40)}" height="${Y(149)}" rx="1.8" fill="none" stroke="#50555c" stroke-width="0.5"/>
  ${text(X(3), Y(11), 'IAI', 6, '#ffffff', 'start', 'bold', ' font-style="italic"')}
  ${text(X(3), Y(15.5), spec.series, 3.4, '#e9eef0', 'start', 'bold')}
  ${motor(0)}${motor(1)}
  ${enc(0)}${enc(1)}
  <!-- PIO -->
  ${hif6HeaderV(IO.x, IO.y, 34)}${lbl(IO.x, Y(23.5), 'I/O', 'middle', 2.6)}
  <!-- LED -->
  ${['PWR', 'RDY', 'ALM', 'EMG', 'SV1', 'SV2'].map((nm, i) => `${led(X(5), Y(73 + i * 3.6), i < 2 ? 'g' : 'off', 3, 2.2)}${lbl(X(7.5), Y(73.8 + i * 3.6), nm, 'start', 2)}`).join('')}
  <!-- パネルユニット接続コネクター -->
  ${smallBlackConnector(X(3), Y(96), X(7), Y(5), 4)}${lbl(X(11.5), Y(99.5), 'PANEL', 'start', 1.8)}
  <!-- MANU/AUTO -->
  ${slideSwitch(X(32), Y(97), 12, 5)}${lbl(X(25), Y(97.8), 'MANU', 'end', 1.8)}${lbl(X(32), Y(93.5), 'AUTO', 'start', 1.8)}
  <!-- USB -->
  <rect x="${n2(USB.x - 6)}" y="${n2(USB.y - 5)}" width="12" height="10" rx="0.8" fill="#d0d3d6" stroke="#555" stroke-width="0.4"/><rect x="${n2(USB.x - 4)}" y="${n2(USB.y - 3)}" width="8" height="6" rx="0.6" fill="#2a2c30"/>${lbl(X(26), Y(107), 'USB', 'end', 2)}
  <!-- TP -->
  ${dshellV(TP.x, TP.y, 30 * MM / 1.2, 13)}${lbl(X(26), Y(124.5), 'TP', 'end', 2.4)}
  <!-- 下面のコネクター（正面の下端に並べて描く） -->
  ${lbl(X(13.5), Y(138.5), 'CP  EMG  ENB', 'middle', 1.8)}${lbl(X(33.5), Y(138.5), 'MP', 'middle', 1.8)}
  ${sysPlug.svg}${mpPlug.svg}
  ${SYS_IDS.map((id) => text(sysPlug.pos[id].x, Y(146.5), sysLabels[id], 1.4, '#0b1e10')).join('')}
  ${text(mpPlug.pos.MP0V.x, Y(146.5), '0V', 1.6, '#0b1e10')}${text(mpPlug.pos.MP24V.x, Y(146.5), '24V', 1.6, '#0b1e10')}`;
  };

  const at = (pos: { x: number; y: number; side: 'bottom' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const internal24: TerminalDef['supply'] = { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const ts: TerminalDef[] = [
      { id: 'EMG+', label: 'EMG+（非常停止スイッチ +側）', note: '内部給電型。EMG+ から非常停止スイッチ（B 接点）を通して EMG− に戻す', ...at(sysPlug.pos['EMG+']), role: 'supply', supply: internal24 },
      { id: 'EMG-', label: 'EMG−（非常停止スイッチ −側）', note: '非常停止入力（B 接点入力、内部給電型）', ...at(sysPlug.pos['EMG-']), role: 'signal', function: 'safety-input' },
      { id: 'ENB+', label: 'ENB+（イネーブルスイッチ +側）', note: '内部給電型。ENB+ からイネーブルスイッチ（セーフティーゲートなど、B 接点）を通して ENB− に戻す', ...at(sysPlug.pos['ENB+']), role: 'supply', supply: internal24 },
      { id: 'ENB-', label: 'ENB−（イネーブルスイッチ −側）', note: 'イネーブル入力（B 接点入力、内部給電型）', ...at(sysPlug.pos['ENB-']), role: 'signal', function: 'safety-input' },
      { id: '0V', label: 'CP 0V（制御電源）', note: '制御電源入力 0V（内部 GND と共通）', ...at(sysPlug.pos['0V']), role: 'input', accepts: DC24_MINUS },
      { id: '24V', label: 'CP 24V（制御電源）', note: '制御電源入力 DC24V ±10%（最大 1.2A）', ...at(sysPlug.pos['24V']), role: 'input', accepts: DC24_PLUS },
      { id: 'MP0V', label: 'MP 0V（モーター電源）', note: 'モーター電源入力 0V（制御電源の 0V と内部でつながる）', ...at(mpPlug.pos.MP0V), role: 'input', accepts: DC24_MINUS },
      { id: 'MP24V', label: 'MP 24V（モーター電源）', note: `モーター電源入力 DC24V ±10%（最大 ${spec.mpPerAxis}A/軸）。非常停止時は内部リレーで遮断される`, ...at(mpPlug.pos.MP24V), role: 'input', accepts: DC24_PLUS as AcceptSpec },
      { id: 'I/O', label: 'I/O（PIO 34 極）', note: '入力 24 点・出力 8 点。付属のフラットケーブル CB-DS-PIO（片側バラ線）でつなぐ。1A に +24V、17B に 0V', x: X(5), y: IO.y, side: 'left', role: 'connector', connector: PSEL_IO_CONNECTOR, optional: true },
      { id: 'TP', label: 'TP（ティーチング 26 ピン）', note: 'ティーチングボックス・パソコン対応ソフト。USB を使うときはダミープラグを差す', x: X(38.5), y: TP.y, side: 'right', role: 'connector', connector: { kind: 'IAI-SEL-TP26', pins: 0, width: 50, length: 14, facing: 'front', protocols: ['iai-sel-sio'] }, optional: true },
      { id: 'USB', label: 'USB（B）', note: 'パソコン対応ソフト用', x: X(38), y: USB.y, side: 'right', role: 'connector', connector: { kind: 'USB-B', pins: 0, width: 12, length: 12, facing: 'front', protocols: ['usb'] }, optional: true },
    ];
    for (let i = 0; i < axesOf(p); i++) {
      ts.push(
        { id: `M${i + 1}`, label: `M${i + 1}（${i + 1} 軸目 モーター）`, note: `${spec.actuators} のモーターケーブル`, x: X(32), y: M(i).y - 4.5 * MM, side: 'right', role: 'connector', connector: { kind: `IAI-${spec.series}-MOT`, pins: 0, width: 18, length: 14, facing: 'front' }, optional: true },
        { id: `PG${i + 1}`, label: `PG${i + 1}（${i + 1} 軸目 エンコーダー）`, note: `${spec.actuators} のエンコーダーケーブル`, x: X(32), y: PG(i).y + 7 * MM, side: 'right', role: 'connector', connector: { kind: `IAI-${spec.series}-PG`, pins: 0, width: 32, length: 14, facing: 'front' }, optional: true },
      );
    }
    return ts;
  };

  const pins = (p: ParamValues): PinDef[] => pioPins(pselPio34('I/O'), polarityOf(p));
  const links = (p: ParamValues): InternalLink[] => [
    { from: '0V', to: 'MP0V' },
    ...pioLinks(pselPio34('I/O'), polarityOf(p), 0.1),
  ];

  return {
    type: spec.type,
    name: spec.name,
    model: `${spec.series}-C/CS`,
    maker: 'IAI',
    category: 'plc',
    description: spec.description,
    estimated: ESTIMATED,
    labelPrefix: spec.series,
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
    safetyChannels: [stopLoop('EMG', '非常停止（EMG+ → EMG−）', 'EMG-'), stopLoop('ENB', 'イネーブル（ENB+ → ENB−）', 'ENB-')],
    params: [
      {
        key: 'model',
        label: 'タイプ',
        options: [
          { value: 'C', label: `${spec.series}-C: 標準タイプ` },
          { value: 'CS', label: `${spec.series}-CS: CS タイプ（ティーチングコネクターの形式違い）` },
        ],
        default: 'C',
      },
      { key: 'axes', label: '接続軸数', options: [1, 2].map((n) => ({ value: n, label: `${n} 軸` })), default: 2 },
      {
        key: 'io',
        label: 'PIO の仕様',
        options: [
          { value: 'NPN', label: 'NPN（シンク）' },
          { value: 'PNP', label: 'PNP（ソース）' },
        ],
        default: 'NPN',
      },
      {
        key: 'loadCurrent',
        label: 'モーター電源の電流（最大）',
        unit: 'A',
        options: [
          { value: spec.mpPerAxis, label: `1 軸（${spec.mpPerAxis}A）` },
          { value: n2(spec.mpPerAxis * 2), label: `2 軸（${n2(spec.mpPerAxis * 2)}A）` },
        ],
        default: n2(spec.mpPerAxis * 2),
      },
    ],
    loadCurrent: { param: 'loadCurrent' },
  };
}
