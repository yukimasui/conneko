/**
 * オムロン MY 形リレー（MY2N / MY4N）・H3Y 形タイマーを、DIN レール用ソケット PYF08A-E / PYF14A-E に挿した状態の機器定義を作る。
 *
 * 端子番号（リレー・タイマー共通の 8 ピン / 14 ピン配置）:
 *   2 極（MY2N・H3Y-2）: 極 1 = COM 9・NC 1・NO 5、極 2 = COM 12・NC 4・NO 8、コイル（電源）13-14
 *   4 極（MY4N）: 極 n = COM 8+n・NC n・NO 4+n（n = 1〜4）、コイル 13-14
 *   DC コイル（LED 表示付き）は極性あり: 14 が +、13 が −（「コイル極性をご確認の上、正しく配線してください」）
 * ソケットの端子の並び（正面＝上から見た図。H3Y データシート CSM_H3Y_DS_E_7_2 の PYF08A-E / PYF14A-E Top View）:
 *   PYF08A-E（23 × 72mm）: 上から [4, 1]（4 が中央、1 が右）/ [8, 5] / リレー / [12, 9] / [14, 13]（14 が左、13 が中央）
 *   PYF14A-E（29.5 × 72mm）: 上から [3, 2, 1]（右寄せ）/ [8, 7, 6, 5] / リレー / [12, 11, 10, 9] / [4, 14, 13]（左寄せ）
 *   PYF14A-E は、2・3 段目の内側の端子の電線が 1・4 段目の端子に重ならないよう、1・4 段目を半ピッチ横にずらして描く。
 *
 * 出典: オムロン MY カタログ CSM_MY_DS_J_7_2（端子配置・コイル定格・接点定格）、H3Y データシート CSM_H3Y_DS_E_7_2（ソケット・タイマー）
 */
import type { AcceptSpec, DeviceDefinition, ParamValues } from '../types';
import { buildRelaySocket, cContact, type RelayFace, type SocketTerminal } from './relay-socket';

type Coil = 'dc24' | 'ac100';

/** 端子の向き・印字の位置を決めた PYF08A-E の端子（W 46 × H 144、1mm ≒ 2px） */
function pyf08(notes: Record<string, string>, hints: Record<string, string>, coilPolarity: { '13': '+' | '-' | 'any'; '14': '+' | '-' | 'any' }): SocketTerminal[] {
  const L = 11;
  const C = 23;
  const R = 35;
  const t = (id: string, x: number, y: number, side: SocketTerminal['side']): SocketTerminal => ({
    id,
    x,
    y,
    side,
    note: notes[id],
    hint: hints[id],
    ...(id === '13' || id === '14' ? { coil: coilPolarity[id] } : {}),
  });
  return [t('4', C, 14, 'top'), t('1', R, 14, 'top'), t('8', L, 37, 'left'), t('5', R, 37, 'right'), t('12', L, 107, 'left'), t('9', R, 107, 'right'), t('14', L, 130, 'bottom'), t('13', C, 130, 'bottom')];
}

/** PYF14A-E の端子（W 74 × H 144。1・4 段目は半ピッチずらす） */
function pyf14(notes: Record<string, string>, hints: Record<string, string>, coilPolarity: { '13': '+' | '-' | 'any'; '14': '+' | '-' | 'any' }): SocketTerminal[] {
  const col = [12, 28, 44, 60];
  const t = (id: string, x: number, y: number, side: SocketTerminal['side']): SocketTerminal => ({
    id,
    x,
    y,
    side,
    note: notes[id],
    hint: hints[id],
    ...(id === '13' || id === '14' ? { coil: coilPolarity[id] } : {}),
  });
  return [
    t('3', 36, 16, 'top'),
    t('2', 52, 16, 'top'),
    t('1', 66, 16, 'top'),
    t('8', col[0], 36, 'left'),
    t('7', col[1], 36, 'top'),
    t('6', col[2], 36, 'top'),
    t('5', col[3], 36, 'right'),
    t('12', col[0], 108, 'left'),
    t('11', col[1], 108, 'bottom'),
    t('10', col[2], 108, 'bottom'),
    t('9', col[3], 108, 'right'),
    t('4', 18, 128, 'bottom'),
    t('14', 36, 128, 'bottom'),
    t('13', 52, 128, 'bottom'),
  ];
}

/** 極ごとの端子の説明（COM / NC / NO）とコイル */
function poleNotes(poles: 2 | 4, coilNote: { '13': string; '14': string }, what = ''): Record<string, string> {
  const notes: Record<string, string> = { '13': coilNote['13'], '14': coilNote['14'] };
  const list = poles === 2 ? [{ com: '9', nc: '1', no: '5' }, { com: '12', nc: '4', no: '8' }] : [1, 2, 3, 4].map((n) => ({ com: String(8 + n), nc: String(n), no: String(4 + n) }));
  list.forEach((p, i) => {
    notes[p.com] = `${what}極 ${i + 1} の COM（${p.com}-${p.nc} が b 接点、${p.com}-${p.no} が a 接点）`;
    notes[p.nc] = `${what}極 ${i + 1} の NC（b 接点 ${p.com}-${p.nc}）`;
    notes[p.no] = `${what}極 ${i + 1} の NO（a 接点 ${p.com}-${p.no}）`;
  });
  return notes;
}

/** 極ごとの端子の呼び名（COM1 / NC1 / NO1 など）とコイルの呼び名。what はタイマーの接点の前置き（'限時'） */
function poleHints(poles: 2 | 4, coil: { '13': string; '14': string }, what = ''): Record<string, string> {
  const hints: Record<string, string> = { '13': coil['13'], '14': coil['14'] };
  const list = poles === 2 ? [{ com: '9', nc: '1', no: '5' }, { com: '12', nc: '4', no: '8' }] : [1, 2, 3, 4].map((n) => ({ com: String(8 + n), nc: String(n), no: String(4 + n) }));
  list.forEach((p, i) => {
    hints[p.com] = `${what}COM${i + 1}`;
    hints[p.nc] = `${what}NC${i + 1}`;
    hints[p.no] = `${what}NO${i + 1}`;
  });
  return hints;
}

/** 接点の内部経路。rated は接点の定格電流[A]（抵抗負荷。MY2N は 5A、MY4N は 3A） */
function poleLinks(poles: 2 | 4, rated?: number) {
  return poles === 2
    ? [...cContact('9', '1', '5', rated), ...cContact('12', '4', '8', rated)]
    : [1, 2, 3, 4].flatMap((n) => cContact(String(8 + n), String(n), String(4 + n), rated));
}

const COIL: Record<Coil, { accepts: Omit<AcceptSpec, 'conductors'>; current: number; label: string; model: string }> = {
  // 定格 DC24V 36.3mA。動作電圧 80% 以下、許容電圧 110%（下限は動作電圧の 80%）
  dc24: { accepts: { system: 'DC', minVoltage: 19.2, maxVoltage: 26.4 }, current: 0.0363, label: 'DC24V', model: 'DC24' },
  // 定格 AC100/110V 50Hz 11.7/12.9mA・60Hz 10/11mA。80%〜110%
  ac100: { accepts: { system: 'AC', minVoltage: 80, maxVoltage: 121 }, current: 0.0129, label: 'AC100/110V', model: 'AC100/110' },
};

const SOCKET_COLOR = { edge: '#161718', mid: '#2c2e30' };

export function buildMy(poles: 2 | 4, coil: Coil): DeviceDefinition {
  const c = COIL[coil];
  const dc = coil === 'dc24';
  const polarity = dc ? ({ '13': '-', '14': '+' } as const) : ({ '13': 'any', '14': 'any' } as const);
  const coilNote = dc ? { '13': 'コイル −（0V）', '14': 'コイル +（+24V）' } : { '13': 'コイル（AC100/110V）', '14': 'コイル（AC100/110V）' };
  const notes = poleNotes(poles, coilNote);
  const hints = poleHints(poles, dc ? { '13': 'コイル−', '14': 'コイル+' } : { '13': 'コイル', '14': 'コイル' });
  const name = `MY${poles}N`;
  const socket = poles === 2 ? 'PYF08A-E' : 'PYF14A-E';
  const W = poles === 2 ? 46 : 74;
  const relay: RelayFace = {
    x: 5,
    y: poles === 2 ? 50 : 48,
    w: W - 10,
    h: poles === 2 ? 44 : 48,
    cover: 'clear',
    lines: ['OMRON', name, c.label],
    poles,
    // 動作表示 LED は DC が緑、AC が赤
    led: { x: W - 10, y: 53, color: dc ? '#3ad45a' : '#ff4a3a' },
  };
  const rating = poles === 2 ? 'AC220V 5A / DC24V 5A（抵抗負荷）' : 'AC220V 3A / DC24V 3A（抵抗負荷）';
  return buildRelaySocket({
    type: `omron.my${poles}n.${coil}`,
    name: `リレー（${poles}c、ソケット付き）`,
    model: `${name} ${c.model} + ${socket}`,
    maker: 'オムロン',
    description:
      `オムロンの汎用リレー MY 形 ${name}（${poles} 極 c 接点、動作表示 LED 付き、コイル ${c.label}）を DIN レール用ソケット ${socket} に挿した状態。` +
      `コイル 13-14（${dc ? '極性あり: 14 が +、13 が −' : '極性なし'}、定格電流 ${dc ? '36.3mA' : '50Hz 11.7/12.9mA・60Hz 10/11mA'}）。` +
      (poles === 2 ? '極 1 は COM 9・NC 1・NO 5、極 2 は COM 12・NC 4・NO 8。' : '極 n（1〜4）は COM 8+n・NC n・NO 4+n（極 1 は 9-1 が b 接点、9-5 が a 接点）。') +
      `接点定格 ${rating}。`,
    labelPrefix: 'CR',
    width: W,
    height: 144,
    socketTop: 4,
    socketBottom: 140,
    socketColor: SOCKET_COLOR,
    seat: '#0b0b0c',
    ink: '#f2f2f2',
    terminals: poles === 2 ? pyf08(notes, hints, polarity) : pyf14(notes, hints, polarity),
    labelOffset: poles === 2 ? pyf08Label : pyf14Label,
    relay,
    coil: c.accepts,
    links: poleLinks(poles, poles === 2 ? 5 : 3),
    loadCurrent: c.current,
    socketName: socket,
  });
}

/** PYF08A-E の端子番号の印字位置（1・2 段目は下、3・4 段目は上） */
function pyf08Label(t: SocketTerminal) {
  return t.y < 72 ? { dx: 0, dy: 10.5 } : { dx: 0, dy: -7 };
}

/** PYF14A-E の端子番号の印字位置（1 段目は上、2 段目は下、3 段目は上、4 段目は下） */
function pyf14Label(t: SocketTerminal) {
  if (t.y < 20) return { dx: 0, dy: -7 };
  if (t.y < 50) return { dx: 0, dy: 11 };
  if (t.y < 115) return { dx: 0, dy: -7 };
  return { dx: 0, dy: 11 };
}

/** H3Y の時間レンジ（最大目盛）の選択肢 */
const H3Y_RANGES = ['0.5s', '1s', '5s', '10s', '30s', '60s', '120s', '3min', '5min', '10min', '30min', '60min', '3h'];

/**
 * オムロン ソリッドステート・タイマ H3Y-2（オンディレー、限時 2c、電源 DC24V）を PYF08A-E に挿した状態。
 * 端子は MY2 と同じ（電源 13(−)・14(+)、限時接点 極 1 = 9・1・5、極 2 = 12・4・8）。瞬時接点はない。
 * 限時接点は設定時間たってから切り換わるが、図面では普通の a 接点・b 接点として表す（チェックでは「動作中」に閉じる接点として扱う）。
 */
export function buildH3y(): DeviceDefinition {
  const notes = poleNotes(2, { '13': '電源 −（0V）', '14': '電源 +（+24V）' }, '限時接点 ');
  const hints = poleHints(2, { '13': '電源−', '14': '電源+' }, '限時');
  const W = 46;
  const base = buildRelaySocket({
      type: 'omron.h3y-2.dc24',
      name: 'タイマー（オンディレー 2c、ソケット付き）',
      model: 'H3Y-2 DC24 + PYF08A-E',
      maker: 'オムロン',
      description:
        'オムロンのソリッドステート・タイマ H3Y-2（オンディレー、限時 c 接点 2 極、電源 DC24V・約 0.9W）を DIN レール用ソケット PYF08A-E に挿した状態。' +
        '電源 13(−)・14(+) に通電すると、設定時間の後に限時接点が切り換わる（極 1: COM 9・NC 1・NO 5、極 2: COM 12・NC 4・NO 8。瞬時接点はない）。' +
        '電源電圧の許容範囲は定格の 85〜110%、接点定格 AC250V 5A（抵抗負荷）。時間レンジ（0.5s〜3h の 13 種類）は params の range で選ぶ（型式の末尾に付く）。' +
        '図面では限時接点を普通の a 接点・b 接点として表す。',
      labelPrefix: 'TR',
      width: W,
      height: 144,
      socketTop: 4,
      socketBottom: 140,
      socketColor: SOCKET_COLOR,
      seat: '#0b0b0c',
      ink: '#f2f2f2',
      terminals: pyf08(notes, hints, { '13': '-', '14': '+' }),
      labelOffset: pyf08Label,
      relay: { x: 4, y: 50, w: W - 8, h: 44, cover: '#c9cbc6', ink: '#222', lines: ['H3Y-2', '{{range}}'], textTop: 0.02, dial: { x: W / 2, y: 79, r: 8 }, led: { x: 9, y: 62, color: '#ff8a1e' } },
      coil: { system: 'DC', minVoltage: 20.4, maxVoltage: 26.4 },
      // 限時接点（オンディレー）
      links: poleLinks(2).map((l) => ({ ...l, timed: 'on-delay' as const })),
      loadCurrent: 0.0375,
      socketName: 'PYF08A-E',
  });
  const svg = base.svg as string;
  return {
    ...base,
    // 時間レンジを正面に表示する
    svg: (p: ParamValues) => svg.replaceAll('{{range}}', String(p.range)),
    params: [{ key: 'range', label: '時間レンジ（最大目盛）', options: H3Y_RANGES.map((r) => ({ value: r, label: r })), default: '10s' }],
  };
}

