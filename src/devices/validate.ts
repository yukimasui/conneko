/**
 * 機器定義の整合性検査（render-device スクリプトと全機器のテストで使う）。
 */
import { resolveDevice } from './resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from './types';

/** 端子の呼び名（hint）の最大文字数。吹き出しが隣の端子と重なりにくい長さにする */
export const HINT_MAX = 10;

/** パラメータの既定値と、各パラメータの全選択肢（ひとつずつ変えたもの）の組み合わせ */
export function paramVariants(def: DeviceDefinition): ParamValues[] {
  const variants: ParamValues[] = [{}];
  for (const p of def.params ?? []) for (const o of p.options) variants.push({ [p.key]: o.value });
  // 装着で決まる先頭番号が変わってもラベルが作れること
  if (def.bus?.io) variants.push({ ioIn: 32, ioOut: 48 });
  return variants;
}

/** 問題の一覧を返す（問題がなければ空） */
export function validateDefinition(def: DeviceDefinition, params: ParamValues = {}): string[] {
  const problems: string[] = [];
  const r = resolveDevice(def, params);
  const ids = new Set<string>();
  if (def.size) {
    const d = def.size(paramsWithDefaults(def, {}));
    if (d.width !== def.width || d.height !== def.height) problems.push(`size の既定値での大きさ（${d.width}×${d.height}）が width / height と違う`);
  }
  for (const t of r.terminals) {
    if (ids.has(t.id)) problems.push(`端子IDが重複: ${t.id}`);
    ids.add(t.id);
    if (t.x < 0 || t.x > r.width || t.y < 0 || t.y > r.height) problems.push(`端子が範囲外: ${t.id}`);
    if (t.role === 'connector' && !t.connector) problems.push(`connector 端子に connector 指定がない: ${t.id}`);
  }
  const pinIds = new Set<string>();
  for (const p of r.pins) {
    const [cn, no] = p.id.split('#');
    const conn = r.terminal(cn)?.connector;
    // 画面に出さないエアのポート（role: 'air' のピン）は、コネクタに属さない
    if (p.role === 'air') {
      if (!p.air) problems.push(`エアのピンに air 指定がない: ${p.id}`);
    } else if (!conn || !(Number(no) >= 1 && Number(no) <= conn.pins)) problems.push(`ピンIDが不正（'<コネクタ端子ID>#<1〜ピン数>'）: ${p.id}`);
    if (pinIds.has(p.id) || ids.has(p.id)) problems.push(`ピンIDが重複: ${p.id}`);
    pinIds.add(p.id);
  }
  for (const id of pinIds) ids.add(id);

  for (const t of [...r.terminals, ...r.pins]) {
    if (t.role === 'supply' && !t.supply) problems.push(`supply 端子に supply 指定がない: ${t.id}`);
    if (t.role === 'input' && !t.accepts) problems.push(`input 端子に accepts 指定がない: ${t.id}`);
    for (const a of r.accepts.get(t.id) ?? []) {
      if (!Number.isFinite(a.minVoltage) || !Number.isFinite(a.maxVoltage) || a.minVoltage > a.maxVoltage) {
        problems.push(`accepts の電圧範囲が不正: ${t.id}`);
      }
    }
    if (t.signal?.common && !ids.has(t.signal.common)) problems.push(`signal.common に存在しない端子: ${t.id} -> ${t.signal.common}`);
    if (t.signal?.ref && !ids.has(t.signal.ref)) problems.push(`signal.ref に存在しない端子: ${t.id} -> ${t.signal.ref}`);
    if (t.signal && t.role !== 'signal') problems.push(`signal は role: 'signal' の端子に指定する: ${t.id}`);
    for (const v of [t.label, t.note, t.hint]) if (v !== undefined && /undefined|NaN/.test(v)) problems.push(`ラベルが不正: ${t.id} "${v}"`);
    if (t.hint !== undefined && (!t.hint.trim() || t.hint.length > HINT_MAX)) problems.push(`hint は 1〜${HINT_MAX} 文字にする: ${t.id} "${t.hint}"`);
  }
  for (const l of r.links) {
    if (!ids.has(l.from) || !ids.has(l.to)) problems.push(`links に存在しない端子: ${l.from} -> ${l.to}`);
    if ((l.directOpening || l.linked) && l.switch !== 'NC' && l.switch !== 'NO') problems.push(`directOpening / linked は接点（switch: 'NC' / 'NO'）に指定する: ${l.from} -> ${l.to}`);
    if (l.safetyContact && l.switch !== 'NC') problems.push(`safetyContact は b 接点（switch: 'NC'）に指定する: ${l.from} -> ${l.to}`);
    if (l.safetyContact && l.actor) problems.push(`safetyContact の接点には actor を書かない（機器の動作では切り換わらない）: ${l.from} -> ${l.to}`);
  }
  for (const l of r.airLinks) {
    if (!r.air.has(l.from) || !r.air.has(l.to)) problems.push(`airLinks に存在しないエアのポート: ${l.from} -> ${l.to}`);
  }
  // 機器の中の負荷（リレーターミナルのコイルなど）と、接点の actor
  const loads = typeof def.internalLoads === 'function' ? def.internalLoads(r.params) : (def.internalLoads ?? []);
  const loadIds = new Set(loads.map((l) => l.id));
  for (const l of loads) for (const t of l.terminals) if (!ids.has(t)) problems.push(`internalLoads ${l.id} に存在しない端子: ${t}`);
  for (const l of r.links) if (l.actor && !loadIds.has(l.actor)) problems.push(`links の actor に存在しない internalLoads: ${l.actor}`);
  for (const [unitPort, hostPort] of Object.entries(def.bus?.host?.airGallery ?? {})) {
    if (!r.air.has(hostPort)) problems.push(`bus.host.airGallery に存在しないエアのポート: ${unitPort} -> ${hostPort}`);
  }
  for (const t of r.terminals) if (t.role === 'air' && !t.air) problems.push(`air 端子に air 指定がない: ${t.id}`);
  for (const g of def.distinctGroups ?? []) {
    for (const id of g) if (!ids.has(id)) problems.push(`distinctGroups に存在しない端子: ${id}`);
  }
  for (const e of def.schematic?.elements ?? []) {
    for (const id of e.terminals) if (!ids.has(id)) problems.push(`schematic.elements に存在しない端子: ${id}`);
    const n = e.kind === 'motor' ? [2, 3] : [2];
    if (!n.includes(e.terminals.length)) problems.push(`schematic.elements の ${e.kind} の端子の数が不正: ${e.terminals.join(', ')}`);
  }
  for (const c of r.commonLimits) {
    if (!c.common === !c.outputs) problems.push('commonLimits は common か outputs のどちらか一方を書く');
    for (const id of [...(c.common ? [c.common] : []), ...(c.outputs ?? [])]) if (!ids.has(id)) problems.push(`commonLimits に存在しない端子: ${id}`);
  }
  for (const g of r.safetyChannels) {
    for (const ch of g.channels) {
      for (const id of [ch.input, ch.source, ch.output]) {
        if (id !== undefined && !ids.has(id)) problems.push(`safetyChannels ${g.id} に存在しない端子: ${id}`);
      }
      if (g.kind === 'input' && !ch.input) problems.push(`safetyChannels ${g.id}: 入力の組に input がない`);
      if (g.kind === 'output' && !ch.output) problems.push(`safetyChannels ${g.id}: 出力の組に output がない`);
    }
  }
  if (def.bus?.host?.numbering && def.bus.host.numbering.unit <= 0) problems.push('bus.host.numbering.unit は正の数にする');

  const svg = typeof def.svg === 'function' ? def.svg(paramsWithDefaults(def, params)) : def.svg;
  for (const m of svg.matchAll(/\bid="([^"]*)"/g)) if (!m[1].includes('{{uid}}')) problems.push(`SVGのidに {{uid}} がない: ${m[1]}`);
  if (/<script|<image|<foreignObject|href="http/i.test(svg)) problems.push('SVGに使用禁止の要素/外部参照がある');
  if (/undefined|NaN/.test(svg)) problems.push('SVGに undefined / NaN が含まれる');
  return problems;
}
