/**
 * IAI ポジショナー PCON-CB / CFB・ACON-CB・DCON-CB（CB 系）の共通の作り。
 *
 * 外観（総合カタログ CJ9005「PCON-CB/CFB」「ACON-CB/DCON-CB」の製品写真・外形寸法図・各部名称より）:
 * - 幅 35mm、高さ 178.5mm（ねじ固定、上下の取付けタブ込み）、奥行 69.6mm。CFB は上にファンユニットが付き高さ 190mm。
 * - 側面は明るいグレー、正面パネルは PCON が深緑、ACON が紺、DCON がえんじで、白い印字。
 * - 正面の上から: IAI ロゴ、PIO コネクター（ヒロセ HIF6-40PA-1.27DS、40 極）またはフィールドネットワークのコネクター、
 *   SV/ALM・STS0〜3 の LED、軸番号設定スイッチ（ADRS）、MANU/AUTO スイッチ、SIO コネクター（ミニ DIN 8 ピン）、
 *   モーター・エンコーダーコネクター（MPG、白）、BK RLS/NOM スイッチ、電源コネクター（緑、MC1.5/8-G3.5、8 極）。
 *
 * 電源コネクター（取扱説明書 MJ0342「3.3.1 電源コネクターの配線」より。ピン 8 が上、1 が下）:
 *   8 BK（ブレーキ強制解除の電源入力 DC24V）、7 S1・6 S2（ティーチングボックスの非常停止スイッチ信号）、
 *   5 MPI・4 MPO（モーター駆動電源ライン。MPO は制御電源から内部で出ている。通常は MPI-MPO 間を短絡し、
 *   安全カテゴリー対応では間に接触器などの接点を入れて外部で遮断する）、3 24V・2 0V（制御電源 DC24V ±10%）、
 *   1 EMG-（非常停止ステータス入力。+24V を加えると非常停止解除。DC24V 10mA 以下）
 *
 * PIO（40 極）のピンは pio.ts の positionerPio40。I/O 種類（NP/PN/PLN/PLP/フィールドネットワーク）は params.io で選ぶ。
 */
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, PinDef, TerminalDef } from '../types';
import { fieldbusBlock, ioOf, ioTypeParam, isPio, NETWORK_NAMES, polarityOf, POSITIONER_IO_TYPES } from './fieldbus';
import {
  DC24_MINUS,
  DC24_PLUS,
  fins,
  groundMark,
  hif6Connector,
  hif6HeaderV,
  iaiDefs,
  iaiLogo,
  led,
  miniDin,
  MM,
  mountTab,
  n2,
  plugV,
  rotarySwitch,
  slideSwitch,
  smallBlackConnector,
  text,
  whiteConnectorV,
} from './parts';
import { patternOf, PIO_PATTERN_PARAM, pioLinks, pioPins, positionerPio40 } from './pio';

export interface CbSeriesSpec {
  type: string;
  /** シリーズ名（'PCON'・'ACON'・'DCON'） */
  series: 'PCON' | 'ACON' | 'DCON';
  /** タイプ（'CB' / 'CFB'） */
  variant: 'CB' | 'CFB';
  name: string;
  description: string;
  /** 正面パネルの色（中央・端） */
  panel: [string, string];
  /** モーター・エンコーダーコネクターの種類（connector.kind） */
  motorKind: string;
  /** 対応アクチュエーター（表示用） */
  actuators: string;
  /** モーターの選択肢（負荷電流[A]） */
  motorParam: ParamDef;
  /** パターン 0〜5 の OUT15 の信号名 */
  out15: string;
}

/** 本体の寸法（px） */
const W = 35 * MM;
const MAIN_H = 178.5 * MM;

/** 電源コネクターの端子（上から） */
const POWER_IDS = ['BK', 'S1', 'S2', 'MPI', 'MPO', '24V', '0V', 'EMG-'];

export function buildCbSeries(s: CbSeriesSpec): DeviceDefinition {
  const top = s.variant === 'CFB' ? 11.5 * MM : 0;
  const H = n2(MAIN_H + top);
  /** 本体（上下のタブを除く）の上端・下端 */
  const bodyTop = top + 8 * MM;
  const bodyBottom = top + MAIN_H - 7 * MM;
  const y = (mm: number) => n2(top + mm * MM);

  /** PIO コネクター・フィールドネットワークの位置 */
  const PIO = { x: 15 * MM, y: y(31) };
  const FB_AREA = { x: 5 * MM, y: y(11.5), w: 21 * MM, h: 36 * MM };
  const power = plugV({
    x: 14 * MM,
    y: y(130.5),
    ids: POWER_IDS,
    pitch: 3.5 * MM,
    w: 7.5 * MM,
    labels: Object.fromEntries(POWER_IDS.map((id) => [id, id])),
    labelSize: 3,
  });
  const SIO = { x: 14 * MM, y: y(84) };
  const MPG = { x: 13.5 * MM, y: y(94), w: 8 * MM, h: 26 * MM };
  const FG = { x: 30 * MM, y: y(164) };

  const svg = (p: ParamValues) => {
    const io = ioOf(p);
    const pio = isPio(io);
    const cg = String(p.model ?? 'CB').includes('G');
    const modelName = `${s.series}-${cg ? s.variant.replace('C', 'CG') : s.variant}`;
    const fb = pio ? undefined : fieldbusBlock(io, FB_AREA, 'left');
    return `
  ${iaiDefs(s.panel)}
  ${
    s.variant === 'CFB'
      ? `<!-- ファンユニット -->
  <rect x="3" y="2" width="${W - 6}" height="${n2(top + 9 * MM)}" rx="2" fill="#2a2c30" stroke="#0b0b0c" stroke-width="0.8"/>
  <circle cx="${W / 2}" cy="${n2(top / 2 + 6)}" r="${n2(top / 2 - 1)}" fill="url(#iaifan-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M${W / 2} ${n2(top / 2 + 6)} l${n2(Math.cos((a * Math.PI) / 180) * (top / 2 - 3))} ${n2(Math.sin((a * Math.PI) / 180) * (top / 2 - 3))}" stroke="#55585d" stroke-width="2.4" stroke-linecap="round"/>`).join('')}
  <circle cx="${W / 2}" cy="${n2(top / 2 + 6)}" r="3.4" fill="#1b1c1f" stroke="#55585d" stroke-width="0.5"/>
  <rect x="${W / 2 - 8}" y="${n2(top + 1)}" width="16" height="4" rx="1" fill="#3b3e43"/>`
      : mountTab(W / 2, 0, 16 * MM, 9 * MM, true)
  }
  ${mountTab(W / 2, n2(top + MAIN_H - 9 * MM), 16 * MM, 9 * MM, false)}
  <!-- 本体（側面のグレーが縁に見える）と正面パネル -->
  <rect x="0.5" y="${n2(bodyTop - 2)}" width="${W - 1}" height="${n2(bodyBottom - bodyTop + 4)}" rx="2.4" fill="url(#iaibody-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  <rect x="3" y="${n2(bodyTop)}" width="${W - 6}" height="${n2(bodyBottom - bodyTop)}" rx="1.6" fill="url(#iaipanel-{{uid}})" stroke="#0e1716" stroke-width="0.6"/>
  ${iaiLogo(W / 2 - 4, y(12.4), 7.4)}
  ${
    pio
      ? `${hif6HeaderV(PIO.x, PIO.y, 40)}
  ${led(25 * MM, y(17.5), 'g')}${text(28.2 * MM, y(17.1), 'SV', 2.2, '#e9eef0', 'start')}${text(28.2 * MM, y(18.6), 'ALM', 2.2, '#e9eef0', 'start')}
  ${text(26.5 * MM, y(25), 'I/O', 2.6, '#e9eef0')}
  <rect x="${23.3 * MM}" y="${y(26.2)}" width="${6.4 * MM}" height="${3.2 * MM}" rx="0.4" fill="#f4f4ef" stroke="#c9ccc4" stroke-width="0.4"/>
  ${text(26.5 * MM, y(28.6), polarityOf(io) === 'pnp' ? 'PNP' : 'NPN', 2.8, '#1a1a1a', 'middle', 'bold')}
  ${io === 'PLN' || io === 'PLP' ? text(26.5 * MM, y(35.2), 'PULSE', 2.2, '#e9eef0') : ''}`
      : `${fb!.svg}
  ${led(29.5 * MM, y(13.5), 'g')}${text(29.5 * MM, y(16.6), 'SV', 2, '#e9eef0')}`
  }
  ${text(25 * MM, y(43), 'STS', 2.4, '#e9eef0')}
  ${[3, 2, 1, 0].map((nb, i) => `${led(25 * MM, y(45.5 + i * 2.6), 'off', 2.6, 1.8)}${text(27.2 * MM, y(46.1 + i * 2.6), String(nb), 2.2, '#e9eef0', 'start')}`).join('')}
  ${rotarySwitch(17 * MM, y(62.5), 4.2)}
  ${text(25.5 * MM, y(63.4), 'ADRS', 2.6, '#e9eef0', 'start')}
  ${slideSwitch(17 * MM, y(70.5))}
  ${text(10.5 * MM, y(70.2), 'MANU', 2.4, '#e9eef0', 'end')}${text(23.5 * MM, y(70.2), 'AUTO', 2.4, '#e9eef0', 'start')}
  <!-- SIO -->
  <rect x="${8 * MM}" y="${y(77.5)}" width="${12.5 * MM}" height="${13 * MM}" rx="1.4" fill="#141518" stroke="#000" stroke-width="0.5"/>
  ${miniDin(SIO.x, SIO.y, 6.6)}
  <path d="M${4.5 * MM} ${SIO.y} h7 l-2 -2 M${4.5 * MM + 7} ${SIO.y} l-2 2" stroke="#e9eef0" stroke-width="0.8" fill="none"/>
  ${text(23 * MM, y(84.8), 'SIO', 2.6, '#e9eef0', 'start')}
  <!-- モーター・エンコーダー -->
  ${whiteConnectorV(MPG.x, MPG.y, MPG.w, MPG.h, 12)}
  ${text(25 * MM, y(108), 'MPG', 2.6, '#e9eef0', 'start')}
  ${s.series !== 'DCON' && s.variant === 'CB' ? `${text(5.5 * MM, y(103.5), 'ABS', 2.2, '#e9eef0')}${[0, 1, 2].map((i) => led(5.5 * MM, y(106 + i * 2.6), 'off', 2.4, 1.6)).join('')}` : ''}
  ${slideSwitch(17.5 * MM, y(124.5), 8, 4.6)}
  ${text(11.5 * MM, y(122.2), 'BK RLS', 2.3, '#e9eef0', 'end')}${text(23 * MM, y(125.4), 'NOM', 2.4, '#e9eef0', 'start')}
  <!-- 電源コネクター -->
  ${power.svg}
  ${s.series !== 'DCON' && s.variant === 'CB' ? `${smallBlackConnector(6.5 * MM, y(156), 4.4 * MM, 5 * MM)}${text(5 * MM, y(154.6), 'BAT', 2.2, '#e9eef0')}` : ''}
  <!-- 型式（ロゴ） -->
  ${text(W / 2 - 2, y(167.2), `<tspan font-size="5.6" font-style="italic">${modelName[0]}</tspan>${modelName.slice(1).replace('-', '·')}`, 3.6, '#ffffff', 'middle', 'bold')}
  ${!pio ? text(W / 2, y(149.5), '', 2) : ''}
  ${groundMark(FG.x - 5, FG.y + 0.5)}
  <!-- 側面の放熱フィン（奥行方向。正面から見える縁） -->
  ${fins(W - 2.4, bodyTop + 30, 1.6, 30, 1, '#7d8287')}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const io = ioOf(p);
    const ts: TerminalDef[] = [];
    if (isPio(io)) {
      ts.push({
        id: 'PIO',
        label: 'PIO（40極 HIF6）',
        note: 'PIO コネクター（ヒロセ HIF6-40PA-1.27DS）。付属の PIO ケーブル CB-PAC-PIO（片側バラ線）で PLC などへつなぐ',
        x: PIO.x,
        y: PIO.y,
        side: 'left',
        role: 'connector',
        connector: hif6Connector(40),
        optional: true,
      });
    } else {
      ts.push(...fieldbusBlock(io, FB_AREA, 'left').terminals);
    }
    ts.push({
      id: 'SIO',
      label: 'SIO（ミニ DIN 8 ピン）',
      note: 'ティーチングボックス・パソコン（RS-485）・ゲートウェイの接続用',
      x: SIO.x,
      y: SIO.y,
      side: 'left',
      role: 'connector',
      connector: { kind: 'MINIDIN8', pins: 0, width: 16, length: 14, facing: 'front', protocols: ['iai-sio'] },
      optional: true,
    });
    ts.push({
      id: 'MPG',
      label: 'MPG（モーター・エンコーダー）',
      note: `アクチュエーター（${s.actuators}）のモーター・エンコーダー一体ケーブルをつなぐ`,
      x: n2(MPG.x + MPG.w / 2),
      y: n2(MPG.y + MPG.h / 2),
      side: 'left',
      role: 'connector',
      connector: { kind: s.motorKind, pins: 0, width: MPG.h, length: 14, facing: 'front' },
      optional: true,
    });
    const pw = power.pos;
    const at = (id: string) => ({ id, x: pw[id].x, y: pw[id].y, side: pw[id].side });
    ts.push(
      { ...at('BK'), label: 'BK', note: 'ブレーキ強制解除の電源入力（+24V を加えるとブレーキを解除。0V は制御電源と共通）', role: 'input', accepts: DC24_PLUS, optional: true },
      { ...at('S1'), label: 'S1', note: 'ティーチングボックスの非常停止スイッチ信号（S1-S2 間が TB の停止スイッチの b 接点）', role: 'signal', optional: true },
      { ...at('S2'), label: 'S2', note: 'ティーチングボックスの非常停止スイッチ信号', role: 'signal', optional: true },
      { ...at('MPI'), label: 'MPI', note: 'モーター駆動電源の入力。通常は MPO と短絡し、外部で遮断する場合は MPO との間に接触器の接点を入れる', role: 'input', accepts: DC24_PLUS },
      { ...at('MPO'), label: 'MPO', note: 'モーター駆動電源の出力（制御電源 24V から内部で出ている）', role: 'signal', optional: true },
      { ...at('24V'), label: '24V', note: '制御・モーター電源 DC24V ±10%', role: 'input', accepts: DC24_PLUS },
      { ...at('0V'), label: '0V', note: '電源 0V', role: 'input', accepts: DC24_MINUS },
      {
        ...at('EMG-'),
        label: 'EMG-',
        note: '非常停止ステータス入力（+24V を加えると非常停止解除、切ると非常停止。DC24V 10mA 以下）',
        role: 'input',
        accepts: DC24_PLUS,
        function: 'safety-input',
      },
      { id: 'FG', label: 'FG', note: 'フレームグラウンド（DIN レール取付け仕様の M3 ねじ。ねじ固定仕様は取付けねじで接地）', x: FG.x, y: FG.y, side: 'right', role: 'ground', optional: true },
    );
    return ts;
  };

  const pinsOf = (p: ParamValues): PinDef[] => {
    const io = ioOf(p);
    if (!isPio(io)) return [];
    return pioPins(positionerPio40('PIO', patternOf(p), s.out15), polarityOf(io));
  };

  const links = (p: ParamValues): InternalLink[] => {
    const io = ioOf(p);
    const ls: InternalLink[] = [
      // 制御電源の 24V から MPO へ内部でつながる（MPI-MPO を短絡するとモーター電源が入る）
      { from: '24V', to: 'MPO', directed: true },
      // ティーチングボックス未接続時は内部で S1-S2 を短絡（CGB はダミープラグ）。TB 接続時は TB の停止スイッチ（b 接点）
      { from: 'S1', to: 'S2', switch: 'NC' },
    ];
    if (isPio(io)) ls.push(...pioLinks(positionerPio40('PIO', patternOf(p), s.out15), polarityOf(io)));
    return ls;
  };

  return {
    type: s.type,
    name: s.name,
    model: `${s.series}-${s.variant}`,
    maker: 'IAI',
    category: 'control',
    description: s.description,
    labelPrefix: s.series,
    width: W,
    height: H,
    svg,
    terminals,
    pins: pinsOf,
    links,
    params: [
      {
        key: 'model',
        label: 'タイプ',
        options: [
          { value: 'CB', label: `${s.series}-${s.variant}（標準）` },
          { value: 'CGB', label: `${s.series}-${s.variant.replace('C', 'CG')}（安全カテゴリー対応）` },
        ],
        default: 'CB',
      },
      ioTypeParam(POSITIONER_IO_TYPES),
      PIO_PATTERN_PARAM,
      s.motorParam,
    ],
    loadCurrent: { param: 'loadCurrent' },
  };
}

/** フィールドネットワーク名（説明文用） */
export const networkList = Object.values(NETWORK_NAMES).join('・');
