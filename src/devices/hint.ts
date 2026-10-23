/**
 * 端子の呼び名（選択中の機器の端子の横に出す吹き出しの文字）を決める。
 *
 * 定義に hint があればそれを使い、なければ note の括弧より前を切り出す。
 * note もなく、印字が「端子ID（説明）」の形なら括弧の中の最初の区切り（、）までを使う。
 * 例: note '極 1 の COM（9-1 が b 接点…）' → '極 1 の COM'、label '11（主回路 b 接点・直接開路）' → '主回路 b 接点・直接開路'。
 * 印字の括弧より前に意味がある端子（label '茶 +V（DC10〜30V）'）は、吹き出しで括弧より前の '茶 +V' を出す
 */
import type { TerminalDef } from './types';

/** 吹き出しに出す最大の文字数（超えた分は … で省く） */
export const CALLOUT_MAX = 14;

/** 最初の括弧（全角・半角）より前を取り出す */
const beforeParen = (s: string): string => s.split(/[（(]/)[0].trim();

/** 印字が「端子ID（説明）」の形なら、説明の最初の区切り（、）まで */
function fromLabel(t: Pick<TerminalDef, 'id' | 'label'>): string | undefined {
  const m = t.label?.match(/^(.*?)[（(](.*)[）)]\s*$/);
  if (!m || (m[1].trim() && m[1].trim() !== t.id)) return undefined;
  return m[2].split(/[、,]/)[0].trim() || undefined;
}

/** 端子の短い呼び名。hint → note の括弧より前 → 印字の括弧の中。どれもなければ undefined */
export function terminalHint(t: Pick<TerminalDef, 'id' | 'label' | 'hint' | 'note'>): string | undefined {
  if (t.hint) return t.hint;
  const n = t.note ? beforeParen(t.note) : '';
  return n || fromLabel(t);
}

/**
 * 吹き出しの文字（'14 コイル+'、'茶 +V' など）。端子の印字（括弧より前）と呼び名を並べる。
 * 印字が端子IDそのままで呼び名もない端子（意味の情報がない端子）は undefined（吹き出しを出さない）
 */
export function terminalCallout(t: Pick<TerminalDef, 'id' | 'label' | 'hint' | 'note'>): string | undefined {
  const printed = t.label ?? t.id;
  const short = beforeParen(printed) || printed;
  const hint = terminalHint(t);
  const text = hint ? (hint === short || short.endsWith(` ${hint}`) ? short : `${short} ${hint}`) : short === t.id ? undefined : short;
  if (!text) return undefined;
  return text.length > CALLOUT_MAX ? `${text.slice(0, CALLOUT_MAX - 1)}…` : text;
}
