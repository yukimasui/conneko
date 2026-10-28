/**
 * 三菱電機 電磁開閉器 MSO-T（盤組込用。電磁接触器 S-T にサーマルリレー TH-T を直結したもの）の機器定義を作る。
 *
 * 電磁接触器とサーマルリレーの機器定義（絵・端子・内部経路）を組み合わせる。サーマルリレーの上部の接続ピンを
 * 電磁接触器の二次側の端子（2/T1・4/T2・6/T3）に差し込んだ形に描き、
 * 端子は電磁接触器の一次側・コイル・補助接点と、サーマルリレーの二次側（2/T1・4/T2・6/T3）・補助接点 95-96・97-98。
 * 主回路は 1/L1 → 2/T1 などを「主接点（a 接点）とヒーター（保護）を直列にした経路」1 本で表す
 * （switch: 'NO' + protects。保護電流はサーマルリレーのヒーター呼び）。
 * 端子 ID は S-T・TH-T とそろえ、単体の組合せから置き換えても電線はつながったまま。
 */
import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';
import { resolveDevice } from '../resolve';

export interface MsoTSpec {
  type: string;
  /** 型式（例: 'MSO-T21'） */
  modelName: string;
  contactor: DeviceDefinition;
  thermal: DeviceDefinition;
  /** サーマルリレーの絵の、接続ピンの先端の y（電磁接触器の二次側の端子に合わせる位置） */
  pinTopY: number;
  description: string;
  estimated?: string;
}

const LOAD_IDS = ['2/T1', '4/T2', '6/T3'];
const LINE_IDS = ['1/L1', '3/L2', '5/L3'];

/** サーマルリレーの補助接点を動かすもの（過負荷のトリップ）。コイルの動作とは別に切り換える */
const THERMAL = 'thermal';

/** サーマルリレーの絵の id を、電磁接触器の絵の id と重ならないように変える */
const renameIds = (svg: string) => svg.replace(/-\{\{uid\}\}/g, '-th{{uid}}');

export function buildMsoT(spec: MsoTSpec): DeviceDefinition {
  const mc = resolveDevice(spec.contactor);
  const th = resolveDevice(spec.thermal);
  const mcLoad = mc.terminal('2/T1')!;
  const thLine = th.terminal('1/L1')!;
  // サーマルリレーのピンを電磁接触器の二次側の端子の真下に置く
  const dx0 = mcLoad.x - thLine.x;
  const dy = Math.round(mcLoad.y + 2 - spec.pinTopY);
  // 左にはみ出すときは、全体を右へずらす
  const ox = Math.max(0, -dx0);
  const dx = dx0 + ox;
  const W = Math.max(ox + mc.width, dx + th.width);
  const H = Math.max(mc.height, dy + th.height);
  const thCx = dx + th.width / 2;

  const mcSvg = typeof spec.contactor.svg === 'function' ? spec.contactor.svg : () => spec.contactor.svg as string;
  const thSvg = typeof spec.thermal.svg === 'function' ? spec.thermal.svg : () => spec.thermal.svg as string;
  const svg = (p: ParamValues) => `
  <g transform="translate(${ox} 0)">${mcSvg(p)}</g>
  <g transform="translate(${dx} ${dy})">${renameIds(thSvg(p))}</g>`;

  const terminals: TerminalDef[] = [
    // 電磁接触器の下向きの端子（補助接点 14・22 など）は、サーマルリレーにかからないよう横へ出す
    ...mc.terminals
      .filter((t) => !LOAD_IDS.includes(t.id))
      .map((t) => ({ ...t, x: t.x + ox, side: t.side === 'bottom' ? (t.x + ox >= ox + mc.width / 2 ? ('right' as const) : ('left' as const)) : t.side })),
    ...th.terminals
      .filter((t) => !LINE_IDS.includes(t.id))
      .map((t) => ({
        ...t,
        x: t.x + dx,
        y: t.y + dy,
        // サーマルリレーの上向きの端子（補助接点）は、電磁接触器にかからないよう横へ出す
        side: t.side === 'top' ? (t.x + dx >= thCx ? ('right' as const) : ('left' as const)) : t.side,
      })),
  ];

  const mainLinks = mc.links.filter((l) => l.switch === 'NO' && LINE_IDS.includes(l.from) && LOAD_IDS.includes(l.to));
  const links: InternalLink[] = [
    ...mainLinks.map((l) => ({ ...l, protects: true })),
    ...mc.links.filter((l) => !mainLinks.includes(l)),
    // サーマルリレーの補助接点（95-96・97-98）は過負荷のトリップで切り換わる。コイルを入れても切り換わらないよう、別の動作の単位にする
    ...th.links.filter((l) => !l.protects).map((l) => (l.switch ? { ...l, actor: THERMAL } : l)),
  ];

  const heater = spec.thermal.params?.find((p) => p.key === 'heater');
  return {
    type: spec.type,
    name: '電磁開閉器',
    model: `${spec.modelName} AC200V`,
    maker: '三菱電機',
    category: 'contactor',
    description: spec.description,
    labelPrefix: 'MS',
    width: W,
    height: H,
    svg,
    terminals,
    links,
    internalLoads: [{ id: THERMAL, label: 'サーマルリレー（過負荷のトリップ）', terminals: ['95', '96'] }],
    params: heater ? [heater] : [],
    protectionCurrent: { param: 'heater' },
    loadCurrent: spec.contactor.loadCurrent,
    distinctGroups: spec.contactor.distinctGroups,
    safety: spec.contactor.safety,
    ...(spec.estimated ? { estimated: spec.estimated } : {}),
  };
}
