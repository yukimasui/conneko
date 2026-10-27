/**
 * 電源用サージ保護デバイス（SPD、クラス II。DIN レール取付のプラグイン形）の機器定義を作る（単相・三相）。
 * ベースに極ごとの保護モジュール（バリスタ）を差し込む形で、モジュールの正面に状態表示の窓（緑 = 正常、赤 = 劣化・交換）がある。
 * 各極の上側の端子を電路（L・N または L1〜L3）に、下側の PE 端子を接地につなぐ（電路に並列に入れる。直列には入れない）。
 * 1 極の幅 18mm・高さ 90mm（1mm = 2px）。
 *
 * 電気的には、電路から電力を受ける端子（input）として電圧を確かめる。消費電流はない。
 * SPD が短絡故障したときに切り離すため、上流に保護機器（ブレーカー・ヒューズ）が要る（ない場合は no-protection の警告）。
 */
import type { AcceptSpec, Conductor, DeviceDefinition } from '../types';
import { SCREW_GRADIENT } from './parts';
import { groundMark, screwTerminal, vShade } from './power-parts';

export interface SpdSpec {
  phases: 1 | 3;
  /** 極（モジュール）の端子名（左から） */
  lines: string[];
  /** 受電できる電圧の範囲（公称）[V] */
  minVoltage: number;
  maxVoltage: number;
  /** 最大連続使用電圧 Uc[V]（表示用） */
  uc: number;
}

const MOD_W = 36;
const H = 180;
const TY = 17;
const TY_PE = H - 17;

const module = (x0: number, name: string, uc: number) => {
  const cx = x0 + MOD_W / 2;
  return `
  <!-- 保護モジュール ${name} -->
  <rect x="${x0 + 3}" y="36" width="${MOD_W - 6}" height="${H - 76}" rx="3" fill="url(#mod-{{uid}})" stroke="#7d8288" stroke-width="0.8"/>
  <rect x="${x0 + 6}" y="40" width="${MOD_W - 12}" height="8" rx="1.5" fill="#d0d3d6" stroke="#9aa0a5" stroke-width="0.4"/>
  <text x="${cx}" y="46.3" text-anchor="middle" font-family="sans-serif" font-size="6" font-weight="bold" fill="#222">${name}</text>
  <!-- 状態表示の窓（緑 = 正常） -->
  <rect x="${x0 + 9}" y="54" width="${MOD_W - 18}" height="16" rx="2" fill="#1e2125"/>
  <rect x="${x0 + 10.5}" y="55.5" width="${MOD_W - 21}" height="13" rx="1.2" fill="url(#ok-{{uid}})"/>
  <!-- 図記号（バリスタ） -->
  <rect x="${cx - 4}" y="80" width="8" height="18" fill="none" stroke="#333" stroke-width="0.8"/>
  <path d="M${cx} 74 V80 M${cx} 98 V104 M${cx - 6} 96 L${cx - 3} 96 L${cx + 4} 82 L${cx + 7} 82" stroke="#333" stroke-width="0.7" fill="none"/>
  <text x="${cx}" y="116" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#333">Uc</text>
  <text x="${cx}" y="123" text-anchor="middle" font-family="sans-serif" font-size="4.6" font-weight="bold" fill="#333">${uc}V</text>
  <!-- 取り外しのつまみ -->
  <rect x="${x0 + 10}" y="${H - 48}" width="${MOD_W - 20}" height="5" rx="2" fill="#a2a7ad"/>`;
};

export function buildSpd(spec: SpdSpec): DeviceDefinition {
  const n = spec.lines.length;
  const W = MOD_W * n;
  const ph = spec.phases === 1 ? '単相' : '三相';
  const peX = W / 2;
  const accepts: AcceptSpec = {
    system: 'AC',
    minVoltage: spec.minVoltage,
    maxVoltage: spec.maxVoltage,
    conductors: ['R', 'S', 'T', 'L', 'N'] as Conductor[],
  };
  const svg = `
  <defs>
    <linearGradient id="base-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a5aab0"/>
      <stop offset="0.1" stop-color="#d7dadd"/>
      <stop offset="0.9" stop-color="#d3d6d9"/>
      <stop offset="1" stop-color="#a0a5ab"/>
    </linearGradient>
    ${vShade('mod', '#f2f3f4', '#d9dcdf')}
    ${vShade('ok', '#6fe08a', '#18a33d')}
    ${SCREW_GRADIENT}
  </defs>
  <!-- ベース -->
  <rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="2.5" fill="url(#base-{{uid}})" stroke="#7a7f85" stroke-width="1"/>
  ${spec.lines
    .map(
      (_, i) => `
  <rect x="${i * MOD_W + 3}" y="3" width="${MOD_W - 6}" height="28" rx="1.5" fill="#2f3236"/>
  ${screwTerminal(i * MOD_W + MOD_W / 2, TY, 5.4, '#1b1d20')}`,
    )
    .join('')}
  ${spec.lines.map((l, i) => module(i * MOD_W, l, spec.uc)).join('')}
  <!-- 接地（PE）端子 -->
  <rect x="3" y="${H - 34}" width="${W - 6}" height="31" rx="1.5" fill="#2f3236"/>
  <rect x="${peX - 11}" y="${H - 33}" width="22" height="5" rx="1" fill="#2a8a3e"/>
  ${screwTerminal(peX, TY_PE, 5.4, '#1b1d20')}
  ${groundMark(peX + 16, TY_PE - 5, 1, '#e6e8ea')}
  <text x="${W / 2}" y="${H - 4}" text-anchor="middle" font-family="sans-serif" font-size="4.5" font-weight="bold" fill="#e6e8ea">SPD ${ph}</text>
`;
  return {
    type: `generic.spd.${spec.phases}p`,
    name: `サージ保護デバイス（${ph}）`,
    model: `クラス II ${ph} Uc${spec.uc}V`,
    category: 'breaker',
    description:
      `電源ラインの雷サージ・開閉サージを接地へ逃がす${ph}のサージ保護デバイス（SPD、クラス II、プラグイン形）。` +
      '各極の上の端子を電路に、下の PE を接地につなぐ（電路に並列に入れる）。短絡故障に備えて上流にブレーカーまたはヒューズを入れる。正面の窓が赤になったらモジュールを交換する。',
    labelPrefix: 'SPD',
    width: W,
    height: H,
    svg,
    terminals: [
      ...spec.lines.map((l, i) => ({
        id: l,
        hint: `電路 ${l}`,
        note: `電路の ${l} につなぐ（並列）`,
        x: i * MOD_W + MOD_W / 2,
        y: TY,
        side: 'top' as const,
        role: 'input' as const,
        accepts,
      })),
      { id: 'PE', label: '⏚', hint: '接地', note: 'PE（接地）。できるだけ短く接地する', x: peX, y: TY_PE, side: 'bottom', role: 'ground' },
    ],
    distinctGroups: [spec.lines],
  };
}
