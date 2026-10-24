/**
 * KEYENCE のアンプ内蔵型光電センサ（PR-G、PR-M/F、PZ-V/M、LR-W/X/T など）の機器定義を組み立てる共通部品。
 *
 * 本体の絵（シリーズごとに描く）に、接続形態ごとのケーブル・コネクタを付け、端子・ピン・出力の内部経路を作る。
 * - 'cable': 本体から出たケーブルが先端で色付きの芯線に分かれる。端子ID は芯線の色略号（BN / BU / BK / WH / PK …）
 * - 'M8' / 'M12': 本体に直付けのオスコネクタ。端子は 'CN'（ピンは CN#1〜CN#4）
 * - 'M12-pigtail' / 'M8-pigtail': 短いケーブルの先のオスコネクタ。端子は 'CN'
 * 出力の内部経路は、芯線（ピン）の信号の種類から作る（NPN は出力 → 0V、PNP は出力 → +V）。
 */
import type { DeviceDefinition, InternalLink, ParamDef, ParamValues, PinDef, TerminalDef } from '../types';
import { leadPins, pigtailMale, roundConnector, roundMale, sensorCable, sheathPath, type Lead } from './sensor-parts';

export type PhotoConn = 'cable' | 'M8' | 'M12' | 'M8-pigtail' | 'M12-pigtail';

export interface PhotoOpts {
  type: string;
  name: string;
  model: string;
  description: string;
  labelPrefix?: string;
  category?: DeviceDefinition['category'];
  width: number;
  /** 本体の絵（defs を含む）。見出し（上端の説明）は title で別に描く */
  body: (p: ParamValues) => string;
  /** ケーブル・コネクタが本体から出る位置（下向き） */
  exit: { x: number; y: number };
  conn: PhotoConn;
  /** ケーブルタイプの芯線（表示順） */
  cableLeads: Lead[];
  /** コネクタタイプのピン 1〜4 の芯線（コネクタの場合は必須） */
  pinLeads?: Lead[];
  /** ケーブルの芯線を広げる中心 X（省略時は exit.x） */
  leadCenterX?: number;
  vmin: number;
  vmax: number;
  /** 出力 1 点の定格電流[A] */
  rated: number;
  /** 出力の合計の上限[A]（「2 出力合計 100mA」など。出力が 2 つ以上のときだけ使う） */
  outputTotal?: number;
  params?: ParamDef[];
  loadCurrent?: number;
  /** 上端の見出し */
  title: (p: ParamValues) => string;
  /** ピグテールのケーブル長の表示（例: '0.3m'） */
  pigtailLength?: string;
  /** 増設ユニットの連結 */
  bus?: DeviceDefinition['bus'];
}

/** 芯線（ピン）の信号の種類から、出力の内部経路（NPN は → 0V、PNP は → +V）を作る */
export function outputLinksFromLeads(ids: { id: string; lead: Lead }[], plus: string, minus: string, rated: number) {
  return (p: ParamValues): InternalLink[] => {
    const out: InternalLink[] = [];
    for (const { id, lead } of ids) {
      if (lead.role !== 'out') continue;
      const s = typeof lead.signal === 'function' ? lead.signal(p) : lead.signal;
      if (!s || (s.kind !== 'npn' && s.kind !== 'pnp')) continue;
      out.push({ from: id, to: s.kind === 'pnp' ? plus : minus, switch: 'output', ratedCurrent: rated });
    }
    return out;
  };
}

export function buildPhoto(o: PhotoOpts): DeviceDefinition {
  const W = o.width;
  let H: number;
  let extra: string;
  let terminals: (p: ParamValues) => TerminalDef[];
  let pins: ((p: ParamValues) => PinDef[]) | undefined;
  let links: (p: ParamValues) => InternalLink[];

  if (o.conn === 'cable') {
    const cable = sensorCable({
      cx: o.exit.x,
      y0: o.exit.y,
      yFan: o.exit.y + 52,
      yEnd: o.exit.y + 86,
      pitch: 11,
      centerX: o.leadCenterX ?? o.exit.x,
      leads: o.cableLeads,
      vmin: o.vmin,
      vmax: o.vmax,
    });
    H = o.exit.y + 90;
    extra = cable.svg;
    terminals = cable.terminals;
    const plus = o.cableLeads.find((l) => l.role === 'plus');
    const minus = o.cableLeads.find((l) => l.role === 'minus');
    // 電源線のない機器（増設ユニットなど）は出力の基準側がないので内部経路を作らない
    links =
      plus && minus
        ? outputLinksFromLeads(
            o.cableLeads.map((l) => ({ id: l.id ?? l.color, lead: l })),
            plus.id ?? plus.color,
            minus.id ?? minus.color,
            o.rated,
          )
        : () => [];
  } else {
    const leads = o.pinLeads;
    if (!leads) throw new Error(`${o.type}: コネクタタイプには pinLeads が必要`);
    const size = o.conn.startsWith('M12') ? 'M12' : 'M8';
    let tip: { x: number; y: number };
    if (o.conn.endsWith('pigtail')) {
      const cx = o.leadCenterX ?? o.exit.x;
      const y1 = o.exit.y + 34;
      const m = pigtailMale(cx, y1, size);
      extra = `${sheathPath(o.exit.x, o.exit.y, cx, y1 + 1, 5.5)}${m.svg}${
        o.pigtailLength ? `<text x="${Math.max(o.exit.x, cx) + 6}" y="${o.exit.y + 22}" font-family="sans-serif" font-size="3.2" fill="#555">${o.pigtailLength}</text>` : ''
      }`;
      tip = m.tip;
    } else {
      const m = roundMale(o.exit.x, o.exit.y, size);
      extra = m.svg;
      tip = m.tip;
    }
    H = Math.ceil(tip.y + 6);
    terminals = () => [{ id: 'CN', label: `${size} 4ピン コネクタ（オス）`, x: tip.x, y: tip.y, side: 'bottom', role: 'connector', connector: roundConnector(size) }];
    pins = leadPins('CN', leads, o.vmin, o.vmax);
    const plusIdx = leads.findIndex((l) => l.role === 'plus');
    const minusIdx = leads.findIndex((l) => l.role === 'minus');
    links =
      plusIdx >= 0 && minusIdx >= 0
        ? outputLinksFromLeads(
            leads.map((l, i) => ({ id: `CN#${i + 1}`, lead: l })),
            `CN#${plusIdx + 1}`,
            `CN#${minusIdx + 1}`,
            o.rated,
          )
        : () => [];
  }

  return {
    type: o.type,
    name: o.name,
    model: o.model,
    maker: 'KEYENCE',
    category: o.category ?? 'sensor',
    description: o.description,
    labelPrefix: o.labelPrefix ?? 'PH',
    width: W,
    height: H,
    svg: (p) => `${extra}${o.body(p)}
  ${titleText(W, o.title(p))}`,
    terminals,
    ...(pins ? { pins } : {}),
    links,
    // 出力の合計の上限（出力点のグループとして書く）
    ...(o.outputTotal !== undefined
      ? {
          commonLimits: (p: ParamValues) => {
            const outs = links(p).filter((l) => l.switch === 'output').map((l) => l.from);
            return outs.length > 1 ? [{ outputs: outs, current: o.outputTotal!, label: '制御出力の合計' }] : [];
          },
        }
      : {}),
    ...(o.params ? { params: o.params } : {}),
    ...(o.loadCurrent !== undefined ? { loadCurrent: o.loadCurrent } : {}),
    ...(o.bus ? { bus: o.bus } : {}),
  };
}

/** 上端の見出し。幅に収まるように文字の大きさを下げる（全角 1 文字 ≒ 1em、半角 ≒ 0.55em） */
export function titleText(W: number, text: string) {
  const em = [...text].reduce((n, c) => n + (c.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const size = Math.max(3, Math.min(4.6, +((W - 6) / em).toFixed(2)));
  return `<text x="${W / 2}" y="7" text-anchor="middle" font-family="sans-serif" font-size="${size}" fill="#333">${text}</text>`;
}

/** M8 / M12 の接続ケーブル（generic.m8-4p-cable / generic.m12-4p-cable）の案内文 */
export const cableHint = (conn: PhotoConn) =>
  conn === 'cable' ? '' : `センサーケーブル（generic.${conn.startsWith('M12') ? 'm12' : 'm8'}-4p-cable など、ピン 1 茶・2 白・3 青・4 黒）でつなぐ。`;
