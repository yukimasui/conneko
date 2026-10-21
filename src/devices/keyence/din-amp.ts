/**
 * KEYENCE の DIN レール取付アンプ（アンプ分離型光電センサ PS-N、レーザ LV-N / LR-X、ファイバ PX、RGB CZ-V など）の
 * 機器定義を組み立てる共通部品。見た目は src/devices/keyence/amp.ts の ampBody（側面）に、
 * 左端のヘッドケーブル（またはファイバ）と、右端から出るケーブル（または M8 コネクタ）を付ける。
 *
 * 親機は電源線（茶・青）を持ち、子機は親機の横に連結して電源をもらう（子機の芯線は出力・外部入力だけ）。
 * 親機には bus.host、子機には bus を書き、図面では子機を mount で親機に装着する。
 * 電源線のない子機は出力の基準側（0V / +V）を持たないため、出力の内部経路（switch: 'output'）は作らない。
 */
import type { BusSpec, DeviceDefinition, ParamDef, ParamValues } from '../types';
import { ampBody, ampDefs } from './amp';
import { fsnFibers } from './fs-n';
import { buildPhoto } from './photo';
import type { Lead } from './sensor-parts';

export interface DinAmpOpts {
  type: string;
  name: string;
  model: string;
  description: string;
  labelPrefix: string;
  /** 銘板のシリーズ名（例: 'PS-N 親機'） */
  series: string;
  /** 銘板の型式（例: PS-N11N） */
  modelText: (p: ParamValues) => string;
  /** 上端の見出し */
  title: (p: ParamValues) => string;
  /** 左端: 'fiber' はファイバ 2 本、'head' はセンサヘッドのケーブル */
  left: 'fiber' | 'head';
  /** ヘッドの説明（left: 'head' のとき。例: 'ヘッド PS-xx'） */
  headLabel?: string;
  accent?: string;
  /** 表示（上段・下段） */
  display: [string, string];
  conn: 'cable' | 'M8';
  cableLeads: Lead[];
  pinLeads?: Lead[];
  vmin: number;
  vmax: number;
  rated: number;
  params?: ParamDef[];
  loadCurrent?: number;
  bus?: BusSpec;
}

const BX = 24;
const BY = 22;
const BW = 154;
const BH = 61;

/** センサヘッドへのケーブルと、先のヘッド（小さく描く） */
const headCable = (label: string) => `
  <path d="M${BX - 2} ${BY + 46} C${BX - 14} ${BY + 50} 6 ${BY + 80} 12 ${BY + 104}" fill="none" stroke="#2b2c2e" stroke-width="3.4" stroke-linecap="round"/>
  <rect x="2" y="${BY + 104}" width="22" height="13" rx="1.5" fill="#c9ccd0" stroke="#6d7277" stroke-width="0.6"/>
  <circle cx="8" cy="${BY + 110.5}" r="2.6" fill="#b52a2a" stroke="#6a1010" stroke-width="0.5"/>
  <text x="13" y="${BY + 124}" text-anchor="middle" font-family="sans-serif" font-size="3.2" fill="#555">${label}</text>`;

export function buildDinAmp(o: DinAmpOpts): DeviceDefinition {
  const deco = o.left === 'fiber' ? fsnFibers(BX, BY, BH) : headCable(o.headLabel ?? 'センサヘッド');
  return buildPhoto({
    type: o.type,
    name: o.name,
    model: o.model,
    description: o.description,
    labelPrefix: o.labelPrefix,
    width: BX + BW + 16,
    body: (p) => `${ampDefs}${deco}
  ${ampBody({ x: BX, y: BY, w: BW, h: BH, model: o.modelText(p), top: o.display[0], bottom: o.display[1], left: o.left, accent: o.accent, series: o.series })}`,
    exit: o.conn === 'cable' ? { x: BX + BW - 8, y: BY + BH - 2 } : { x: BX + BW - 14, y: BY + BH },
    // 芯線が多いときは右端からはみ出さないように左へ寄せる
    leadCenterX: Math.min(BX + BW - 24, BX + BW + 8 - ((o.cableLeads.length - 1) * 11) / 2),
    conn: o.conn,
    cableLeads: o.cableLeads,
    pinLeads: o.pinLeads,
    vmin: o.vmin,
    vmax: o.vmax,
    rated: o.rated,
    params: o.params,
    loadCurrent: o.loadCurrent,
    title: o.title,
    bus: o.bus,
  });
}
