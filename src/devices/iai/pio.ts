/**
 * IAI コントローラーの PIO（パラレル I/O）コネクターのピン定義の共通部品。
 *
 * PIO の入出力回路（総合カタログ「PIO 入出力回路」より）:
 * - NPN 仕様: 入力は P24（+24V）から内部のフォトカプラを通って入力端子へ流れ出す「プラスコモン」の入力
 *   （PLC の NPN 出力・接点で 0V に引き込むと ON）。出力は出力端子から N（0V）へ引き込む NPN（シンク）出力。
 * - PNP 仕様: 入力は入力端子から内部を通って N（0V）へ流れ込む「マイナスコモン」の入力
 *   （PLC の PNP 出力・接点で +24V を加えると ON）。出力は P24 から出力端子へ +24V を出す PNP（ソース）出力。
 * - 入力 DC24V ±10%・5mA/点、出力 DC24V・最大 50mA/点。P24・N は外部の DC24V 電源からコネクターの
 *   決まったピン（PCON-CB などは 1A・2A が 24V、19B・20B が 0V）へ供給する。
 *
 * Conneko では、入力点を signal: { dir: 'in', kind: 'dc', common: P24 または N のピン }、
 * 出力点を signal: { dir: 'out', kind: 'npn' | 'pnp' } と、出力点から N（NPN）/ P24（PNP）への
 * switch: 'output' の経路で表す。これで PLC の出力から IAI の入力へ、IAI の出力から PLC の入力への
 * 極性（NPN/PNP）の取り違えがチェックされる。
 */
import type { InternalLink, ParamDef, ParamValues, PinDef } from '../types';
import { DC24_MINUS, DC24_PLUS } from './parts';

/**
 * ピンの種類
 * - p24: I/O 用電源 +24V の入力
 * - n: I/O 用電源 0V の入力
 * - in / out: 入力点・出力点
 * - pulse: 差動（ラインドライバー）のパルス列入力
 * - nc: 未使用
 */
export type PioKind = 'p24' | 'n' | 'in' | 'out' | 'pulse' | 'nc';

export interface PioPoint {
  /** コネクターのピンID（'<コネクター端子ID>#<番号>'） */
  id: string;
  /** マニュアルのピン番号の表記（'1A'、'25' など） */
  no: string;
  kind: PioKind;
  /** I/O 番号・信号名（'IN0'、'OUT15'、'P24'、'PP' など） */
  name: string;
  /** 機能（PIO パターンで決まる信号名。'PC1'、'*ALM' など） */
  func?: string;
  /** 補足の説明 */
  note?: string;
}

/** I/O 種類（NPN / PNP）。PNP は 'pnp'、それ以外は 'npn' */
export type Polarity = 'npn' | 'pnp';

/** 出力 1 点の最大負荷電流[A] */
export const PIO_OUT_RATED = 0.05;

const label = (pt: PioPoint) => {
  const head = [pt.name, pt.func !== pt.name ? pt.func : undefined].filter((s) => s && s !== '－').join(' ');
  return `${head || '－'}（${pt.no}）`;
};

/** PIO のピン定義を作る（polarity で入力のコモンと出力の信号の種類が変わる） */
export function pioPins(points: PioPoint[], polarity: Polarity): PinDef[] {
  const p24 = points.find((p) => p.kind === 'p24')?.id;
  const n = points.find((p) => p.kind === 'n')?.id;
  return points.map((pt): PinDef => {
    const base = { id: pt.id, label: label(pt), optional: true };
    switch (pt.kind) {
      case 'p24':
        return { ...base, role: 'input', accepts: DC24_PLUS, note: pt.note ?? 'I/O 用電源 +24V（P24）。外部の DC24V 電源の +24V をつなぐ' };
      case 'n':
        return { ...base, role: 'input', accepts: DC24_MINUS, note: pt.note ?? 'I/O 用電源 0V（N）。外部の DC24V 電源の 0V をつなぐ' };
      case 'in': {
        const common = polarity === 'pnp' ? n : p24;
        return {
          ...base,
          role: 'signal',
          signal: { dir: 'in', kind: 'dc', ...(common ? { common } : { commonPolarity: polarity === 'pnp' ? '-' : '+' }) },
          note: [pt.note, polarity === 'pnp' ? 'PNP 仕様: +24V を加えると ON' : 'NPN 仕様: 0V に引き込むと ON'].filter(Boolean).join('。'),
        };
      }
      case 'out':
        return {
          ...base,
          role: 'signal',
          signal: { dir: 'out', kind: polarity },
          note: [pt.note, polarity === 'pnp' ? 'PNP 出力: ON で +24V を出す' : 'NPN 出力: ON で 0V に引き込む'].filter(Boolean).join('。'),
        };
      case 'pulse':
        return { ...base, role: 'signal', signal: { dir: 'in', kind: 'line-driver' }, note: pt.note ?? '差動（ラインドライバー）パルス列入力' };
      default:
        return { ...base, role: 'signal', note: pt.note ?? '未使用' };
    }
  });
}

/** PIO の内部経路（P24 どうし・N どうしの導通と、出力 ON の経路） */
export function pioLinks(points: PioPoint[], polarity: Polarity, rated = PIO_OUT_RATED): InternalLink[] {
  const p24 = points.filter((p) => p.kind === 'p24').map((p) => p.id);
  const n = points.filter((p) => p.kind === 'n').map((p) => p.id);
  const links: InternalLink[] = [];
  for (const id of p24.slice(1)) links.push({ from: p24[0], to: id });
  for (const id of n.slice(1)) links.push({ from: n[0], to: id });
  const ref = polarity === 'pnp' ? p24[0] : n[0];
  if (ref) {
    for (const pt of points) if (pt.kind === 'out') links.push({ from: pt.id, to: ref, switch: 'output', ratedCurrent: rated });
  }
  return links;
}

/* ------------------------------------------------------------------ */
/* ポジショナー（PCON/ACON/DCON-CB など）の 40 極 PIO                    */
/* ------------------------------------------------------------------ */

/**
 * 40 極 PIO コネクター（ヒロセ HIF6-40PA-1.27DS）のピン番号 → ピンID の番号。
 * マニュアルの番号は 1A〜20A（A 列）・1B〜20B（B 列）。Conneko では 2 列のコネクターの物理的な並び
 * （MIL 標準の千鳥番号と同じ考え方）に合わせ、nA → 2n−1、nB → 2n とする。
 */
export const hif40No = (row: 'A' | 'B', n: number) => (row === 'A' ? 2 * n - 1 : 2 * n);

/** PIO パターン（パラメーター No.25）の選択肢 */
export const PIO_PATTERN_PARAM: ParamDef = {
  key: 'pattern',
  label: 'PIO パターン（パラメーター No.25）',
  options: [
    { value: 0, label: '0: 位置決めモード（64点）' },
    { value: 1, label: '1: 教示モード（64点）' },
    { value: 2, label: '2: 256点モード' },
    { value: 3, label: '3: 512点モード' },
    { value: 4, label: '4: 電磁弁モード1（7点）' },
    { value: 5, label: '5: 電磁弁モード2（3点）' },
    { value: 6, label: '6: パルス列制御（インクリメンタル。パルス列仕様のみ）' },
    { value: 7, label: '7: パルス列制御（アブソリュート。パルス列仕様のみ）' },
  ],
  default: 0,
};

/** PIO パターン 0〜5 の入力 IN0〜IN15 の信号（総合カタログ PCON-CB「PIO パターンと信号割付け」） */
const POS_IN: string[][] = [
  ['PC1', 'PC2', 'PC4', 'PC8', 'PC16', 'PC32', '－', '－', '－', 'BKRL', 'RMOD', 'HOME', '*STP', 'CSTR', 'RES', 'SON'],
  ['PC1', 'PC2', 'PC4', 'PC8', 'PC16', 'PC32', 'MODE', 'JISL', 'JOG+', 'JOG-', 'RMOD', 'HOME', '*STP', 'CSTR/PWRT', 'RES', 'SON'],
  ['PC1', 'PC2', 'PC4', 'PC8', 'PC16', 'PC32', 'PC64', 'PC128', '－', 'BKRL', 'RMOD', 'HOME', '*STP', 'CSTR', 'RES', 'SON'],
  ['PC1', 'PC2', 'PC4', 'PC8', 'PC16', 'PC32', 'PC64', 'PC128', 'PC256', 'BKRL', 'RMOD', 'HOME', '*STP', 'CSTR', 'RES', 'SON'],
  ['ST0', 'ST1', 'ST2', 'ST3', 'ST4', 'ST5', 'ST6', '－', '－', 'BKRL', 'RMOD', 'HOME', '*STP', '－', 'RES', 'SON'],
  ['ST0', 'ST1(JOG+)', 'ST2', '－', '－', '－', '－', '－', '－', 'BKRL', 'RMOD', '－', '－', '－', 'RES', 'SON'],
];
/** 同 出力 OUT0〜OUT15（OUT15 は機種で違うため後で差し替える） */
const POS_OUT: string[][] = [
  ['PM1(ALM1)', 'PM2(ALM2)', 'PM4(ALM4)', 'PM8(ALM8)', 'PM16', 'PM32', 'MOVE', 'ZONE1', 'PZONE/ZONE2', 'RMDS', 'HEND', 'PEND', 'SV', '*EMGS', '*ALM', ''],
  ['PM1(ALM1)', 'PM2(ALM2)', 'PM4(ALM4)', 'PM8(ALM8)', 'PM16', 'PM32', 'MOVE', 'MODES', 'PZONE/ZONE1', 'RMDS', 'HEND', 'PEND/WEND', 'SV', '*EMGS', '*ALM', ''],
  ['PM1(ALM1)', 'PM2(ALM2)', 'PM4(ALM4)', 'PM8(ALM8)', 'PM16', 'PM32', 'PM64', 'PM128', 'PZONE/ZONE1', 'RMDS', 'HEND', 'PEND', 'SV', '*EMGS', '*ALM', ''],
  ['PM1(ALM1)', 'PM2(ALM2)', 'PM4(ALM4)', 'PM8(ALM8)', 'PM16', 'PM32', 'PM64', 'PM128', 'PM256', 'RMDS', 'HEND', 'PEND', 'SV', '*EMGS', '*ALM', ''],
  ['PE0', 'PE1', 'PE2', 'PE3', 'PE4', 'PE5', 'PE6', 'ZONE1', 'PZONE/ZONE2', 'RMDS', 'HEND', 'PEND', 'SV', '*EMGS', '*ALM', ''],
  ['LS0', 'LS1(TRQS)', 'LS2', '－', '－', '－', '－', 'ZONE1', 'PZONE/ZONE2', 'RMDS', 'HEND', '－', 'SV', '*EMGS', '*ALM', ''],
];
/** パルス列制御モード（パターン 6/7）の入出力（総合カタログ「パルス列制御モードの I/O 信号」） */
const PULSE_IN = ['SON', 'RES', 'HOME', 'TL', 'CSTP', 'DCLR', 'BKRL', 'RMOD', 'RSTR', 'NC', 'NC', 'NC', 'NC', 'NC', 'NC', 'NC'];
const PULSE_OUT = ['PWR', 'SV', 'INP', 'HEND', 'TLR', '*ALM', '*EMGS', 'RMDS', 'ALM1', 'ALM2', 'ALM4', 'ALM8', '*ALML', 'REND', 'ZONE1', 'ZONE2'];

/**
 * ポジショナーの 40 極 PIO のピン（PCON-CB / ACON-CB / DCON-CB など共通の割付け）。
 * cn はコネクターの端子ID、pattern は PIO パターン（0〜7）、out15 はパターン 0〜5 の OUT15 の信号名。
 */
export function positionerPio40(cn: string, pattern: number, out15 = 'LOAD/TRQS/*ALML'): PioPoint[] {
  const pulse = pattern === 6 || pattern === 7;
  const pat = Math.max(0, Math.min(5, pattern));
  const pts: PioPoint[] = [];
  const add = (row: 'A' | 'B', n: number, kind: PioKind, name: string, func?: string, note?: string) =>
    pts.push({ id: `${cn}#${hif40No(row, n)}`, no: `${n}${row}`, kind, name, ...(func ? { func } : {}), ...(note ? { note } : {}) });
  add('A', 1, 'p24', 'P24', '24V');
  add('A', 2, 'p24', 'P24', '24V');
  add('A', 3, pulse ? 'pulse' : 'nc', pulse ? 'PP' : '－', undefined, pulse ? '差動パルス列入力（+）' : 'パルス列入力（パルス列制御モード以外は未使用）');
  add('A', 4, pulse ? 'pulse' : 'nc', pulse ? '/PP' : '－', undefined, pulse ? '差動パルス列入力（−）' : 'パルス列入力（パルス列制御モード以外は未使用）');
  for (let i = 0; i < 16; i++) {
    const f = pulse ? PULSE_IN[i] : POS_IN[pat][i];
    if (pulse && f === 'NC') add('A', 5 + i, 'nc', `IN${i}`, undefined, 'パルス列制御モードでは未使用');
    else add('A', 5 + i, 'in', `IN${i}`, f === '－' ? undefined : f, pattern === 6 && f === 'RSTR' ? '入力（パターン 7 でのみ使用）' : undefined);
  }
  for (let i = 0; i < 16; i++) {
    const f = pulse ? PULSE_OUT[i] : i === 15 ? out15 : POS_OUT[pat][i];
    add('B', 1 + i, 'out', `OUT${i}`, f === '－' ? undefined : f);
  }
  add('B', 17, pulse ? 'pulse' : 'nc', pulse ? 'NP' : '－', undefined, pulse ? '差動パルス列入力（+）' : 'パルス列入力（パルス列制御モード以外は未使用）');
  add('B', 18, pulse ? 'pulse' : 'nc', pulse ? '/NP' : '－', undefined, pulse ? '差動パルス列入力（−）' : 'パルス列入力（パルス列制御モード以外は未使用）');
  add('B', 19, 'n', 'N', '0V');
  add('B', 20, 'n', 'N', '0V');
  return pts;
}

/** 入出力ポート番号の表記（3 桁。000、300 など） */
export const portNo = (n: number) => String(n).padStart(3, '0');

/**
 * プログラムコントローラー（MSEL・RSEL の PIO ユニットなど）の 40 極 PIO（HIF6）のピン。
 * 1A・2A が P24、5A〜20A が入力ポート inBase〜inBase+15、1B〜16B が出力ポート outBase〜outBase+15、19B・20B が N。
 * 入出力点の名前はポート番号（'IN000'、'OUT300'）にする（PLC の I/O 一覧でアドレスとして表示される）。
 */
export function selPio40(cn: string, inBase: number, outBase: number): PioPoint[] {
  const pts: PioPoint[] = [];
  const add = (row: 'A' | 'B', n: number, kind: PioKind, name: string, func?: string, note?: string) =>
    pts.push({ id: `${cn}#${hif40No(row, n)}`, no: `${n}${row}`, kind, name, ...(func ? { func } : {}), ...(note ? { note } : {}) });
  add('A', 1, 'p24', 'P24', '24V');
  add('A', 2, 'p24', 'P24', '24V');
  add('A', 3, 'nc', '－');
  add('A', 4, 'nc', '－');
  for (let i = 0; i < 16; i++) add('A', 5 + i, 'in', `IN${portNo(inBase + i)}`, undefined, `入力ポート ${portNo(inBase + i)}`);
  for (let i = 0; i < 16; i++) add('B', 1 + i, 'out', `OUT${portNo(outBase + i)}`, undefined, `出力ポート ${portNo(outBase + i)}`);
  add('B', 17, 'nc', '－');
  add('B', 18, 'nc', '－');
  add('B', 19, 'n', 'N', '0V');
  add('B', 20, 'n', 'N', '0V');
  return pts;
}

/** XSEL の標準 I/O の入力ポートの出荷時の機能（I/O パラメーターで変更できる） */
const XSEL_IN_FUNC: Record<number, string> = {
  0: 'プログラムスタート',
  7: 'プログラム番号指定 1',
  8: 'プログラム番号指定 2',
  9: 'プログラム番号指定 4',
  10: 'プログラム番号指定 8',
  11: 'プログラム番号指定 10',
  12: 'プログラム番号指定 20',
  13: 'プログラム番号指定 40',
};
/** XSEL の標準 I/O の出力ポートの出荷時の機能 */
const XSEL_OUT_FUNC: Record<number, string> = { 300: 'アラーム', 301: 'レディー', 302: '非常停止' };

/**
 * XSEL の PIO ボード（50 極 MIL フラットコネクター。XG4M-5030 相当）のピン。
 * - 入力 32 点 / 出力 16 点（N1/P1）: 1 が +24V、2〜33 が入力 inBase〜+31、34〜49 が出力 outBase〜+15、50 が 0V
 * - 入力 16 点 / 出力 32 点（N2/P2）: 1 が +24V、2〜17 が入力 inBase〜+15、18〜49 が出力 outBase〜+31、50 が 0V
 * ピン番号は MIL 標準の番号（ピンID '<CN>#<番号>'）。withFunc を true にすると、出荷時の機能（プログラムスタートなど）を添える。
 */
export function xselPio50(cn: string, layout: '32/16' | '16/32', inBase: number, outBase: number, withFunc = false): PioPoint[] {
  const ins = layout === '32/16' ? 32 : 16;
  const pts: PioPoint[] = [{ id: `${cn}#1`, no: '1', kind: 'p24', name: 'P24', func: '+24V' }];
  for (let i = 0; i < 48; i++) {
    const pin = 2 + i;
    if (i < ins) {
      const port = inBase + i;
      const f = withFunc ? XSEL_IN_FUNC[port] : undefined;
      pts.push({ id: `${cn}#${pin}`, no: String(pin), kind: 'in', name: `IN${portNo(port)}`, note: `入力ポート ${portNo(port)}${f ? `（出荷時: ${f}）` : ''}` });
    } else {
      const port = outBase + i - ins;
      const f = withFunc ? XSEL_OUT_FUNC[port] : undefined;
      pts.push({ id: `${cn}#${pin}`, no: String(pin), kind: 'out', name: `OUT${portNo(port)}`, note: `出力ポート ${portNo(port)}${f ? `（出荷時: ${f}）` : ''}` });
    }
  }
  pts.push({ id: `${cn}#50`, no: '50', kind: 'n', name: 'N', func: '0V' });
  return pts;
}

/** パラメーターから PIO パターンの番号を読む */
export const patternOf = (p: ParamValues) => Number(p.pattern ?? 0) || 0;
