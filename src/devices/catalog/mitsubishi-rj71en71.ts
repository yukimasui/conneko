import { IQR_BUS } from '../mitsubishi/melsec';
import { IQR_H, IQR_W, iqrBody, iqrDefs, rj45Svg, text, type IqrLed } from '../mitsubishi/iqr-parts';
import type { DeviceDefinition } from '../types';

/**
 * 三菱電機 MELSEC iQ-R シリーズ Ethernet インタフェースユニット RJ71EN71。
 * 外形 W27.8 × H106 × D110 mm（1mm ≒ 2px）。上部に RUN・ERR などの LED、正面下部に RJ-45 ポートが縦に 2 個（上が P1、下が P2）。
 * 1000BASE-T / 100BASE-TX / 10BASE-T。ネットワークの種類をパラメータ（GX Works3）で Ethernet・CC-Link IE コントロール・
 * CC-Link IE フィールドから選べる。入出力番号を 32 点占有する。
 *
 * 2 ポートのネットワークユニット（RJ71GF11-T2 など）は外形が同じなので、定義の生成は buildIqrNetworkUnit にまとめている。
 */

export interface IqrNetworkUnitOptions {
  type: string;
  model: string;
  name: string;
  description: string;
  labelPrefix: string;
  leds: IqrLed[];
  /** 正面の表示（ネットワーク名） */
  badge: string;
  /** ポートの通信方式（両ポート共通） */
  protocols: string[];
  /** 内部消費電流 DC5V[A] */
  load5V: number;
  /** 占有する入出力の点数 */
  points: number;
  estimated?: string;
}

const P1 = { x: 33, y: 132 };
const P2 = { x: 33, y: 178 };
const PORT = { w: 23, h: 21 };

export function buildIqrNetworkUnit(o: IqrNetworkUnitOptions): DeviceDefinition {
  const svg = `
  ${iqrDefs()}
  ${iqrBody(o.model, o.leds, 36)}
  <rect x="1.5" y="40" width="${IQR_W - 3}" height="${IQR_H - 46}" rx="1" fill="url(#lower-{{uid}})"/>
  <text x="4" y="54" font-family="sans-serif" font-size="${o.badge.length > 10 ? 3.4 : 4.4}" font-weight="bold" font-style="italic" fill="#f2f3f4">${o.badge}</text>
  ${text(4, 62, '1000BASE-T', 2.8, '#d5d7da', 'start', 'normal')}
  ${text(7, P1.y - 13, 'P1', 3.6, '#f2f3f4')}
  ${rj45Svg(P1.x, P1.y, PORT.w, PORT.h)}
  <rect x="4" y="${P1.y - 6}" width="4" height="2.6" rx="0.4" fill="url(#green-{{uid}})"/>${text(6, P1.y + 1, 'LINK', 2.2, '#d5d7da')}
  ${text(7, P2.y - 13, 'P2', 3.6, '#f2f3f4')}
  ${rj45Svg(P2.x, P2.y, PORT.w, PORT.h)}
  <rect x="4" y="${P2.y - 6}" width="4" height="2.6" rx="0.4" fill="#2a2b2e"/>${text(6, P2.y + 1, 'LINK', 2.2, '#d5d7da')}
`;
  const port = (id: 'P1' | 'P2', at: { x: number; y: number }) => ({
    id,
    label: `${id} (RJ45)`,
    x: at.x,
    y: at.y,
    side: 'bottom' as const,
    role: 'connector' as const,
    connector: { kind: 'RJ45', pins: 0, width: PORT.w, length: PORT.h, facing: 'front' as const, protocols: o.protocols },
    optional: true,
  });
  return {
    type: o.type,
    name: o.name,
    model: o.model,
    maker: '三菱電機',
    category: 'plc',
    description: o.description,
    ...(o.estimated ? { estimated: o.estimated } : {}),
    labelPrefix: o.labelPrefix,
    width: IQR_W,
    height: IQR_H,
    svg,
    terminals: [port('P1', P1), port('P2', P2)],
    // 入出力番号を占有するだけ（外部の入出力端子はない）
    bus: { kind: IQR_BUS, load: { '5V': o.load5V }, io: { reserve: o.points, format: 'hex' } },
  };
}

const def: DeviceDefinition = buildIqrNetworkUnit({
  type: 'mitsubishi.rj71en71',
  model: 'RJ71EN71',
  name: 'PLC Ethernet ユニット',
  labelPrefix: 'ETH',
  leds: [{ t: 'RUN', on: 'g' }, { t: 'ERR' }, { t: 'P1 SPEED' }, { t: 'P1 LINK', on: 'g' }, { t: 'P2 SPEED' }, { t: 'P2 LINK' }],
  badge: 'Ethernet',
  protocols: ['ethernet', 'slmp', 'cc-link-ie-control', 'cc-link-ie-field'],
  load5V: 0.82,
  points: 32,
  description:
    '三菱電機 MELSEC iQ-R シリーズの Ethernet インタフェースユニット（RJ-45 × 2 ポート P1・P2、1000BASE-T / 100BASE-TX / 10BASE-T）。CPU 内蔵の Ethernet ポートとは別のネットワーク（設備の上位 LAN・別のセグメント）に PLC をつなぐときに使う。SLMP（MC プロトコル）・ソケット通信・FTP などに対応し、ユニットのパラメータでネットワークの種類を CC-Link IE コントロール・CC-Link IE フィールドにも切り換えられる。ベースユニットの入出力スロットに装着し、入出力番号を 32 点占有する。内部消費電流 DC5V 0.82A。',
});

export default def;
