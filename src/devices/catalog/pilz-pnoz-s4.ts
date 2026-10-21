import type { DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * Pilz 安全リレー PNOZsigma PNOZ s4（750104、24VDC、ネジ式プラグイン端子、安全出力 3a ＋ 補助 1b ＋ 半導体出力 Y32）。
 * 外形は 幅22.5 × 高さ98 × 奥行120mm（1mm ≒ 2px）。
 * Pilz の黄色い筐体の上下に黒いプラグイン端子台が 2 段ずつ（上: 外側 X1・内側 X3、下: 内側 X2・外側 X4）。
 * 上部のカバーに端子名と pilz ロゴ、中央に動作モード切替のロータリスイッチ、左側に LED（Power・In1・In2・Out・Reset・Fault）。
 *
 * 端子配列（Pilz 技術カタログ 1002173-EN-06 の正面図）:
 *   X1: A1 13 23 33 / X3: S12 S22 S34 41 / X2: S11 S21 Y32 42 / X4: A2 14 24 34
 */

const W = 46;
const H = 196;

const XS = [8, 18, 28, 38];
const Y_X1 = 9;
const Y_X3 = 27;
const Y_X2 = 169;
const Y_X4 = 187;

const X1 = ['A1', '13', '23', '33'];
const X3 = ['S12', 'S22', 'S34', '41'];
const X2 = ['S11', 'S21', 'Y32', '42'];
const X4 = ['A2', '14', '24', '34'];

const text = (x: number, y: number, t: string, size: number, fill = '#111', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

const screw = (x: number, y: number, r = 3.6) => `
  <circle cx="${x}" cy="${y}" r="${r}" fill="url(#screw-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - r * 0.6} ${y} H${x + r * 0.6} M${x} ${y - r * 0.6} V${y + r * 0.6}" stroke="#444" stroke-width="0.9" stroke-linecap="round"/>`;

const tier = (y: number) => `
  <rect x="2" y="${y - 7}" width="${W - 4}" height="14" rx="1.5" fill="url(#plug-{{uid}})" stroke="#000" stroke-width="0.5"/>
  ${XS.map((x) => `<rect x="${x - 4.4}" y="${y - 5.6}" width="8.8" height="11.2" rx="1" fill="#111"/>${screw(x, y)}`).join('')}`;

const LEDS = ['Power', 'In1', 'In2', 'Out', 'Reset', 'Fault'];

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
  <rect x="0.5" y="2" width="${W - 1}" height="${H - 4}" rx="3" fill="url(#case-{{uid}})" stroke="#8a6d00" stroke-width="0.8"/>

  <!-- 上の端子台（外側 X1・内側 X3）と、端子名を印刷したカバー -->
  ${tier(Y_X1)}
  ${tier(Y_X3)}
  <path d="M3 35 H${W - 3} V58 Q${W - 3} 64 ${W - 9} 64 H9 Q3 64 3 58 Z" fill="#f6c90e" stroke="#8a6d00" stroke-width="0.6"/>
  ${X1.map((l, i) => text(XS[i], 40.5, l, 3.4)).join('')}
  ${X3.map((l, i) => text(XS[i], 45.5, l, 3.4)).join('')}
  <text x="5" y="56" font-family="sans-serif" font-size="9" font-weight="bold" fill="#111" letter-spacing="-0.3">pilz</text>
  ${text(5, 62.5, 'PNOZ s4', 4.4, '#111', 'start', 'normal')}

  <!-- 動作モード切替スイッチ -->
  <circle cx="30" cy="72" r="3.4" fill="#222" stroke="#111" stroke-width="0.5"/>
  <circle cx="30" cy="72" r="1.4" fill="#ddd"/>
  <circle cx="30" cy="85" r="6.5" fill="#d8d8d8" stroke="#666" stroke-width="0.6"/>
  <path d="M30 80 V85" stroke="#444" stroke-width="1.6" stroke-linecap="round"/>
  ${text(30, 95, 'mode', 3, '#333', 'middle', 'normal')}

  <!-- LED（左側） -->
  <rect x="3" y="98" width="8" height="46" rx="2" fill="#2a2a2a"/>
  ${LEDS.map((n, i) => `<rect x="4.5" y="${100 + i * 7.3}" width="5" height="5.4" fill="${i === 0 ? '#3ad65a' : '#4f5a3a'}"/>${text(14, 104.6 + i * 7.3, n, 4, '#111', 'start')}`).join('')}
  ${text(5, 147.5, '750104', 3, '#333', 'start', 'normal')}
  <!-- 下側のカバー（端子名の印刷） -->
  <path d="M3 149 H${W - 3} V160.5 H3 Z" fill="#f6c90e" stroke="#8a6d00" stroke-width="0.5"/>
  ${X2.map((l, i) => text(XS[i], 153.6, l, 3.4)).join('')}
  ${X4.map((l, i) => text(XS[i], 158.6, l, 3.4)).join('')}

  <!-- 下の端子台（内側 X2・外側 X4） -->
  ${tier(Y_X2)}
  ${tier(Y_X4)}
`;

const power = { system: 'DC' as const, minVoltage: 19.2, maxVoltage: 30 };

const LABELS: Record<string, string> = {
  S11: 'S11（入力回路 CH1 のパルス出力）',
  S12: 'S12（入力 CH1。S12-S34 がスタート回路）',
  S21: 'S21（入力回路 CH2 のパルス出力）',
  S22: 'S22（入力 CH2）',
  S34: 'S34（スタート回路。S12-S34 間にリセットボタン＋フィードバック）',
  Y32: 'Y32（半導体補助出力・非安全）',
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
  // リセットとフィードバックを兼ねる端子だが、EDM の配線チェックを優先して edm にする
  S34: { function: 'edm' },
  Y32: { function: 'aux-output', signal: { dir: 'out', kind: 'pnp' } },
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
  type: 'pilz.pnoz-s4',
  name: '安全リレー',
  model: 'PNOZ s4 24VDC',
  maker: 'Pilz',
  category: 'safety',
  description:
    'Pilz PNOZsigma シリーズの非常停止・安全ドア用安全リレー PNOZ s4（750104、幅22.5mm）。電源 A1/A2 は DC24V。安全出力 3a（13-14、23-24、33-34、AC240V/DC24V 6A）、補助出力 1b（41-42）、半導体補助出力 Y32。PL e / カテゴリ4、SIL CL3。' +
    '2 チャンネル入力（横絡検出あり）: 非常停止の b 接点 1 回路目を S11-S12、2 回路目を S21-S22 に接続する。正面の mode スイッチで自動／手動／監視付きスタートと横絡検出の有無を選ぶ。' +
    'スタート回路は S12-S34: 自動スタートは短絡、手動・監視付きスタートはリセットボタン（a 接点）と接触器 K5・K6 の b 接点（ミラー接点）を直列に入れる（フィードバックループ）。',
  labelPrefix: 'SR',
  width: W,
  height: H,
  svg,
  terminals: [...row(X1, Y_X1, 'top'), ...row(X3, Y_X3, 'top'), ...row(X2, Y_X2, 'bottom'), ...row(X4, Y_X4, 'bottom')],
  // 安全出力 3a と補助出力 1b（b 接点）
  links: [
    { from: '13', to: '14', switch: 'NO' },
    { from: '23', to: '24', switch: 'NO' },
    { from: '33', to: '34', switch: 'NO' },
    { from: '41', to: '42', switch: 'NC' },
  ],
  safetyChannels: [
    { id: 'IN', label: '安全入力（CH1: S11→S12、CH2: S21→S22）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'S11', input: 'S12' }, { source: 'S21', input: 'S22' }] },
    { id: 'OUT', label: '安全出力 13-14・23-24・33-34', kind: 'output', channels: [{ output: '13' }, { output: '23' }, { output: '33' }] },
  ],
  safety: { pl: 'e', category: '4', sil: 3, standards: ['ISO 13849-1', 'IEC 61508', 'IEC 62061'] },
  // 消費電力 2.5W 程度 / 24V
  loadCurrent: 0.11,
};

export default def;
