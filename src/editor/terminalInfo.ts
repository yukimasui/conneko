/**
 * 端子の説明（ホバーのポップアップ・インスペクタの端子一覧に出す文字）を組み立てる。
 */
import { terminationShort } from '../data/terminations';
import { terminalHint } from '../devices/hint';
import type { ResolvedAccept, ResolvedDevice } from '../devices/resolve';
import { resolveNum, type Conductor, type TerminalDef } from '../devices/types';

export const ROLE_NAMES: Record<string, string> = {
  line: '一次側',
  load: '二次側',
  pass: '中継',
  supply: '電源出力',
  input: '受電',
  ground: '接地',
  signal: '信号',
  connector: 'コネクタ',
};

export const SIGNAL_NAMES: Record<string, string> = {
  npn: 'NPN出力',
  pnp: 'PNP出力',
  contact: '無電圧接点',
  '2wire': '2線式',
  dc: 'DC入力',
  dry: '無電圧入力',
  'analog-v': 'アナログ電圧',
  'analog-i': 'アナログ電流',
  'line-driver': 'ラインドライバ',
};

const CONDUCTOR_NAMES: Record<Conductor, string> = { R: 'R', S: 'S', T: 'T', L: 'L', N: 'N', '+': '+', '-': '−', PE: 'PE' };

const volt = (n: number) => `${Math.round(n * 100) / 100}V`;

function acceptText(a: ResolvedAccept): string {
  const range = !Number.isFinite(a.maxVoltage) ? `${volt(a.minVoltage)} 以上` : a.minVoltage === a.maxVoltage ? volt(a.minVoltage) : `${a.minVoltage}〜${volt(a.maxVoltage)}`;
  return `${a.system} ${range}${a.conductors ? `（${a.conductors.map((c) => CONDUCTOR_NAMES[c]).join('・')}）` : ''}`;
}

export interface TerminalFacts {
  /** 端子の印字 */
  printed: string;
  /** 短い呼び名 */
  hint?: string;
  /** 端子の意味の説明 */
  note?: string;
  /** 種別（'受電'、'NPN出力'、'DC入力（受ける側）' など） */
  kind: string;
  /** 受電できる電源・出す電源（'DC 19.2〜26.4V（+）'、'DC24V を出す（+）' など） */
  power?: string;
  /** 受け入れる電線と定格電流（'電線: フェルール・むき線、0.08〜1.5sq／定格 24A' など） */
  wire?: string;
}

/** 端子の説明をまとめる（r はその端子の機器を resolveDevice したもの） */
export function terminalFacts(t: TerminalDef, r: ResolvedDevice): TerminalFacts {
  const signal = t.signal ? SIGNAL_NAMES[t.signal.kind] ?? t.signal.kind : undefined;
  const kind = signal ? (/(出力|入力)$/.test(signal) ? signal : `${signal}（${t.signal!.dir === 'out' ? '出す側' : '受ける側'}）`) : ROLE_NAMES[t.role] ?? t.role;
  const accepts = r.accepts.get(t.id) ?? [];
  let power: string | undefined;
  if (accepts.length) power = `受けられる電源: ${accepts.map(acceptText).join(' / ')}`;
  else if (t.supply) {
    const v = resolveNum(t.supply.voltage, r.def, r.params);
    const what = t.supply.kind === 'ossd' ? '安全出力' : t.supply.kind === 'test' ? 'テスト出力' : '電源';
    power = `${what}: ${t.supply.system}${v !== undefined ? volt(v) : ''}（${CONDUCTOR_NAMES[t.supply.conductor]}）`;
  }
  const hint = terminalHint(t);
  const w = t.wire;
  const size = w && (w.minSq !== undefined || w.maxSq !== undefined) ? (w.minSq !== undefined && w.maxSq !== undefined ? `${w.minSq}〜${w.maxSq}sq` : w.maxSq !== undefined ? `${w.maxSq}sq 以下` : `${w.minSq}sq 以上`) : undefined;
  const wireParts = [w?.methods?.map(terminationShort).join('・'), size].filter(Boolean).join('、');
  const wire = [wireParts ? `電線: ${wireParts}` : undefined, t.ratedCurrent !== undefined ? `定格 ${t.ratedCurrent}A` : undefined].filter(Boolean).join('／');
  return {
    printed: t.label ?? t.id,
    ...(hint ? { hint } : {}),
    ...(t.note ? { note: t.note } : {}),
    kind,
    ...(power ? { power } : {}),
    ...(wire ? { wire } : {}),
  };
}
