/**
 * IAI の小型ポジショナー PCON / ACON / DCON の CYB・PLB・POB タイプ（スリムな 1 軸コントローラー）の共通の作り。
 *
 * 出典: IAI 総合カタログ CJ9005「PCON-CYB/PLB/POB」「ACON/DCON-CYB/PLB/POB」（型式項目・基本仕様・I/O 信号・I/O 仕様・外形寸法図・各部名称）、
 *       取扱説明書 MJ0353「PCON-CYB/PLB/POB」・MJ0354「ACON/DCON-CYB/PLB/POB」（2.3 配線方法）。
 *
 * 外観: W28 × H80 × D69mm（ねじ固定）。正面パネル（PCON は緑、ACON は紺、DCON はえんじ）の上から SV/ALM の LED、
 * PIO コネクター（20 極、モレックス 51353）、SIO コネクター、電源コネクター（緑 5 極、SPT1.5/5-H-3.5）。
 * モーター・エンコーダーコネクターは本体の下面にある。AUTO/MANU のスイッチはない（ティーチングツールで切り替える）。
 *
 * 電源コネクター（上から BK・MP・CP・0V・EMG-）: 1 EMG-（非常停止ステータス入力。+24V で解除）、2 0V、3 CP（制御電源 24V）、
 *   4 MP（モーター駆動電源）、5 BK（ブレーキ強制解除の電源 DC24V 150mA）。MP を CP と別に供給すると、モーター電源だけを外部で遮断できる。
 * PIO（20 極）: 1〜4 パルス列入力（PLB/POB のみ。/PP・PP・/NP・NP）、5〜12 入力 IN0〜IN7、13〜20 出力 OUT0〜OUT7。
 *   I/O 用の電源はコントローラーの電源（CP・0V）と共通（非絶縁）で、PIO コネクターに +24V・0V のピンはない。
 *   NPN 仕様の入力は CP（+24V）へ内部でプルアップされたプラスコモン、出力は 0V へ引き込む NPN（50mA/点）。PNP 仕様は逆。
 */
import type { DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';
import { DC24_MINUS, DC24_PLUS, iaiDefs, iaiLogo, led, miniDin, MM, n2, plugV, screw, text } from './parts';
import { PIO_OUT_RATED } from './pio';

export interface CybSpec {
  type: string;
  series: 'PCON' | 'ACON' | 'DCON';
  name: string;
  description: string;
  panel: [string, string];
  motorKind: string;
  loadOptions: { value: number; label: string }[];
  loadDefault: number;
}

const W = 28 * MM;
const H = 84 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

const POWER_IDS = ['BK', 'MP', 'CP', '0V', 'EMG-'];
const power = plugV({ x: X(9), y: Y(45), ids: POWER_IDS, pitch: 3.5 * MM, w: 7.5 * MM, wire: 'left', labels: Object.fromEntries(POWER_IDS.map((id) => [id, id])), labelSize: 2.6 });
const PIO = { x: X(13), y: Y(20) };
const SIO = { x: X(13), y: Y(36.5) };
const MOT = { x: X(14), y: Y(82.5) };

/** PIO パターン 0〜6（ポジショナー / 電磁弁タイプ CYB）の入出力の信号（総合カタログ「PCON-CYB の I/O 信号」） */
const CYB_IN: string[][] = [
  ['PC1', 'PC2', 'PC4', 'PC8', 'HOME', '*STP', 'CSTR', 'RES'],
  ['ST0', 'ST1', 'ST2', 'ST3', 'ST4', 'ST5', 'ST6', 'RES'],
  ['ST0', 'ST1(JOG+)', 'ST2', '－', 'SON', '－', '－', 'RES'],
  ['ST0', '－', 'ASTR', '－', 'SON', '*STP', '－', 'RES'],
  ['ST0', 'ST1', '－', '－', 'SON', '*STP', '－', 'RES'],
  ['ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択'],
  ['－', '－', '－', '－', '－', '－', '－', '－'],
];
const CYB_OUT: string[][] = [
  ['PM1(ALM1)', 'PM2(ALM2)', 'PM4(ALM4)', 'PM8(ALM8)', 'HEND', 'PZONE/ZONE1', 'PEND', '*ALM'],
  ['PE0', 'PE1', 'PE2', 'PE3', 'PE4', 'PE5', 'PE6', '*ALM'],
  ['LS0', 'LS1(TRQS)', 'LS2', 'HEND', 'SV', 'PZONE/ZONE1', '*ALML', '*ALM'],
  ['LS0/PE0', 'LS1/PE1', 'PSFL', 'HEND', 'SV', 'PZONE/ZONE1', '*ALML', '*ALM'],
  ['LS0/PE0', 'LS1/PE1', 'PSFL', 'HEND', 'SV', 'PZONE/ZONE1', '*ALML', '*ALM'],
  ['ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択', 'ユーザー選択'],
  ['－', '－', '－', '－', '－', '－', '－', '－'],
];
/** パルス列制御タイプ（PLB/POB）の入出力（パターン 0 / 1） */
const PL_IN = ['SON', 'RES', 'HOME', 'TL', 'CSTP', 'DCLR', 'BKRL', 'RSTR'];
const PL_OUT = ['PWR', 'SV', 'INP', 'HEND', 'TLR', 'ZONE1', '*ALML/REND', '*ALM'];

const typeOf = (p: ParamValues) => String(p.model ?? 'CYB') as 'CYB' | 'PLB' | 'POB';
const pnp = (p: ParamValues) => String(p.io ?? 'NP') === 'PN';
const patternOf = (p: ParamValues) => Math.max(0, Math.min(6, Number(p.pattern ?? 0) || 0));

function pins(p: ParamValues): PinDef[] {
  const t = typeOf(p);
  const pulse = t !== 'CYB';
  const pat = patternOf(p);
  const common = pnp(p) ? '0V' : 'CP';
  const ps: PinDef[] = [];
  const pulseNames = ['/PP', 'PP', '/NP', 'NP'];
  for (let i = 0; i < 4; i++) {
    const id = `PIO#${i + 1}`;
    if (!pulse) ps.push({ id, label: `－（${i + 1}）`, role: 'signal', optional: true, note: 'CYB タイプでは未使用' });
    else if (t === 'PLB') ps.push({ id, label: `${pulseNames[i]}（${i + 1}）`, role: 'signal', signal: { dir: 'in', kind: 'line-driver' }, optional: true, note: '差動（ラインドライバー）パルス列入力' });
    else ps.push({ id, label: `${pulseNames[i]}（${i + 1}）`, role: 'signal', signal: { dir: 'in', kind: 'dc', commonPolarity: '+' }, optional: true, note: 'オープンコレクターのパルス列入力（最大 60kpps）' });
  }
  for (let i = 0; i < 8; i++) {
    const f = pulse ? PL_IN[i] : CYB_IN[pat][i];
    ps.push({
      id: `PIO#${5 + i}`,
      label: `IN${i}${f && f !== '－' ? ` ${f}` : ''}（${5 + i}）`,
      role: 'signal',
      signal: { dir: 'in', kind: 'dc', common },
      optional: true,
      note: pnp(p) ? '入力（PNP 仕様: +24V を加えると ON。コモンは電源コネクターの 0V）' : '入力（NPN 仕様: 0V に引き込むと ON。コモンは電源コネクターの CP）',
    });
  }
  for (let i = 0; i < 8; i++) {
    const f = pulse ? PL_OUT[i] : CYB_OUT[pat][i];
    ps.push({
      id: `PIO#${13 + i}`,
      label: `OUT${i}${f && f !== '－' ? ` ${f}` : ''}（${13 + i}）`,
      role: 'signal',
      signal: { dir: 'out', kind: pnp(p) ? 'pnp' : 'npn' },
      optional: true,
      note: pnp(p) ? 'PNP 出力（ON で CP の +24V を出す。50mA）' : 'NPN 出力（ON で 0V に引き込む。50mA）',
    });
  }
  return ps;
}

function links(p: ParamValues): InternalLink[] {
  const ref = pnp(p) ? 'CP' : '0V';
  return Array.from({ length: 8 }, (_, i) => ({ from: `PIO#${13 + i}`, to: ref, switch: 'output' as const, ratedCurrent: PIO_OUT_RATED }));
}

export function buildCybSeries(s: CybSpec): DeviceDefinition {
  const svg = (p: ParamValues) => {
    const t = typeOf(p);
    const lbl = (x: number, y: number, str: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.3) => text(x, y, str, size, '#e9eef0', anchor);
    return `
  ${iaiDefs(s.panel)}
  <!-- 取付け部（左）と本体 -->
  <rect x="0.5" y="${Y(2)}" width="${n2(W - 1)}" height="${Y(80)}" rx="2" fill="url(#iaibody-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  <rect x="${X(4)}" y="${Y(3.5)}" width="${X(22.5)}" height="${Y(77)}" rx="1.5" fill="url(#iaipanel-{{uid}})" stroke="#0e1716" stroke-width="0.6"/>
  ${screw(X(2.2), Y(5.5), 2.4)}${screw(X(2.2), Y(76), 2.4)}
  ${iaiLogo(X(11), Y(9), 5.6)}
  ${led(X(22), Y(6.5), 'g', 2.6, 2)}${led(X(22), Y(9.5), 'off', 2.6, 2)}${lbl(X(19.8), Y(7.2), 'SV', 'end', 1.9)}${lbl(X(19.8), Y(10.2), 'ALM', 'end', 1.9)}
  <!-- PIO（20 極） -->
  <rect x="${X(8.5)}" y="${Y(11.5)}" width="${X(9)}" height="${X(17)}" rx="0.8" fill="url(#iaiblack-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${Array.from({ length: 10 }, (_, i) => `<rect x="${X(10.3)}" y="${n2(Y(13) + i * 2.8)}" width="2.2" height="1.8" fill="#c9a43a"/><rect x="${X(13.5)}" y="${n2(Y(13) + i * 2.8)}" width="2.2" height="1.8" fill="#c9a43a"/>`).join('')}
  ${lbl(X(19), Y(20.5), 'PIO')}${lbl(X(19), Y(24), t, 'start', 2)}${lbl(X(19), Y(27), pnp(p) ? 'PNP' : 'NPN', 'start', 2)}
  <!-- SIO -->
  <rect x="${X(8)}" y="${Y(31.5)}" width="${X(10)}" height="${X(10)}" rx="1" fill="#141518"/>${miniDin(SIO.x, SIO.y, 5.6)}${lbl(X(19.5), Y(37.2), 'SIO')}
  <!-- 電源 -->
  ${power.svg}
  ${text(X(15), Y(73), `<tspan font-size="4.4" font-style="italic">${s.series[0]}</tspan>${s.series.slice(1)}`, 2.8, '#ffffff', 'middle', 'bold')}
  ${lbl(X(15), Y(76.5), t, 'middle', 2)}
  <!-- 下面のモーター・エンコーダーコネクター（見えている端） -->
  <rect x="${X(9)}" y="${Y(81)}" width="${X(10)}" height="${X(2.8)}" rx="0.5" fill="url(#iaiwhite-{{uid}})" stroke="#8a8f94" stroke-width="0.4"/>`;
  };

  const terminals = (): TerminalDef[] => {
    const at = (id: string) => ({ x: power.pos[id].x, y: power.pos[id].y, side: power.pos[id].side });
    return [
      { id: 'PIO', label: 'PIO（20 極）', note: 'PIO コネクター（モレックス 51353-2000 の 20 極）。CYB は PIO ケーブル CB-PAD-PIO、PLB/POB はシールド付き CB-PAD-PIOS でつなぐ', x: PIO.x, y: PIO.y, side: 'left', role: 'connector', connector: { kind: 'IAI-PIO20', pins: 20, width: 34, length: 18, facing: 'front' }, optional: true },
      { id: 'SIO', label: 'SIO', note: 'ティーチングツール・ゲートウェイの接続用', x: SIO.x, y: SIO.y, side: 'left', role: 'connector', connector: { kind: 'MINIDIN8', pins: 0, width: 16, length: 14, facing: 'front', protocols: ['iai-sio'] }, optional: true },
      { id: 'MPG', label: 'モーター・エンコーダー（下面）', note: 'アクチュエーターのモーター・エンコーダー一体ケーブル', x: MOT.x, y: MOT.y, side: 'bottom', role: 'connector', connector: { kind: s.motorKind, pins: 0, width: 20, length: 10, required: true }, optional: true },
      { ...at('BK'), id: 'BK', label: 'BK', note: 'ブレーキ強制解除の電源入力（DC24V 150mA。+24V で解除）', role: 'input', accepts: DC24_PLUS, optional: true },
      { ...at('MP'), id: 'MP', label: 'MP', note: 'モーター駆動電源 +24V（制御電源と同じ電源から、または外部の遮断回路を通して供給）', role: 'input', accepts: DC24_PLUS },
      { ...at('CP'), id: 'CP', label: 'CP', note: '制御電源 +24V（DC24V ±10%）。PIO の入力のプラスコモンを兼ねる', role: 'input', accepts: DC24_PLUS },
      { ...at('0V'), id: '0V', label: '0V', note: '電源 0V（PIO の NPN 出力の基準を兼ねる）', role: 'input', accepts: DC24_MINUS },
      { ...at('EMG-'), id: 'EMG-', label: 'EMG-', note: '非常停止ステータス入力（+24V を加えると非常停止解除。DC24V 10mA 以下）', role: 'input', accepts: DC24_PLUS, function: 'safety-input' },
    ];
  };

  return {
    type: s.type,
    name: s.name,
    model: `${s.series}-CYB/PLB/POB`,
    maker: 'IAI',
    category: 'control',
    description: s.description,
    labelPrefix: s.series,
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
    params: [
      {
        key: 'model',
        label: 'タイプ',
        options: [
          { value: 'CYB', label: 'CYB: ポジショナー / 電磁弁タイプ（64 点）' },
          { value: 'PLB', label: 'PLB: パルス列制御タイプ（差動）' },
          { value: 'POB', label: 'POB: パルス列制御タイプ（オープンコレクター）' },
        ],
        default: 'CYB',
      },
      {
        key: 'io',
        label: 'I/O 種類',
        options: [
          { value: 'NP', label: 'NP: NPN 仕様' },
          { value: 'PN', label: 'PN: PNP 仕様' },
        ],
        default: 'NP',
      },
      {
        key: 'pattern',
        label: 'PIO パターン（パラメーター No.25、CYB）',
        options: [
          { value: 0, label: '0: 位置決めモード（16 点）' },
          { value: 1, label: '1: 電磁弁モード1（7 点）' },
          { value: 2, label: '2: 電磁弁モード2（3 点）' },
          { value: 3, label: '3: シングルソレノイドモード（2 点）' },
          { value: 4, label: '4: ダブルソレノイドモード（2 点）' },
          { value: 5, label: '5: ユーザー選択モード' },
          { value: 6, label: '6: シリアル通信モード' },
        ],
        default: 0,
      },
      { key: 'loadCurrent', label: 'モーター（負荷電流）', unit: 'A', options: s.loadOptions, default: s.loadDefault },
    ],
    loadCurrent: { param: 'loadCurrent' },
  };
}
