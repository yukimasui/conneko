/**
 * パレットの検索（ファミリーと機種を検索語で探して並べる）。
 */
import type { DeviceFamily } from '../devices/families';
import type { DeviceCategory, DeviceDefinition } from '../devices/types';

export const CATEGORY_NAMES: Record<DeviceCategory, string> = {
  link: 'リンク（シート間の接続）',
  'power-source': '電源',
  breaker: 'ブレーカー',
  contactor: '開閉器',
  'power-supply': '電源ユニット',
  terminal: '端子台',
  load: '負荷',
  control: '操作・表示',
  plc: 'PLC',
  sensor: 'センサー',
  safety: '安全機器',
  network: 'ネットワーク機器',
  'air-supply': 'エア源・3 点セット',
  valve: '電磁弁・バルブ',
  actuator: 'シリンダ・アクチュエータ',
  'air-fitting': '継手・速度制御・エア周辺',
};

export const GENERIC_MAKER = '汎用';
export const makerOf = (d: DeviceDefinition) => d.maker ?? GENERIC_MAKER;

/** パレットの 1 行（ファミリー）。機種が 1 つならそのまま置き、複数なら「機種を選ぶ」ダイアログを開く */
export interface Entry {
  family: DeviceFamily;
  /** 絞り込み（メーカー）に合う機種 */
  members: DeviceDefinition[];
  /** 置くときの機種（最後に選んだもの・検索で合ったもの・既定） */
  def: DeviceDefinition;
  /** 型式で検索に合った機種（行に型式を出す） */
  hit?: DeviceDefinition;
}

/**
 * 検索の表記ゆれをそろえる: 全角・半角（NFKC）、大文字・小文字、空白、長音（シリンダー / シリンダ）、漢数字の「三」（三点セット）
 */
export const norm = (t: string) => t.normalize('NFKC').toLowerCase().replace(/[\sー・]/g, '').replace(/三点/g, '3点');

/**
 * 現場の通称・略号 → 機器の名前に出てくる言葉（どれかに合えば一致）。キーは norm した形で書く。
 * 英字の略号（mc・elb など）は、型式などの英字の一部にも合ってしまうため、通称のほうに合った機器を先に並べる
 */
const SYNONYMS: Record<string, string[]> = {
  // エア
  スピコン: ['スピードコントローラ'],
  エアシリ: ['シリンダ'],
  frl: ['3点セット', 'フィルタ', 'レギュレータ'],
  ソレノイドバルブ: ['電磁弁'],
  ソレノイド: ['電磁弁'],
  マニホ: ['マニホールド'],
  サイレンサー: ['サイレンサ'],
  レギュ: ['レギュレータ'],
  チャック: ['エアチャック'],
  継手: ['継手', 'ユニオン', 'レデューサ'],
  ティー: ['ユニオンティ'],
  ワンタッチ継手: ['ワンタッチ管継手'],
  // 電気（盤の図面の略号・別名）
  電磁開閉器: ['電磁接触器', 'サーマルリレー'],
  マグネット: ['電磁接触器'],
  マグネットスイッチ: ['電磁接触器'],
  mc: ['電磁接触器'],
  mgsw: ['電磁接触器'],
  ms: ['電磁接触器', 'サーマルリレー'],
  thr: ['サーマルリレー'],
  サーマル: ['サーマルリレー'],
  mccb: ['ノーヒューズ遮断器', 'ノーヒューズブレーカ'],
  nfb: ['ノーヒューズ遮断器', 'ノーヒューズブレーカ'],
  ノーヒューズ: ['ノーヒューズ'],
  elb: ['漏電遮断器', '漏電ブレーカ'],
  elcb: ['漏電遮断器', '漏電ブレーカ'],
  cp: ['サーキットプロテクタ'],
  ブレーカ: ['遮断器', 'ブレーカ', 'サーキットプロテクタ'],
  pb: ['押しボタン'],
  押釦: ['押しボタン'],
  pl: ['表示灯'],
  パイロットランプ: ['表示灯'],
  ランプ: ['表示灯'],
  ry: ['リレー'],
  cr: ['リレー'],
  tb: ['端子台'],
  スイッチング電源: ['電源'],
  直流電源: ['電源'],
  リミット: ['リミットスイッチ'],
  ls: ['リミットスイッチ'],
  近接: ['近接センサ'],
  光電: ['光電センサ'],
  シーケンサ: ['plc'],
  インバータ: ['インバータ'],
  inv: ['インバータ'],
};

/** norm した検索語 → 言い換え */
const SYNONYM_MAP = new Map(Object.entries(SYNONYMS).map(([k, v]) => [norm(k), v.map(norm)]));

/** 英字だけの短い語（略号）。型式・type などの英字の一部に合っても、語の頭に合うときだけ数える */
const isAbbrev = (w: string) => /^[a-z]{1,4}$/.test(w);

/** 英字の略号が、文字列の英字の語の頭に合うか（'mc' は 'mcon' には合うが 'nf63-cmc' の途中には合わない） */
const abbrevHit = (field: string, w: string) => new RegExp(`(^|[^a-z])${w}`).test(field);

/** 検索語にどれだけ合うか（0 は不一致）。ファミリーの名前・別名と、機器の名称・型式・メーカー・説明・type を対象にする */
export function score(d: DeviceDefinition, f: DeviceFamily, words: string[]): number {
  // 定格電流などのパラメータの選択肢（例: '30A'）でも探せるようにする
  const options = (d.params ?? []).flatMap((p) => p.options.map((o) => `${o.label ?? ''} ${o.value}${p.unit ?? ''}`)).join(' ');
  const fields = [`${f.name} ${f.keywords.join(' ')}`, d.name, d.model, makerOf(d), d.type, d.description ?? '', CATEGORY_NAMES[d.category], options].map(norm);
  const category = norm(CATEGORY_NAMES[d.category]);
  let total = 0;
  for (const raw of words) {
    const w = norm(raw);
    if (!w) continue;
    const synonyms = SYNONYM_MAP.get(w) ?? [];
    // 通称・略号の言い換えが機器の名前・ファミリーに合えば、そのまま合った語より先に出す
    const synHit = synonyms.length ? [0, 1].find((i) => synonyms.some((a) => fields[i].includes(a))) : undefined;
    const direct = isAbbrev(w) ? fields.findIndex((x) => abbrevHit(x, w)) : fields.findIndex((x) => x.includes(w));
    const synAny = fields.findIndex((x) => synonyms.some((a) => x.includes(a)));
    if (synHit === undefined && direct < 0 && synAny < 0) return 0;
    const hit = synHit !== undefined ? synHit : direct >= 0 ? direct : synAny;
    // 分類の名前にも合う機器（「シリンダ」で引いたエアシリンダなど）を先に出す
    total += 10 - hit + (synHit !== undefined ? 6 : 0) + ([w, ...synonyms].some((a) => category.includes(a)) ? 5 : 0);
  }
  return total;
}

/** 検索語に合うファミリーを、合う度合いの高い順に返す */
export function searchEntries(entries: Entry[], words: string[]): Entry[] {
  return entries
    .map((e) => {
      const scored = e.members.map((d) => ({ d, s: score(d, e.family, words) })).sort((a, b) => b.s - a.s);
      const best = scored[0];
      // ファミリーの名前・別名だけでは合わず、型式などで合った機種は、その機種を置く
      const byFamily = words.every((w) => norm(`${e.family.name} ${e.family.keywords.join(' ')}`).includes(norm(w)));
      const hit = !byFamily && best.s > 0 && e.members.length > 1 ? best.d : undefined;
      return { e: { ...e, def: hit ?? e.def, hit }, s: best.s + (byFamily ? 20 : 0) };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);
}

/**
 * パレットの一覧に出さないファミリー（PLC の増設ユニット・マニホールドのブランクプレートなど）を置くときの案内。
 * 単独で置くより、親の機器のエディタから足すほうがよいもの。案内のないファミリーは undefined
 */
export function hiddenGuide(family: DeviceFamily): string | undefined {
  if (!family.hidden) return undefined;
  if (family.category === 'plc')
    return 'PLC の増設ユニット・ベース・電源は、CPU を置いてから右クリックの「PLC エディタ（ユニット構成）」で足すと、CPU に装着されて入出力番号が自動で決まります。';
  if (family.category === 'valve' || family.category === 'air-fitting')
    return 'マニホールドの部品は、マニホールドを置いてから右クリックの「バルブエディタ」で足すと、連に装着されます。';
  return undefined;
}
