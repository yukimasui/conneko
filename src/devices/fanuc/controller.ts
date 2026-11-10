/**
 * ファナックのロボットコントローラー（R-30iB Compact Plus・R-30iB Mate Plus）の端子・ピン・正面の絵を作る共通部品。
 *
 * R-30iB Mini Plus（src/devices/catalog/fanuc-r-30ib-mini-plus.ts）と同じ考え方で、周辺機器 I/O（CRMA15・CRMA16、MIL 50 極）、
 * ロボット接続 RM1・RP1（ロボット I/O を含む）、ティーチングペンダント（iPendant）の TP、Ethernet CD38A、安全信号 EES・EAS を持つ。
 * 周辺機器 I/O のピンの並びは src/devices/fanuc/peripheral-io.ts（R-30iB Mate のメインボードの資料からの推定を含む）。
 *
 * 見た目は 2 通り:
 * - 'compact': 薄い横長の箱（R-30iB Compact Plus）。正面に電源スイッチ・LED・USB・通風口
 * - 'mate': 箱形のキャビネット（R-30iB Mate Plus）。正面に回転操作のブレーカー
 * どちらも、上に安全信号、左に電源入力、右に周辺機器 I/O と Ethernet、下にロボット接続と TP のコネクターをまとめた
 * （配線の見やすさを優先した配置で、実機の配置とは異なる）。
 */
import { controllerDefs, headerFront, lanPort, plugBottom, roundPlugBottom, screw } from '../generic/robot-art';
import { safetyGroups, safetyTerminalSpecs, type RobotSafetyLoop } from '../generic/robot-safety';
import type { AcceptSpec, ConnectorSpec, InternalLink, PinDef, SafetyChannelGroup, TerminalDef } from '../types';
import { fanucLogo, IPENDANT_KIND, n2, rm1Connector, rp1Connector, text } from './parts';
import { controllerRp1, CRMA15_ROWS, CRMA16_ROWS, crmaIo } from './peripheral-io';

export interface FanucControllerStyle {
  /** id の接頭辞 */
  p: string;
  look: 'compact' | 'mate';
  /** 正面の型式の文字（SVG の text の中身） */
  title: string;
  /** コントローラー側のロボット接続コネクターの種類 */
  ctrl: { rm1: string; rp1: string };
  /** 適合ロボットの名前（端子の説明） */
  robots: string;
  /** 電源入力の受電条件と説明 */
  ac: AcceptSpec;
  acNote: string;
}

export interface FanucControllerParts {
  width: number;
  height: number;
  svg: string;
  terminals: TerminalDef[];
  pins: PinDef[];
  links: InternalLink[];
  safetyChannels: SafetyChannelGroup[];
  distinctGroups: string[][];
}

const LOOPS: RobotSafetyLoop[] = [
  { id: 'EES', name: '外部非常停止', hint: '非常停止', channels: [['EES1', 'EES11'], ['EES2', 'EES21']], action: '非常停止', contact: '非常停止スイッチの b 接点' },
  { id: 'EAS', name: '安全柵', hint: '安全柵', channels: [['EAS1', 'EAS11'], ['EAS2', 'EAS21']], action: 'AUTO モードなら停止', contact: '安全柵のドアスイッチの b 接点' },
];
const SAFETY_IDS = LOOPS.flatMap((l) => l.channels.flat());

export function fanucController(s: FanucControllerStyle): FanucControllerParts {
  const { p } = s;
  const compact = s.look === 'compact';
  const W = compact ? 384 : 364;
  const H = compact ? 206 : 250;
  const BODY = compact ? { x: 6, y: 36, w: 372, h: 150 } : { x: 6, y: 34, w: 352, h: 206 };
  const BOTTOM_Y = BODY.y + BODY.h;
  const safetyX = (i: number) => (compact ? 176 : 164) + i * 18 + (i >= 4 ? 8 : 0);
  const SAFETY_Y = 18;
  const POWER_X = 13;
  const powerY = compact ? [100, 116, 132] : [150, 166, 182];
  const POWER = [
    { id: 'L', y: powerY[0] },
    { id: 'N', y: powerY[1] },
    { id: 'PE', y: powerY[2] },
  ];
  const IO_X = BODY.x + BODY.w - 22;
  const CRMA_W = compact ? 44 : 60;
  const CRMA_L = 18;
  const IO1_Y = compact ? BODY.y + 32 : BODY.y + 50;
  const IO2_Y = compact ? BODY.y + 86 : BODY.y + 120;
  const LAN_Y = BOTTOM_Y - (compact ? 22 : 26);
  const X_TP = 62;
  const X_RM1 = compact ? 186 : 176;
  const X_RP1 = X_RM1 + 46;

  const face = compact
    ? `
  <!-- 本体（薄い箱。上面の板金と、黒い正面） -->
  <path d="M${BODY.x + 10} ${BODY.y - 9} H${BODY.x + BODY.w - 10} L${BODY.x + BODY.w} ${BODY.y} H${BODY.x} Z" fill="url(#${p}-top-{{uid}})" stroke="#0f1012" stroke-width="0.8"/>
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="4" fill="url(#${p}-body-{{uid}})" stroke="#0f1012" stroke-width="1"/>
  ${fanucLogo(30, BODY.y + 14, 50, 11)}
  ${text(88, BODY.y + 24, s.title, 8.4, '#f1f2f4', 'start', 'bold')}
  ${text(30, BODY.y + 38, 'ROBOT CONTROLLER', 5, '#b9bdc2', 'start')}
  <!-- 電源スイッチ・LED・USB -->
  <rect x="34" y="${BODY.y + 48}" width="24" height="34" rx="2" fill="#c7cbcf" stroke="#6c7176" stroke-width="0.6"/>
  <rect x="39" y="${BODY.y + 53}" width="14" height="20" rx="2" fill="#1d1f22"/>
  <rect x="41" y="${BODY.y + 55}" width="10" height="8" rx="1.2" fill="#f6c400"/>
  ${text(46, BODY.y + 79.5, 'POWER', 3.8, '#222', 'middle', 'bold')}
  <circle cx="72" cy="${BODY.y + 54}" r="2.4" fill="#36d04a" stroke="#0d3a13" stroke-width="0.5"/>${text(78, BODY.y + 56, 'POWER', 4.4, '#d6d9dc', 'start')}
  <circle cx="72" cy="${BODY.y + 65}" r="2.4" fill="#5a2620" stroke="#2a0e0b" stroke-width="0.5"/>${text(78, BODY.y + 67, 'ALARM', 4.4, '#d6d9dc', 'start')}
  <rect x="68" y="${BODY.y + 74}" width="16" height="7" rx="1" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="71" y="${BODY.y + 76}" width="10" height="2.4" fill="#5b88d6"/>${text(88, BODY.y + 80, 'USB', 4.4, '#d6d9dc', 'start')}
  <!-- 通風口 -->
  ${Array.from({ length: 7 }, (_, i) => `<rect x="150" y="${n2(BODY.y + 32 + i * 9)}" width="164" height="3.4" rx="1.6" fill="#121417" opacity="0.9"/>`).join('')}`
    : `
  <!-- 本体（濃いグレーのキャビネット） -->
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="6" fill="url(#${p}-body-{{uid}})" stroke="#0f1012" stroke-width="1"/>
  <rect x="${BODY.x + 6}" y="${BODY.y + 22}" width="${BODY.w - 52}" height="${BODY.h - 62}" rx="3" fill="url(#${p}-front-{{uid}})" stroke="#555a61" stroke-width="0.6"/>
  ${fanucLogo(20, BODY.y + 32, 58, 13)}
  ${text(20, BODY.y + 62, s.title, 9, '#f1f2f4', 'start', 'bold')}
  ${text(20, BODY.y + 72, 'ROBOT CONTROLLER', 5.2, '#b9bdc2', 'start')}
  <!-- ブレーカー（回転操作ハンドル） -->
  <rect x="40" y="${BODY.y + 82}" width="48" height="48" rx="3" fill="#c7cbcf" stroke="#6c7176" stroke-width="0.7"/>
  <circle cx="64" cy="${BODY.y + 106}" r="16" fill="url(#${p}-knob-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <rect x="51" y="${BODY.y + 102}" width="26" height="8" rx="3" fill="#25282c" stroke="#5c6066" stroke-width="0.6" transform="rotate(-35 64 ${BODY.y + 106})"/>
  ${text(44, BODY.y + 90, 'OFF', 5, '#222', 'start', 'bold')}
  ${text(84, BODY.y + 90, 'ON', 5, '#222', 'end', 'bold')}
  ${text(64, BODY.y + 140, 'BREAKER', 5, '#c9cdd1', 'middle', 'bold')}
  <circle cx="104" cy="${BODY.y + 92}" r="2.6" fill="#36d04a" stroke="#0d3a13" stroke-width="0.5"/>${text(110, BODY.y + 94, 'POWER', 4.8, '#d6d9dc', 'start')}
  <circle cx="104" cy="${BODY.y + 104}" r="2.6" fill="#5a2620" stroke="#2a0e0b" stroke-width="0.5"/>${text(110, BODY.y + 106, 'ALARM', 4.8, '#d6d9dc', 'start')}
  <rect x="100" y="${BODY.y + 116}" width="16" height="7" rx="1" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="103" y="${BODY.y + 118}" width="10" height="2.4" fill="#5b88d6"/>${text(120, BODY.y + 122, 'USB', 4.8, '#d6d9dc', 'start')}
  ${Array.from({ length: 13 }, (_, i) => `<rect x="150" y="${n2(BODY.y + 32 + i * 9.5)}" width="140" height="3.4" rx="1.6" fill="#16181b" opacity="0.85"/>`).join('')}`;

  const svg = `
  <defs>
    <linearGradient id="${p}-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4f56"/>
      <stop offset="0.08" stop-color="#3a3e44"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
    <linearGradient id="${p}-front-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#30343a"/>
      <stop offset="0.5" stop-color="#383c42"/>
      <stop offset="1" stop-color="#2d3136"/>
    </linearGradient>
    <linearGradient id="${p}-top-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6a6f76"/>
      <stop offset="1" stop-color="#43474d"/>
    </linearGradient>
    <radialGradient id="${p}-knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#5b5f65"/>
      <stop offset="1" stop-color="#16181b"/>
    </radialGradient>
    ${controllerDefs(p)}
  </defs>

  <!-- 脚 -->
  ${[24, W - 40].map((x) => `<rect x="${x}" y="${BOTTOM_Y - 2}" width="16" height="9" rx="1.5" fill="#15171a"/>`).join('')}
  ${face}

  <!-- 安全信号の端子台（外部非常停止 EES・安全柵 EAS） -->
  <rect x="${safetyX(0) - 11}" y="7" width="${safetyX(7) - safetyX(0) + 22}" height="24" rx="2" fill="url(#${p}-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  <line x1="${safetyX(4) - 13}" y1="9" x2="${safetyX(4) - 13}" y2="29" stroke="#6e6a5e" stroke-width="0.8"/>
  ${SAFETY_IDS.map((id, i) => `${screw(p, safetyX(i), SAFETY_Y, 4.3)}${text(safetyX(i), 28.5, id, 3.4, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${LOOPS.map((l, k) => text((safetyX(k * 4) + safetyX(k * 4 + 3)) / 2, BODY.y + 10, l.name, 4.8, '#e9ebed', 'middle', 'bold')).join('')}

  <!-- 電源入力（単相） -->
  <rect x="${POWER_X - 7}" y="${powerY[0] - 12}" width="22" height="54" rx="2" fill="url(#${p}-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  ${POWER.map((q) => `${screw(p, POWER_X, q.y, 4.3)}${text(POWER_X + 9.5, q.y + 2, q.id === 'PE' ? '⏚' : q.id, 5.2, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${text(10, powerY[0] - 16, 'AC IN', 4.8, '#e9ebed', 'start', 'bold')}

  <!-- 周辺機器 I/O（CRMA15・CRMA16）と Ethernet（CD38A） -->
  <rect x="${IO_X - 22}" y="${BODY.y + 4}" width="40" height="${BODY.h - 8}" rx="2" fill="#2a2d32" stroke="#555a61" stroke-width="0.6"/>
  ${headerFront(IO_X, IO1_Y, CRMA_W, CRMA_L, 25, 'CRMA15')}
  ${headerFront(IO_X, IO2_Y, CRMA_W, CRMA_L, 25, 'CRMA16')}
  ${lanPort(IO_X, LAN_Y, 'CD38A')}

  <!-- 下: ティーチングペンダント（TP）・ロボット接続（RM1・RP1） -->
  ${roundPlugBottom(p, X_TP, BOTTOM_Y, 'TP')}
  ${plugBottom(p, X_RM1, BOTTOM_Y, 32, 'RM1')}
  ${plugBottom(p, X_RP1, BOTTOM_Y, 26, 'RP1')}`;

  const SAFETY_SPEC = safetyTerminalSpecs(LOOPS);
  const crma: ConnectorSpec = { kind: 'MIL50', pins: 50, width: CRMA_W, length: CRMA_L, facing: 'front' };
  const terminals: TerminalDef[] = [
    ...SAFETY_IDS.map((id, i): TerminalDef => ({ id, label: id, x: safetyX(i), y: SAFETY_Y, side: 'top', role: 'signal', ...SAFETY_SPEC[id] })),
    ...POWER.map((q): TerminalDef =>
      q.id === 'PE'
        ? { id: 'PE', label: '⏚ PE（保護接地）', x: POWER_X, y: q.y, side: 'left', role: 'ground' }
        : { id: q.id, label: `${q.id}（${s.acNote}）`, note: `電源入力（${s.acNote}、50/60Hz）`, x: POWER_X, y: q.y, side: 'left', role: 'input', accepts: s.ac },
    ),
    {
      id: 'CRMA15',
      label: 'CRMA15（周辺機器 I/O 1、50 極）',
      hint: '周辺I/O 1',
      note: 'DI101〜DI120・DO101〜DO110・24F・0V・SDICOM・DOSRC。MIL 50 極のフラットケーブルで変換端子台へ',
      x: IO_X,
      y: IO1_Y,
      side: 'right',
      role: 'connector',
      connector: crma,
    },
    {
      id: 'CRMA16',
      label: 'CRMA16（周辺機器 I/O 2、50 極）',
      hint: '周辺I/O 2',
      note: 'UOP 入力（*IMSTP・*HOLD・*SFSPD・CSTOPI・FAULT RESET・START・HOME・ENBL）・UOP 出力（CMDENBL・FAULT・BATALM・BUSY）・DO111〜DO120',
      x: IO_X,
      y: IO2_Y,
      side: 'right',
      role: 'connector',
      connector: crma,
    },
    {
      id: 'CD38A',
      label: 'CD38A（Ethernet）',
      hint: 'Ethernet',
      note: '100BASE-TX。パソコン（ROBOGUIDE など）や PLC（EtherNet/IP はソフトウェアオプション）とつなぐ',
      x: IO_X,
      y: LAN_Y,
      side: 'right',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'ethernet-ip'] },
    },
    {
      id: 'TP',
      label: 'TP（ティーチングペンダント）',
      hint: 'iPendant',
      note: 'ティーチングペンダント iPendant のケーブルをつなぐ。ペンダントの非常停止ボタン・イネーブルスイッチもこのケーブルを通る',
      x: X_TP,
      y: BOTTOM_Y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: IPENDANT_KIND, pins: 0, width: 12, style: 'lan' },
    },
    {
      id: 'RM1',
      label: 'RM1（ロボット接続 モーター動力・ブレーキ）',
      hint: '動力 RM1',
      note: `ロボットの RM1 へ、ロボット接続ケーブル（RM1）でつなぐ。適合ロボット: ${s.robots}`,
      x: X_RM1,
      y: BOTTOM_Y,
      side: 'bottom',
      role: 'connector',
      connector: rm1Connector(s.ctrl.rm1),
    },
    {
      id: 'RP1',
      label: 'RP1（ロボット接続 パルスコーダ・ロボット I/O）',
      hint: '信号 RP1',
      note: 'ロボットの RP1 へ、ロボット接続ケーブル（RP1）でつなぐ。ロボット I/O（RI1〜RI8・RO1〜RO8）とその電源もここを通る',
      x: X_RP1,
      y: BOTTOM_Y,
      side: 'bottom',
      role: 'connector',
      connector: rp1Connector(s.ctrl.rp1),
    },
  ];
  const io15 = crmaIo('CRMA15', CRMA15_ROWS);
  const io16 = crmaIo('CRMA16', CRMA16_ROWS);
  const rp1 = controllerRp1('RP1');
  return {
    width: W,
    height: H,
    svg,
    terminals,
    pins: [...io15.pins, ...io16.pins, ...rp1.pins],
    links: [...io15.links, ...io16.links, ...rp1.links],
    safetyChannels: safetyGroups(LOOPS),
    distinctGroups: [['L', 'N']],
  };
}
