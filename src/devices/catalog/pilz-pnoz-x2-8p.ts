import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * Pilz 安全リレー PNOZ X2.8P（777301、24VAC/DC、ネジ式プラグイン端子台、安全出力 3a ＋ 補助 1b）。
 * 外形は 幅22.5 × 高さ94 × 奥行121mm（1mm ≒ 2px）。
 * Pilz の黄色い筐体の上下に、黒いプラグイン端子台が 2 段ずつ（外側 P1、内側 P2）付く。
 * 正面には pilz ロゴ・形式、LED（POWER・CH.1・CH.2）と接点の図記号が印刷されている。
 *
 * 端子配列（Pilz 技術カタログ 1002173-EN-06 の正面図）:
 *   上 P1: A1 13 23 33 / 上 P2: S52 S34 41 42 / 下 P2: S11 S12 S21 S22 / 下 P1: A2 14 24 34
 */

const W = 46;
const H = 190;

const XS = [8, 18, 28, 38];
const Y_TOP_P1 = 10;
const Y_TOP_P2 = 32;
const Y_BOT_P2 = 158;
const Y_BOT_P1 = 180;

const TOP_P1 = ['A1', '13', '23', '33'];
const TOP_P2 = ['S52', 'S34', '41', '42'];
const BOT_P2 = ['S11', 'S12', 'S21', 'S22'];
const BOT_P1 = ['A2', '14', '24', '34'];

const text = (x: number, y: number, t: string, size: number, fill = '#111', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 3.8) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

/** プラグイン端子台 1 段（黒いブロックにネジ 4 本） */
const block = (y: number, name: string, labelAbove: boolean, labels: string[]) => `
  <rect x="2" y="${y - 7.5}" width="${W - 4}" height="15" rx="1.5" fill="url(#plug-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${XS.map((x) => `<rect x="${x - 4.6}" y="${y - 6}" width="9.2" height="12" rx="1" fill="#111"/>${screw(x, y)}`).join('')}
  <rect x="2" y="${labelAbove ? y - 14 : y + 7.5}" width="${W - 4}" height="6.5" fill="#f4f4f2" stroke="#999" stroke-width="0.3"/>
  ${labels.map((l, i) => text(XS[i], labelAbove ? y - 9.2 : y + 12.3, l, 3.6)).join('')}
  ${text(W / 2, labelAbove ? y - 15.5 : y + 17.6, name, 2.8, '#6b5a00', 'middle', 'normal')}`;

const svg = `
  <defs>
    <linearGradient id="case-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e3b400"/>
      <stop offset="0.12" stop-color="#ffd21a"/>
      <stop offset="0.88" stop-color="#fbcd12"/>
      <stop offset="1" stop-color="#d9aa00"/>
    </linearGradient>
    <linearGradient id="plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3b3d"/>
      <stop offset="1" stop-color="#1a1b1c"/>
    </linearGradient>
    <radialGradient id="screw-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
  </defs>

  <!-- 黄色い筐体 -->
  <rect x="0.5" y="2" width="${W - 1}" height="${H - 4}" rx="2" fill="url(#case-{{uid}})" stroke="#8a6d00" stroke-width="0.8"/>

  <!-- 上側の端子台（外側 P1・内側 P2） -->
  ${block(Y_TOP_P1, '', false, TOP_P1)}
  ${block(Y_TOP_P2, 'P2', false, TOP_P2)}

  <!-- ロゴ・形式 -->
  <text x="4" y="58" font-family="sans-serif" font-size="10" font-weight="bold" fill="#111" letter-spacing="-0.3">pilz</text>
  ${text(4, 67, 'PNOZ X2.8P', 4.6, '#111', 'start', 'normal')}

  <!-- LED -->
  ${[
    ['POWER', true],
    ['CH.1', false],
    ['CH.2', false],
  ]
    .map(
      ([n, lit], i) => `
  <rect x="11" y="${78 + i * 9}" width="6" height="7" fill="${lit ? '#3ad65a' : '#5d6b3a'}" stroke="#111" stroke-width="0.6"/>
  ${text(19.5, 84 + i * 9, String(n), 4, '#111', 'start', 'normal')}`,
    )
    .join('')}

  <!-- 接点の図記号（13-14, 23-24, 33-34 は a 接点、41-42 は b 接点） -->
  ${text(8, 113, '13', 3.4, '#111', 'middle', 'normal')}${text(17.5, 113, '23', 3.4, '#111', 'middle', 'normal')}${text(27, 113, '33', 3.4, '#111', 'middle', 'normal')}${text(37.5, 113, '41', 3.4, '#111', 'middle', 'normal')}
  <path d="M8 115 V117.5 M8 122.5 V125 M5.8 117.5 L8 122.5 M17.5 115 V117.5 M17.5 122.5 V125 M15.3 117.5 L17.5 122.5 M27 115 V117.5 M27 122.5 V125 M24.8 117.5 L27 122.5 M37.5 115 V118 H39.5 M37.5 122.5 V125 M40 116.8 L37.5 122.5" fill="none" stroke="#111" stroke-width="0.7"/>
  <path d="M9 120 H38.6" stroke="#111" stroke-width="0.5" stroke-dasharray="1.4 1.2"/>
  ${text(8, 130, '14', 3.4, '#111', 'middle', 'normal')}${text(17.5, 130, '24', 3.4, '#111', 'middle', 'normal')}${text(27, 130, '34', 3.4, '#111', 'middle', 'normal')}${text(37.5, 130, '42', 3.4, '#111', 'middle', 'normal')}

  <!-- 下側の端子台（内側 P2・外側 P1） -->
  ${block(Y_BOT_P2, 'P2', true, BOT_P2)}
  ${block(Y_BOT_P1, '', true, BOT_P1)}
`;

const power = { system: 'DC' as const, minVoltage: 20.4, maxVoltage: 26.4 };

const LABELS: Record<string, string> = {
  S11: 'S11（入力回路の電源出力。横絡検出ありでは S52 と短絡）',
  S12: 'S12（入力 CH1。S12-S34 がスタート回路）',
  S21: 'S21（入力回路 CH2 側）',
  S22: 'S22（入力 CH2）',
  S52: 'S52（横絡検出の選択。検出ありで S11 と短絡）',
  S34: 'S34（スタート回路。S12-S34 間にリセットボタン＋フィードバック）',
  '13': '13（安全出力 1）',
  '14': '14（安全出力 1）',
  '23': '23（安全出力 2）',
  '24': '24（安全出力 2）',
  '33': '33（安全出力 3）',
  '34': '34（安全出力 3）',
  '41': '41（補助出力 b 接点・非安全）',
  '42': '42（補助出力 b 接点・非安全）',
};

/** 入力回路の電源側（S11/S21 から接点を通って S12/S22 へ戻す） */
const TEST: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

/** 電源以外の端子の電気的な役割と安全回路での機能 */
const SPEC: Record<string, Partial<TerminalDef>> = {
  S11: { role: 'supply', supply: TEST, function: 'test-output', channel: 1 },
  S12: { function: 'safety-input', channel: 1 },
  S21: { role: 'supply', supply: TEST, function: 'test-output', channel: 2 },
  S22: { function: 'safety-input', channel: 2 },
  // スタート回路 S12-S34 にリセットボタンと接触器の b 接点（フィードバックループ）を直列に入れる。
  // リセットとフィードバックを兼ねる端子
  S34: { function: ['reset', 'edm'] },
};

const row = (ids: string[], y: number, side: 'top' | 'bottom'): TerminalDef[] =>
  ids.map((id, i) => {
    if (id === 'A1') return { id, label: 'A1（+24V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['+'] } };
    if (id === 'A2') return { id, label: 'A2（0V）', x: XS[i], y, side, role: 'input', accepts: { ...power, conductors: ['-'] } };
    // 数字の端子はリレー接点（41-42 は補助出力）
    const spec = id === '41' || id === '42' ? { function: 'aux-output' as const } : /^\d+$/.test(id) ? { function: 'safety-contact' as const } : SPEC[id];
    return { id, label: LABELS[id], x: XS[i], y, side, role: 'signal', optional: true, ...spec };
  });

const def: DeviceDefinition = {
  type: 'pilz.pnoz-x2-8p',
  name: '安全リレー',
  model: 'PNOZ X2.8P 24VAC/DC',
  maker: 'Pilz',
  category: 'safety',
  description:
    'Pilz PNOZ X シリーズの非常停止・安全ドア用安全リレー（777301、幅22.5mm）。電源 A1/A2 は 24V（AC/DC、−15%/+10%。図では DC24V として扱う）。安全出力は 3a（13-14、23-24、33-34、AC240V/DC24V 6A）、補助出力 1b（41-42）。PL e / カテゴリ4、SIL CL3。' +
    '横絡検出ありの 2 チャンネル入力: S11-S52 を短絡し、非常停止の b 接点 1 回路目を S11-S12、2 回路目を S21-S22 に接続する。' +
    'スタート回路は S12-S34: 自動スタートは短絡、手動スタートはリセットボタン（a 接点）を入れ、接触器 K5・K6 の b 接点（ミラー接点）を直列に入れてフィードバックループとする。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg,
  terminals: [
    ...row(TOP_P1, Y_TOP_P1, 'top'),
    ...row(TOP_P2, Y_TOP_P2, 'top'),
    ...row(BOT_P2, Y_BOT_P2, 'bottom'),
    ...row(BOT_P1, Y_BOT_P1, 'bottom'),
  ],
  // 安全出力 3a と補助出力 1b（b 接点）
  links: [
    { from: '13', to: '14', switch: 'NO' },
    { from: '23', to: '24', switch: 'NO' },
    { from: '33', to: '34', switch: 'NO' },
    { from: '41', to: '42', switch: 'NC' },
  ],
  safetyChannels: [
    { id: 'IN', label: '安全入力（CH1: S11→S12、CH2: S21→S22）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'S11', input: 'S12' }, { source: 'S21', input: 'S22' }] },
    // 接触器 2 台（K1/K2）を駆動する 13-14・23-24 を組にする。33-34 は増設・状態入力用で、使わなくても警告しない
    { id: 'OUT', label: '安全出力 13-14・23-24', kind: 'output', channels: [{ output: '13' }, { output: '23' }] },
  ],
  safety: { pl: 'e', category: '4', sil: 3, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061'] },
  // 消費電力 2.5W / 24V
  loadCurrent: 0.11,
};

export default def;
