/**
 * SMC 5 ポート電磁弁 SY シリーズ（DC24V、L 形プラグコネクタ・リード線 300mm、表示灯・サージ電圧保護回路付き「Z」）の機器定義を作る。
 * 横から見た白い弁本体の端にパイロット弁（ソレノイド）があり、上の L 形プラグから赤（+）・黒（−）のリード線が出る姿を描く。
 * ダブルソレノイドは両端にパイロット弁があり、左が A 側、右が B 側。
 *
 * 出典: SMC SY シリーズ カタログ（static.smc.eu の SY.pdf / SY3000.pdf）
 *   型式: SY + サイズ + 1（2 位置シングル）/ 2（2 位置ダブル）+ 20 + 5（DC24V）+ L（L 形プラグ）+ Z（表示灯・サージ電圧保護回路付き）
 *   消費電力: DC 0.35W、表示灯付き 0.4W（省電力回路付き T は 0.1W）。許容電圧変動 ±10%
 *   極性（p.1-4-204）: S・Z タイプは極性あり（逆接続保護ダイオード付き）。リード線は赤が +、黒が −。U・R タイプは無極性
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { text } from './parts';

export interface SySpec {
  type: string;
  model: string;
  /** 1: シングルソレノイド、2: ダブルソレノイド */
  solenoids: 1 | 2;
  /** サイズ（3: SY3000、5: SY5000） */
  size: 3 | 5;
}

const H = 120;
const BODY_Y = 30;
const BODY_H = 36;
const PILOT_W = 30;
/** 0.4W / 24V */
const COIL_CURRENT = 0.017;

/** パイロット弁と L 形プラグ。x はパイロット弁の左端。返り値の端子はリード線の先 */
function pilot(x: number, side: 'A' | 'B' | '', leadX: [number, number]) {
  const cx = x + PILOT_W / 2;
  const wire = (from: number, to: number, color: string, edge: string) => {
    const d = `M${from} 24 C${from} 50 ${to} 70 ${to} 104`;
    return `<path d="${d}" fill="none" stroke="${edge}" stroke-width="3.2" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>`;
  };
  return `
  <!-- リード線（パイロット弁の裏を通って下へ） -->
  ${wire(cx - 3, leadX[0], '#d6302c', '#871a17')}
  ${wire(cx + 3, leadX[1], '#1d1d1d', '#000')}
  <!-- パイロット弁${side ? `（${side} 側）` : ''} -->
  <rect x="${x}" y="${BODY_Y - 2}" width="${PILOT_W}" height="${BODY_H + 4}" rx="2" fill="url(#pilot-{{uid}})" stroke="#2a2c2f" stroke-width="0.7"/>
  <circle cx="${cx}" cy="${BODY_Y + BODY_H - 7}" r="3.2" fill="#d9dcdf" stroke="#555" stroke-width="0.5"/>
  <path d="M${cx - 2} ${BODY_Y + BODY_H - 7} H${cx + 2}" stroke="#555" stroke-width="0.8"/>
  ${side ? text(cx, BODY_Y + 14, side, 7, '#f2f2f2') : ''}
  <!-- L 形プラグ（表示灯付き） -->
  <rect x="${x + 3}" y="10" width="${PILOT_W - 6}" height="${BODY_Y - 10}" rx="2" fill="#2b2c2e" stroke="#0e0e0f" stroke-width="0.6"/>
  <rect x="${x + 6}" y="13" width="7" height="5" rx="1" fill="#ff4a3d" opacity="0.9"/>
  ${text(x + PILOT_W - 8, 19, '−+', 4.2, '#d0d0d0', 'normal')}
  ${[leadX[0], leadX[1]].map((lx) => `<rect x="${lx - 1.6}" y="104" width="3.2" height="10" rx="0.6" fill="#d9dcdf" stroke="#7d8287" stroke-width="0.4"/>`).join('')}
  ${text(leadX[0] - 5, 106, '赤', 3.6, '#333')}
  ${text(leadX[1] + 5, 106, '黒', 3.6, '#333')}`;
}

export function buildSy(s: SySpec): DeviceDefinition {
  const double = s.solenoids === 2;
  const bodyW = s.size === 3 ? 70 : 84;
  const W = bodyW + PILOT_W * s.solenoids + 16;
  const bodyX = 8 + (double ? PILOT_W : 0);
  const pilots: { x: number; side: 'A' | 'B' | ''; leads: [number, number] }[] = double
    ? [
        { x: 8, side: 'A', leads: [10, 26] },
        { x: bodyX + bodyW, side: 'B', leads: [W - 26, W - 10] },
      ]
    : [{ x: bodyX + bodyW, side: '', leads: [W - 30, W - 12] }];

  const ports = [
    { x: bodyX + bodyW * 0.36, label: '4(A)' },
    { x: bodyX + bodyW * 0.64, label: '2(B)' },
  ];
  const svg = `
  <defs>
    <linearGradient id="valve-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.5" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#c9cdd1"/>
    </linearGradient>
    <linearGradient id="pilot-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595e"/>
      <stop offset="0.5" stop-color="#36393c"/>
      <stop offset="1" stop-color="#1f2123"/>
    </linearGradient>
  </defs>
  <!-- 弁本体（白い樹脂） -->
  <rect x="${bodyX}" y="${BODY_Y}" width="${bodyW}" height="${BODY_H}" rx="2" fill="url(#valve-{{uid}})" stroke="#8a9096" stroke-width="0.8"/>
  ${ports
    .map(
      (p) => `<rect x="${p.x - 6}" y="${BODY_Y - 6}" width="12" height="7" rx="1" fill="#9aa0a6" stroke="#5c6166" stroke-width="0.5"/>
  <circle cx="${p.x}" cy="${BODY_Y - 5}" r="3" fill="#3a3c3f"/>
  ${text(p.x, BODY_Y + 9, p.label, 4.2, '#333', 'normal')}`,
    )
    .join('')}
  ${text(bodyX + bodyW / 2, BODY_Y + 22, 'SMC', 6, '#1f5fa8')}
  ${text(bodyX + bodyW / 2, BODY_Y + 30, s.model, 4, '#333', 'normal')}
  ${pilots.map((p) => pilot(p.x, p.side, p.leads)).join('')}
`;

  const acc = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4, conductors: [c] });
  const terminals: TerminalDef[] = pilots.flatMap((p) => {
    const pre = p.side;
    const what = p.side ? `ソレノイド ${p.side} 側` : 'ソレノイド';
    return [
      { id: `${pre}+`, label: `${pre}+`, note: `${what}（赤 +）`, x: p.leads[0], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: acc('+') },
      { id: `${pre}-`, label: `${pre}−`, note: `${what}（黒 −）`, x: p.leads[1], y: 114, side: 'bottom' as const, role: 'input' as const, accepts: acc('-') },
    ];
  });

  return {
    type: s.type,
    name: double ? '電磁弁（ダブルソレノイド）' : '電磁弁（シングルソレノイド）',
    model: s.model,
    maker: 'SMC',
    category: 'load',
    description:
      `SMC の 5 ポート電磁弁 SY${s.size}000 シリーズ（2 位置${double ? 'ダブル' : 'シングル'}、DC24V、L 形プラグコネクタ・リード線 300mm、表示灯・サージ電圧保護回路付き）。` +
      `消費電力 0.4W（表示灯込み、約 17mA）、許容電圧変動 ±10%。極性あり: 赤（+）を PLC の出力・リレー接点の側、黒（−）を 0V につなぐ。` +
      (double
        ? 'A 側・B 側のどちらかに通電すると位置が切り換わり、通電をやめてもその位置を保つ（A と B を同時に通電しない）。'
        : '通電中だけ切り換わり、通電をやめるとばねで元の位置に戻る。'),
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals,
    loadCurrent: COIL_CURRENT,
    schematic: { elements: pilots.map((p) => ({ kind: 'coil' as const, terminals: [`${p.side}+`, `${p.side}-`] })) },
  };
}
