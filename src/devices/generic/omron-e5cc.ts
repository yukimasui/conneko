/**
 * オムロン 温度調節器 E5CC（48 × 48mm、ねじ端子、マルチ入力、補助出力 2 点、オプションなし）の機器定義を作る。
 *
 * 上に正面（表示部とキー）、下に背面の端子台（裏から見た並び）を描く（1mm ≒ 2px）。
 * 端子台は 3 列 × 6 段で、左の列が 1〜6、右の列が 7〜12、中の列 13〜18 はオプション用（オプションなしの -800 では使わない）。
 * 左の列の電線は左へ、右の列の電線は右へ出す。
 *
 * 出典: オムロン E5CC/E5EC ユーザーズマニュアル H174（2-2-1 E5CC Terminal Block Wiring Example。端子の記号 A〜R を
 *   現行品の端子番号 1〜18 として読む: A〜F = 1〜6、G〜L = 7〜12、M〜R = 13〜18）:
 *   制御出力 1: 1-2（RX: リレー a 接点 AC250V 3A（抵抗負荷）、QX: SSR 駆動用の電圧出力 1(+)・2(−) DC12V 21mA）。3 は使わない（QQ・CX 形の制御出力 2）
 *   センサ入力: 熱電対 5(−)・6(+)、測温抵抗体 4(A)・5(B)・6(B)、電流 4(+)・5(−)、電圧 5(−)・6(+)。出荷時は K 熱電対
 *   補助出力（2 点の形）: 補助出力 2 が 7-8、補助出力 1 が 9-10（a 接点 AC250V 3A）
 *   電源: 11-12。A 形 AC100〜240V 50/60Hz（5.2VA 以下）、D 形 AC24V / DC24V（極性なし、3.1VA / 1.6W 以下）
 * 推定: 電源電圧の許容範囲（定格の 85〜110%）。マニュアルの該当ページを確かめられなかった（オムロンの温度調節器で一般的な値）。
 */
import type { AcceptSpec, DeviceDefinition, InternalLink, TerminalDef } from '../types';
import { SCREW_GRADIENT, screw, text } from './parts';

export type E5ccOutput = 'relay' | 'voltage';

const W = 124;
const H = 222;
const FX = 14;
const FY = 4;
const COL = { left: 34, mid: 62, right: 90 };
const ROW0 = 130;
const PITCH = 15;
const rowY = (i: number) => ROW0 + i * PITCH;

const AC100: AcceptSpec = { system: 'AC', minVoltage: 85, maxVoltage: 264 };
const ACDC24: AcceptSpec[] = [
  { system: 'AC', minVoltage: 20.4, maxVoltage: 26.4 },
  { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4 },
];

/** 7 セグメント風の数字（表示の雰囲気だけ） */
const lcd = (x: number, y: number, s: string, size: number, fill: string) =>
  `<text x="${x}" y="${y}" text-anchor="end" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${fill}" letter-spacing="1">${s}</text>`;

const front = () => `
  <rect x="${FX + 1}" y="${FY + 1.6}" width="96" height="96" rx="3" fill="#000" opacity="0.25"/>
  <rect x="${FX}" y="${FY}" width="96" height="96" rx="3" fill="url(#bezel-{{uid}})" stroke="#050505" stroke-width="0.8"/>
  <rect x="${FX + 6}" y="${FY + 8}" width="84" height="54" rx="2" fill="#0d0e10" stroke="#2c2e31" stroke-width="0.6"/>
  ${text(FX + 10, FY + 16, 'PV', 3.4, '#9aa0a6', 'normal', 'start')}
  ${lcd(FX + 86, FY + 36, '25.0', 20, '#f4f4f4')}
  ${text(FX + 10, FY + 47, 'SV', 3.4, '#9aa0a6', 'normal', 'start')}
  ${lcd(FX + 86, FY + 58, '100.0', 13, '#3ad45a')}
  <circle cx="${FX + 13}" cy="${FY + 25}" r="1.4" fill="#ff8a1e"/>
  ${text(FX + 13, FY + 31, 'OUT', 2.8, '#cfd3d6', 'normal')}
  ${text(FX + 10, FY + 72, 'OMRON', 4.4, '#d9dcdf', 'bold', 'start')}
  ${text(FX + 86, FY + 72, 'E5CC', 4.8, '#d9dcdf', 'bold', 'end')}
  ${[0, 1, 2, 3]
    .map((i) => {
      const x = FX + 15 + i * 22;
      const label = ['□', 'M', '▼', '▲'][i];
      return `<rect x="${x - 8}" y="${FY + 78}" width="16" height="11" rx="2" fill="#3a3c40" stroke="#111" stroke-width="0.5"/>${text(x, FY + 86, label, 5, '#e6e6e6', 'normal')}`;
    })
    .join('')}`;

/** 背面の端子台。used: 使う端子の番号 */
const rear = (used: Set<number>) => {
  const cells: string[] = [];
  const cols: [number, number][] = [
    [COL.left, 1],
    [COL.mid, 13],
    [COL.right, 7],
  ];
  for (const [x, first] of cols) {
    for (let i = 0; i < 6; i++) {
      const n = first + i;
      const y = rowY(i);
      if (!used.has(n)) {
        // 使わない端子（灰色。番号だけ書く）
        cells.push(`<rect x="${x - 6}" y="${y - 6}" width="12" height="12" rx="1" fill="#55575b"/>${text(x, y + 1.6, String(n), 4, '#a9acb0', 'normal')}`);
        continue;
      }
      cells.push(screw(x, y, 4.4, '#0b0b0c'));
      const dx = x === COL.right ? -10 : 10;
      cells.push(text(x + dx, y + 1.8, String(n), 4.4, '#f2f2f2', 'bold', x === COL.right ? 'end' : 'start'));
    }
  }
  return `
  ${text(W / 2, ROW0 - 15, '背面の端子（裏から見た並び）', 4, '#555', 'normal')}
  <rect x="${COL.left - 12}" y="${ROW0 - 10}" width="${COL.right - COL.left + 24}" height="${5 * PITCH + 20}" rx="2.5" fill="#1d1e20" stroke="#000" stroke-width="0.7"/>
  ${cells.join('')}`;
};

export function buildE5cc(output: E5ccOutput): DeviceDefinition {
  const relay = output === 'relay';
  const model = relay ? 'E5CC-RX2ASM-800' : 'E5CC-QX2DSM-800';
  const power = relay ? AC100 : ACDC24;
  const powerNote = relay ? 'AC100〜240V 50/60Hz' : 'AC24V / DC24V（極性なし）';
  const used = new Set([1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  const svg = `
  <defs>
    <linearGradient id="bezel-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a4d51"/>
      <stop offset="0.5" stop-color="#232427"/>
      <stop offset="1" stop-color="#121314"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  ${front()}
  ${text(W / 2, FY + 106, model, 4.4, '#333', 'normal')}
  ${rear(used)}`;

  const L = (n: number, side: 'left' | 'right' = n <= 6 ? 'left' : 'right') => ({
    x: n <= 6 ? COL.left : COL.right,
    y: rowY(n <= 6 ? n - 1 : n - 7),
    side,
  });
  const contact = (n: number, note: string, hint: string): TerminalDef => ({ id: String(n), label: String(n), note, hint, ...L(n), role: 'signal', optional: true });

  const out1: TerminalDef[] = relay
    ? [
        contact(1, '制御出力 1（リレー a 接点 1-2、AC250V 3A（抵抗負荷））。ヒーターの電磁接触器のコイルなどを開閉する', '制御出力1'),
        contact(2, '制御出力 1（リレー a 接点 1-2、AC250V 3A（抵抗負荷））', '制御出力1'),
      ]
    : [
        {
          id: '1',
          label: '1',
          note: '制御出力 1 +（SSR 駆動用の電圧出力 DC12V 21mA。SSR の入力 + へ）',
          hint: '制御出力+',
          ...L(1),
          role: 'supply',
          supply: { system: 'DC', voltage: 12, conductor: '+', limitCurrent: 0.021 },
        },
        {
          id: '2',
          label: '2',
          note: '制御出力 1 −（SSR 駆動用の電圧出力の 0V。SSR の入力 − へ）',
          hint: '制御出力−',
          ...L(2),
          role: 'supply',
          supply: { system: 'DC', voltage: 12, conductor: '-', limitCurrent: 0.021 },
        },
      ];

  const terminals: TerminalDef[] = [
    ...out1,
    { id: '4', label: '4', note: 'センサ入力（測温抵抗体の A、電流入力の +。熱電対では使わない）', hint: 'Pt A', ...L(4), role: 'signal', optional: true },
    { id: '5', label: '5', note: 'センサ入力（熱電対の −、測温抵抗体の B、電流・電圧入力の −）', hint: 'TC−・Pt B', ...L(5), role: 'signal' },
    { id: '6', label: '6', note: 'センサ入力（熱電対の +、測温抵抗体の B、電圧入力の +）', hint: 'TC+・Pt B', ...L(6), role: 'signal' },
    contact(7, '補助出力 2（リレー a 接点 7-8、AC250V 3A。警報など）', '補助出力2'),
    contact(8, '補助出力 2（リレー a 接点 7-8）', '補助出力2'),
    contact(9, '補助出力 1（リレー a 接点 9-10、AC250V 3A。警報など）', '補助出力1'),
    contact(10, '補助出力 1（リレー a 接点 9-10）', '補助出力1'),
    { id: '11', label: '11', note: `電源（${powerNote}）`, hint: '電源', ...L(11), role: 'input', accepts: power },
    { id: '12', label: '12', note: `電源（${powerNote}）`, hint: '電源', ...L(12), role: 'input', accepts: power },
  ];

  const links: InternalLink[] = [
    ...(relay ? [{ from: '1', to: '2', switch: 'NO' as const, ratedCurrent: 3 }] : []),
    { from: '9', to: '10', switch: 'NO', ratedCurrent: 3 },
    { from: '7', to: '8', switch: 'NO', ratedCurrent: 3 },
  ];

  return {
    type: `omron.${model.toLowerCase()}`,
    name: relay ? '温度調節器（リレー出力）' : '温度調節器（電圧出力）',
    model,
    maker: 'オムロン',
    category: 'control',
    description:
      `オムロンの温度調節器 E5CC（48 × 48mm、ねじ端子、マルチ入力（熱電対・測温抵抗体・電流・電圧）、補助出力 2 点、電源 ${powerNote}）。` +
      (relay
        ? '制御出力 1 はリレーの a 接点（1-2、AC250V 3A）で、ヒーターを開閉する電磁接触器のコイルなどにつなぐ。'
        : '制御出力 1 は SSR 駆動用の電圧出力（1(+)・2(−)、DC12V 21mA）で、SSR の入力に直接つなぐ。') +
      'センサは熱電対なら 5(−)・6(+)、測温抵抗体（Pt100）なら 4(A)・5(B)・6(B)（出荷時の設定は K 熱電対）。' +
      '補助出力 1（9-10）・補助出力 2（7-8）はリレーの a 接点（AC250V 3A）で、警報などに使う。電源は 11-12。3 と 13〜18（オプション用）は使わない。',
    labelPrefix: 'TIC',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    // A 形 5.2VA（AC100V で約 52mA）、D 形 1.6W（DC24V で約 67mA）
    loadCurrent: relay ? 0.052 : 0.067,
    estimated: '電源電圧の許容範囲（定格の 85〜110%）は推定',
  };
}
