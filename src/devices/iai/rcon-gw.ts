import { DC24_MINUS, DC24_PLUS, MM, n2, plugV, stopLoop, text } from './parts';
import { cpLoadParam, ledLabel, RCON_BUS, RCON_H, RCON_NET_LABELS, rconBody, rconDefs, rconTopFieldbus, toggle, type RconNet } from './rcon';
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, TerminalDef } from '../types';

/**
 * IAI R-unit のゲートウェイユニット（RCON-GW / RCON-GWG、REC-GW）の共通の作り。
 *
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」「R-unit (REC)」（ユニット構成・基本仕様・電源容量・外観寸法・各部名称）、
 *       取扱説明書 MJ0384「RCON」（3.1 ゲートウェイユニット: システム I/O・モーター電源・制御電源・SIO・Ethernet、2.3 フィールドネットワーク仕様）、
 *       MJ0394「REC」。
 *
 * 外観: W30 × H115 × D95mm（RCON はアイボリー、REC は黒）。前面に Ethernet（オプション）・AUTO/MANU・SIO・USB・システム I/O（2 列 × 5）・
 * モーター電源（緑 2 極）・制御電源（緑 3 極）、右に LED（T RUN・SYS・STOP・MODE・C ERR・STATUS0/1）。フィールドネットワークのコネクターは上面。
 *
 * システム I/O（DFMC1.5/5-ST-3.5、10 極。出荷時に 1-6、2-7、3-8 を短絡）:
 *   1 S2・2 S1（ティーチングボックスの STOP スイッチ接点）、3 AUTO/MANU−（入力）、4 GND、5 PS24_SD−、6 STOP+（STOP 信号用 +24V 出力）、
 *   7 STOP−（STOP 信号入力 DC24V 10mA 以下。OFF でドライバーユニットの駆動源を一括遮断）、8 AUTO/MANU+（電源）、9 NC、10 PS24_SD+（PSA-24 との RS-485）。
 * モーター電源（SPT5/2-H-7.5）: 2 24V（モーター電源 +24V。システム全体で最大 37.5A）、1 0V。
 * 制御電源（SPT2.5/3-H-5.0）: 3 CP（制御電源 +24V。連結した全ユニットの制御電源とブレーキ電源。最大 9.0A）、2 GND、1 FG。
 */

const W = 30 * MM;
const H = RCON_H;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

export interface RconGatewaySpec {
  type: string;
  /** 型式の頭（'RCON-GW'、'REC-GW'） */
  prefix: string;
  name: string;
  description: string;
  labelPrefix: string;
  nets: RconNet[];
  defaultNet: RconNet;
  /** タイプの選択肢（値は型式の頭に続く文字。例: RCON-GW / RCON-GWG） */
  models?: { value: string; label: string; model: string }[];
  /** 黒い筐体（REC） */
  dark?: boolean;
}

// パラメーターは既定値を補完済みで渡される
const netOf = (p: ParamValues) => String(p.io) as RconNet;
const hasEth = (p: ParamValues) => netOf(p) === 'N' || String(p.ethernet ?? 'none') !== 'none';

const SYS_L = ['PS24_SD+', 'NC', 'AM+', 'STOP-', 'STOP+'];
const SYS_R = ['PS24_SD-', 'GND', 'AM-', 'S1', 'S2'];
const sysL = plugV({ x: X(13), y: Y(50), ids: SYS_L, pitch: 3.5 * MM, w: 4.6 * MM, color: 'black', wire: 'left' });
const sysR = plugV({ x: X(18), y: Y(50), ids: SYS_R, pitch: 3.5 * MM, w: 4.6 * MM, color: 'black', wire: 'right' });
const mp = plugV({ x: X(11), y: Y(68), ids: ['MP+', 'MP0V'], pitch: 7.5 * MM, w: 10 * MM, wire: 'left', labels: { 'MP+': '24V', MP0V: '0V' }, labelColor: '#2b2d30', labelSize: 2.4 });
const cp = plugV({ x: X(13), y: Y(85.5), ids: ['CP', 'GND0', 'FG'], pitch: 5 * MM, w: 8 * MM, wire: 'left', labels: { CP: 'CP', GND0: 'GND', FG: 'FG' }, labelColor: '#2b2d30', labelSize: 2.2 });
const SIO = { x: X(15), y: Y(37) };
const USB = { x: X(21), y: Y(45.5) };
const ETH = { x: X(13), y: Y(15) };

const svgOf = (spec: RconGatewaySpec) => (p: ParamValues) => {
  const ink = spec.dark ? '#d8dadd' : '#3a3c40';
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 1.9) => text(x, y, t, size, ink, anchor);
  const top = rconTopFieldbus(netOf(p), W);
  const model = spec.models?.find((m) => m.value === String(p.model ?? spec.models?.[0].value))?.model ?? spec.prefix;
  return `
  ${rconDefs()}
  ${rconBody(W, `${model}-${netOf(p) === 'N' ? 'N-EP' : netOf(p)}`, undefined, spec.dark)}
  ${top.svg}
  ${
    hasEth(p)
      ? `<rect x="${n2(ETH.x - 11)}" y="${n2(ETH.y - 12)}" width="22" height="24" rx="1" fill="url(#rcshield-{{uid}})" stroke="#5d6166" stroke-width="0.5"/>
  <rect x="${n2(ETH.x - 8)}" y="${n2(ETH.y - 8)}" width="16" height="14" rx="0.6" fill="#111"/><rect x="${n2(ETH.x - 3)}" y="${n2(ETH.y + 6)}" width="6" height="3" fill="#111"/>
  <rect x="${n2(ETH.x - 10)}" y="${n2(ETH.y - 11)}" width="3" height="2" fill="#4ad35a"/><rect x="${n2(ETH.x + 7)}" y="${n2(ETH.y - 11)}" width="3" height="2" fill="#ffb12e"/>`
      : `<rect x="${n2(ETH.x - 11)}" y="${n2(ETH.y - 12)}" width="22" height="24" rx="1" fill="#e4e0d4" stroke="#b5b0a3" stroke-width="0.4"/>`
  }
  ${ledLabel(X(26), Y(11), 'T RUN', 'g', 'end', ink)}${ledLabel(X(26), Y(14), 'SYS', 'g', 'end', ink)}
  ${toggle(X(15), Y(27.5))}${lbl(X(15), Y(24.8), 'AUTO/MANU', 'middle', 1.7)}
  <rect x="${X(8.5)}" y="${Y(31)}" width="${X(13)}" height="${X(12)}" rx="1" fill="#2a2c30"/>
  <circle cx="${SIO.x}" cy="${SIO.y}" r="9" fill="#111" stroke="#555" stroke-width="0.6"/>${lbl(X(23), Y(37.6), 'SIO')}
  <rect x="${n2(USB.x - 4)}" y="${n2(USB.y - 2.5)}" width="8" height="5" rx="0.6" fill="#8d9196" stroke="#333" stroke-width="0.3"/><rect x="${n2(USB.x - 2.6)}" y="${n2(USB.y - 1.2)}" width="5.2" height="2.4" fill="#222"/>${lbl(X(16.5), Y(46.2), 'USB', 'end')}
  ${sysL.svg}${sysR.svg}
  ${ledLabel(X(27), Y(51), 'STOP', 'off', 'end', ink)}${ledLabel(X(27), Y(54), 'MODE', 'g', 'end', ink)}${ledLabel(X(27), Y(57), 'C ERR', 'off', 'end', ink)}${ledLabel(X(27), Y(60), 'ST0', 'off', 'end', ink)}${ledLabel(X(27), Y(63), 'ST1', 'off', 'end', ink)}
  ${spec.dark ? (mp.svg + cp.svg).split("#2b2d30").join(ink) : mp.svg + cp.svg}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const ts: TerminalDef[] = [
    ...rconTopFieldbus(netOf(p), W).terminals,
    { id: 'CP', label: 'CP', note: '制御電源 +24V 入力（連結した全ユニットの制御電源・ブレーキ電源。DC24V ±10%）', ...at(cp.pos.CP), role: 'input', accepts: DC24_PLUS },
    { id: 'GND0', label: 'GND', note: '制御電源 0V', ...at(cp.pos.GND0), role: 'input', accepts: DC24_MINUS },
    { id: 'FG', label: 'FG', note: 'フレームグラウンド', ...at(cp.pos.FG), role: 'ground' },
    { id: 'MP+', label: '24V（MP）', note: 'モーター電源 +24V 入力（連結した 24V ドライバーユニット・EC 接続ユニットへ供給。システム全体で最大 37.5A）', ...at(mp.pos['MP+']), role: 'input', accepts: DC24_PLUS, busNet: 'MP' },
    { id: 'MP0V', label: '0V（MP）', note: 'モーター電源 0V', ...at(mp.pos.MP0V), role: 'input', accepts: DC24_MINUS },
    { id: 'S2', label: 'S2（1）', note: 'ティーチングボックス用 STOP スイッチ接点入力（出荷時は STOP+ と短絡）', ...at(sysR.pos.S2), role: 'signal', optional: true },
    { id: 'S1', label: 'S1（2）', note: 'ティーチングボックス用 STOP スイッチ接点出力（出荷時は STOP− と短絡）', ...at(sysR.pos.S1), role: 'signal', optional: true },
    { id: 'AM-', label: 'AUTO/MANU−（3）', note: 'AUTO/MANU 信号入力（AUTO/MANU+ と短絡で AUTO。前面のスイッチと直列）', ...at(sysR.pos['AM-']), role: 'signal', optional: true },
    { id: 'GND', label: 'GND（4）', note: '0V', ...at(sysR.pos.GND), role: 'signal', optional: true },
    { id: 'PS24_SD-', label: 'PS24_SD−（5）', note: 'PSA-24 との RS-485 通信 −', ...at(sysR.pos['PS24_SD-']), role: 'signal', optional: true },
    { id: 'STOP+', label: 'STOP+（6）', note: 'STOP 信号用 +24V 電源出力', ...at(sysL.pos['STOP+']), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } },
    { id: 'STOP-', label: 'STOP−（7）', note: 'STOP 信号入力（DC24V 10mA 以下。OFF でドライバーユニットの駆動源を一括遮断）', ...at(sysL.pos['STOP-']), role: 'signal', function: 'safety-input' },
    { id: 'AM+', label: 'AUTO/MANU+（8）', note: 'AUTO/MANU 用電源出力', ...at(sysL.pos['AM+']), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.05 }, optional: true },
    { id: 'NC', label: 'NC（9）', note: '未接続', ...at(sysL.pos.NC), role: 'signal', optional: true },
    { id: 'PS24_SD+', label: 'PS24_SD+（10）', note: 'PSA-24 との RS-485 通信 +', ...at(sysL.pos['PS24_SD+']), role: 'signal', optional: true },
    { id: 'SIO', label: 'SIO', note: 'ティーチングボックス・パソコン（RS-485）の接続用（GWG は未使用時ダミープラグ DP-5）', x: SIO.x, y: SIO.y, side: 'left', role: 'connector', connector: { kind: 'IAI-RCON-SIO', pins: 0, width: 18, length: 14, facing: 'front', protocols: ['iai-sio'] }, optional: true },
    { id: 'USB', label: 'USB（Mini-B）', note: 'パソコンのティーチングソフト用', x: USB.x, y: USB.y, side: 'right', role: 'connector', connector: { kind: 'USB-MINIB', pins: 0, width: 10, length: 10, facing: 'front', protocols: ['usb'] }, optional: true },
  ];
  if (hasEth(p)) {
    ts.push({
      id: 'ETH',
      label: 'Ethernet（RJ-45）',
      note: netOf(p) === 'N' ? 'EtherNet/IP（N-EP 仕様。上面のポートは未使用）' : 'Ethernet オプション（Modbus/TCP）',
      x: ETH.x,
      y: ETH.y,
      side: 'left',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: netOf(p) === 'N' ? ['ethernet-ip', 'ethernet'] : ['ethernet', 'modbus-tcp'] },
      optional: true,
    });
  }
  return ts;
};

const links: InternalLink[] = [
  // ティーチングボックスの STOP スイッチ（TB 未接続時は内部で短絡。GWG はダミープラグ）。Conneko では機器の外のもので開く b 接点（safetyContact）として扱い、安全入力のループの接点に数える
  { from: 'S2', to: 'S1', switch: 'NC', safetyContact: true },
];

/** ゲートウェイユニットの機器定義を作る */
export function buildRconGateway(spec: RconGatewaySpec): DeviceDefinition {
  const params: ParamDef[] = [
    ...(spec.models ? [{ key: 'model', label: 'タイプ', options: spec.models.map((m) => ({ value: m.value, label: m.label })), default: spec.models[0].value }] : []),
    { key: 'io', label: 'フィールドネットワーク', options: spec.nets.map((n) => ({ value: n, label: RCON_NET_LABELS[n] })), default: spec.defaultNet },
    {
      key: 'ethernet',
      label: 'Ethernet オプション（前面）',
      options: [
        { value: 'none', label: 'なし' },
        { value: 'E', label: 'あり（Modbus/TCP）' },
      ],
      default: 'none',
    },
    cpLoadParam(
      [
        { value: 0.8, label: 'Ethernet なし（0.8A）' },
        { value: 1, label: 'Ethernet あり（1.0A）' },
      ],
      0.8,
    ),
  ];
  return {
    type: spec.type,
    name: spec.name,
    model: spec.prefix,
    maker: 'IAI',
    category: 'control',
    description: spec.description,
    labelPrefix: spec.labelPrefix,
    width: W,
    height: H,
    svg: svgOf(spec),
    terminals,
    links,
    safetyChannels: [stopLoop('STOP', '停止（STOP+ → STOP−）', 'STOP-')],
    params,
    bus: {
      kind: RCON_BUS,
      host: {},
      // ゲートウェイユニットが外部の DC24V から受け、連結したユニットへ配る電流の上限（総合カタログ「電流制限値」）
      supply: { CP: 9, MP: 37.5 },
      load: { CP: { param: 'cpLoad' } },
    },
  };
}
