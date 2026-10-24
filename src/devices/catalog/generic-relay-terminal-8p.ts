import type { DeviceDefinition, InternalLink, InternalLoad, TerminalDef } from '../types';
import { SCREW_GRADIENT, screw, sideShade, text } from '../generic/parts';

/**
 * リレーターミナル 8 点（汎用品、DC24V コイル、1a 接点、プラスコモン）。
 * PLC のトランジスタ出力（シンク）で小形リレーを 8 個動かし、接点（各リレー独立の COM・NO）で負荷を開閉する中継用の機器。
 * 上段: COM+（コイルの共通 +24V）と IN1〜IN8（各リレーのコイルの −。PLC の出力へ）、下段: 各リレーの C（接点の共通）と A（a 接点）。
 * 1 台に別々に動く 8 個のリレーがあるので、コイルを internalLoads、接点を actor で結びつける（短絡の検査はリレーごとに動作させる）。
 * 定格は汎用品の代表的な値（コイル DC24V 約 10mA、接点 AC250V / DC30V 3A）。
 */

const N = 8;
const PITCH = 26;
const X0 = 30;
const W = X0 + N * PITCH + 10;
const H = 132;
const TOP_Y = 16;
const BOT_Y = 116;
const cx = (i: number) => X0 + PITCH * i + PITCH / 2;

const coil = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };

const relay = (i: number) => {
  const x = X0 + PITCH * i;
  return `
  <rect x="${x + 2}" y="32" width="${PITCH - 4}" height="62" rx="2" fill="url(#relay-{{uid}})" stroke="#2d4f86" stroke-width="0.6"/>
  <rect x="${x + 5}" y="38" width="${PITCH - 10}" height="10" rx="1" fill="#e9eef7" stroke="#7d93b8" stroke-width="0.4"/>
  ${text(x + PITCH / 2, 45.5, `K${i + 1}`, 6, '#1f3763')}
  <circle cx="${x + PITCH / 2}" cy="56" r="2.2" fill="#c33" stroke="#7a1414" stroke-width="0.4"/>
  ${text(x + PITCH / 2, 88, `${i + 1}`, 7, '#fff')}
  ${screw(cx(i), TOP_Y, 4)}
  ${screw(cx(i) - 6, BOT_Y, 3.6)}
  ${screw(cx(i) + 6, BOT_Y, 3.6)}
  ${text(cx(i) - 6, BOT_Y + 11, `C${i + 1}`, 4.2, '#ddd')}
  ${text(cx(i) + 6, BOT_Y + 11, `A${i + 1}`, 4.2, '#ddd')}
  ${text(cx(i), TOP_Y + 11.5, `IN${i + 1}`, 4.2, '#ddd')}`;
};

const svg = `
  <defs>
    ${SCREW_GRADIENT}
    ${sideShade('base', '#3b3e43', '#55595f')}
    <linearGradient id="relay-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4c78c4"/>
      <stop offset="1" stop-color="#2e5aa4"/>
    </linearGradient>
  </defs>
  <rect x="0" y="2" width="${W}" height="${H - 4}" rx="3" fill="url(#base-{{uid}})" stroke="#26282b" stroke-width="0.8"/>
  <rect x="4" y="4" width="${W - 8}" height="24" rx="1.5" fill="#2a2c30"/>
  <rect x="4" y="${BOT_Y - 12}" width="${W - 8}" height="26" rx="1.5" fill="#2a2c30"/>
  ${screw(15, TOP_Y, 4)}
  ${text(15, TOP_Y + 11.5, 'COM+', 4.2, '#f0b4b4')}
  ${Array.from({ length: N }, (_, i) => relay(i)).join('')}
  ${text(16, 64, 'RELAY', 5.2, '#ddd')}
  ${text(16, 71, '8CH', 5.2, '#ddd')}
  ${text(16, 80, 'DC24V', 4.2, '#bbb', 'normal')}
`;

const terminals: TerminalDef[] = [
  { id: 'COM+', label: 'COM+', hint: 'コイル +24V', note: 'コイルの共通（+24V）。8 個のリレーのコイルの + 側', x: 15, y: TOP_Y, side: 'top', role: 'input', accepts: { ...coil, conductors: ['+'] } },
  ...Array.from({ length: N }, (_, i): TerminalDef => ({
    id: `IN${i + 1}`,
    label: `IN${i + 1}`,
    hint: `K${i + 1} コイル−`,
    note: `リレー K${i + 1} のコイルの −（PLC のシンク出力へ。ON で 0V になるとリレーが動作する）`,
    x: cx(i),
    y: TOP_Y,
    side: 'top',
    role: 'input',
    accepts: { ...coil, conductors: ['-'] },
    optional: true,
  })),
  ...Array.from({ length: N }, (_, i): TerminalDef[] => [
    { id: `C${i + 1}`, label: `C${i + 1}`, hint: `K${i + 1} 共通`, note: `リレー K${i + 1} の接点の共通（COM）`, x: cx(i) - 6, y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
    { id: `A${i + 1}`, label: `A${i + 1}`, hint: `K${i + 1} a 接点`, note: `リレー K${i + 1} の a 接点（NO）。コイルが動作すると C${i + 1} と閉じる`, x: cx(i) + 6, y: BOT_Y, side: 'bottom', role: 'signal', optional: true },
  ]).flat(),
];

const internalLoads: InternalLoad[] = Array.from({ length: N }, (_, i) => ({ id: `K${i + 1}`, label: `リレー K${i + 1}`, terminals: ['COM+', `IN${i + 1}`] as [string, string] }));

const links: InternalLink[] = Array.from({ length: N }, (_, i) => ({ from: `C${i + 1}`, to: `A${i + 1}`, switch: 'NO' as const, actor: `K${i + 1}`, ratedCurrent: 3 }));

const def: DeviceDefinition = {
  type: 'generic.relay-terminal.8p',
  name: 'リレーターミナル',
  model: 'リレーターミナル 8 点 DC24V 1a',
  category: 'control',
  description:
    'PLC のトランジスタ出力（シンク）で 8 個の小形リレーを動かす中継用の機器（汎用品、DIN レール取付）。COM+ に +24V を入れ、IN1〜IN8 を PLC の出力につなぐと、出力が ON のリレーが動作して C と A（a 接点）が閉じる。' +
    '接点は各リレー独立で、AC250V / DC30V 3A（代表値）。PLC の出力より大きな負荷・AC の負荷を開閉するのに使う。',
  estimated: '端子の並び・定格は汎用品の代表的な値（特定の製品のものではない）。',
  labelPrefix: 'RT',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  internalLoads,
  // コイル 8 個（1 個 約 10mA）
  loadCurrent: 0.08,
};

export default def;
