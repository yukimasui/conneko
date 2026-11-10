/**
 * 産業用ロボットの追加分（issue #81 の 3 回目。docs/robot-catalog.md）の機器定義の整合性と、代表的な配線での電気チェックの確認。
 * - デンソーウェーブ VS-060・RC8A・ティーチングペンダント・ハンド I/O ケーブル
 * - 川崎重工業 RS007N・E01・ティーチペンダント・I/O ケーブル
 * - ファナック SR-3iA（スカラ）と R-30iB Compact Plus、M-1iA（パラレルリンク）と R-30iB Mate Plus
 *
 * どのメーカーも同じ観点で確かめる: 専用ケーブルでの接続（適合・取り違え・ほかのメーカー・つなぎ忘れ・部品表）、
 * 周辺機器 I/O と PLC（極性・I/O 表）、出力で負荷を駆動、手先の I/O、安全入力（片側だけ・取り違え・a 接点）。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { bomRows, ioRows } from '../export/reports';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { ioSystem } from '../model/io';
import { mateCandidates } from '../model/mates';
import { familyOf } from './families';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

let seq = 0;
const wire = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const cable = (from: string, to: string) => wire(from, to, { wireType: 'CABLE' });
const dev = (id: string, type: string, params?: DiagramDevice['params']): DiagramDevice => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}) });
const lookup = (t: string) => getDeviceDefinition(t);
const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};
const check = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => check(d).filter((i) => i.severity === 'error');
const rulesOf = (d: Diagram) => check(d).map((i) => i.rule);

/** 1 つのメーカーのロボット・コントローラーの組と、テストに使う端子の名前 */
interface RobotSet {
  title: string;
  maker: string;
  robot: string;
  controller: string;
  pendant?: string;
  /** そのほかの機器（ケーブルなど） */
  others: string[];
  /** 電源: 三相なら ['L1','L2','L3']、単相なら ['L','N'] */
  power: string[];
  /** ロボット接続: [コントローラーの端子, ロボットの端子][]（1 本目と 2 本目を入れ替えると取り違え） */
  links: [string, string][];
  /** ロボット接続ケーブルの部品表の型式 */
  cableModels: string[];
  /** ペンダントのコネクター [コントローラー, ペンダント] */
  tp?: [string, string];
  /** 安全入力の組: [出力側, 入力側][] を 2 チャンネルずつ */
  safety: [[string, string], [string, string]][];
}

const SETS: RobotSet[] = [
  {
    title: 'デンソーウェーブ VS-060 と RC8A',
    maker: 'デンソーウェーブ',
    robot: 'denso.vs-060',
    controller: 'denso.rc8a',
    pendant: 'denso.rc8a-tp',
    others: ['denso.hand-io-cable'],
    power: ['L1', 'L2', 'L3'],
    links: [
      ['MOTOR', 'MOTOR'],
      ['ENCODER', 'ENCODER'],
    ],
    cableModels: ['ロボット接続ケーブル（モーター、VS 用）', 'ロボット接続ケーブル（エンコーダー、VS 用）'],
    tp: ['TP', 'TP'],
    safety: [
      [
        ['ES1+', 'ES1-'],
        ['ES2+', 'ES2-'],
      ],
      [
        ['PS1+', 'PS1-'],
        ['PS2+', 'PS2-'],
      ],
      [
        ['EA1+', 'EA1-'],
        ['EA2+', 'EA2-'],
      ],
    ],
  },
  {
    title: '川崎重工業 RS007N と E01',
    maker: '川崎重工業',
    robot: 'kawasaki.rs007n',
    controller: 'kawasaki.e01',
    pendant: 'kawasaki.e01-tp',
    others: ['kawasaki.io-cable-d37', 'kawasaki.rs007n-user-cable'],
    power: ['L1', 'L2', 'L3'],
    links: [
      ['X1', 'X1'],
      ['X2', 'X2'],
    ],
    cableModels: ['モーターハーネス（RS007N 用）', '信号ハーネス（RS007N 用）'],
    tp: ['TP', 'TP'],
    safety: [
      [
        ['EMS1+', 'EMS1-'],
        ['EMS2+', 'EMS2-'],
      ],
      [
        ['SFS1+', 'SFS1-'],
        ['SFS2+', 'SFS2-'],
      ],
    ],
  },
  {
    title: 'ファナック SR-3iA（スカラ）と R-30iB Compact Plus',
    maker: 'ファナック',
    robot: 'fanuc.sr-3ia',
    controller: 'fanuc.r-30ib-compact-plus',
    pendant: 'fanuc.ipendant',
    others: [],
    power: ['L', 'N'],
    links: [
      ['RM1', 'RM1'],
      ['RP1', 'RP1'],
    ],
    cableModels: ['ロボット接続ケーブル RM1（SR-3iA 用）', 'ロボット接続ケーブル RP1（SR-3iA 用）'],
    tp: ['TP', 'TP'],
    safety: [
      [
        ['EES1', 'EES11'],
        ['EES2', 'EES21'],
      ],
      [
        ['EAS1', 'EAS11'],
        ['EAS2', 'EAS21'],
      ],
    ],
  },
  {
    title: 'ファナック M-1iA（パラレルリンク）と R-30iB Mate Plus',
    maker: 'ファナック',
    robot: 'fanuc.m-1ia',
    controller: 'fanuc.r-30ib-mate-plus',
    pendant: 'fanuc.ipendant',
    others: [],
    power: ['L', 'N'],
    links: [
      ['RM1', 'RM1'],
      ['RP1', 'RP1'],
    ],
    cableModels: ['ロボット接続ケーブル RM1（M-1iA 用）', 'ロボット接続ケーブル RP1（M-1iA 用）'],
    tp: ['TP', 'TP'],
    safety: [
      [
        ['EES1', 'EES11'],
        ['EES2', 'EES21'],
      ],
      [
        ['EAS1', 'EAS11'],
        ['EAS2', 'EAS21'],
      ],
    ],
  },
];

/** 電源（三相 200V）・ロボット接続・ペンダント・安全入力の短絡線をつないだセル */
const cellOf = (s: RobotSet): Diagram => {
  const d: Diagram = {
    devices: [dev('SRC1', 'generic.power-source.3p200v'), dev('RC1', s.controller), dev('RB1', s.robot), ...(s.pendant ? [dev('TP1', s.pendant)] : [])],
    wires: [],
  };
  const phases = ['R', 'S', 'T'];
  s.power.forEach((t, i) => d.wires.push(wire(`SRC1.${phases[i]}`, `RC1.${t}`, { sizeSq: 2 })));
  d.wires.push(wire('SRC1.PE', 'RC1.PE', { sizeSq: 2 }));
  for (const [c, r] of s.links) d.wires.push(cable(`RC1.${c}`, `RB1.${r}`));
  if (s.tp && s.pendant) d.wires.push(cable(`RC1.${s.tp[0]}`, `TP1.${s.tp[1]}`));
  for (const g of s.safety) for (const [src, inp] of g) d.wires.push(wire(`RC1.${src}`, `RC1.${inp}`));
  return d;
};

describe.each(SETS)('$title', (s) => {
  const cell = () => cellOf(s);
  const types = [s.robot, s.controller, ...(s.pendant ? [s.pendant] : []), ...s.others];

  it.each(types)('%s: すべてのパラメーターの組で定義が整合し、コネクターのピンがそろっていて、推定を書いている', (type) => {
    const d = def(type);
    for (const v of paramVariants(d)) {
      expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
      const r = resolveDevice(d, v);
      for (const t of r.terminals) {
        if (!t.connector || t.connector.pins === 0) continue;
        expect(r.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length, `${t.id} のピン数`).toBe(t.connector.pins);
      }
      for (const l of r.links) {
        const from = r.terminal(l.from) ?? r.pin(l.from);
        if (from?.signal?.dir === 'out') expect(l.switch, `${type} ${l.from}`).toBe('output');
      }
    }
    expect(d.estimated, type).toBeTruthy();
    expect(d.maker).toBe(s.maker);
  });

  it('ロボットは「ロボット」、コントローラーは「ロボットコントローラー」、ペンダントはティーチングペンダントのファミリーに入る', () => {
    expect(familyOf(s.robot)?.id).toBe('robot');
    expect(familyOf(s.controller)?.id).toBe('robot-controller');
    if (s.pendant) expect(familyOf(s.pendant)?.id).toBe(familyOf('fanuc.ipendant')?.id);
  });

  it('ロボット接続ケーブルでつなぐとエラー・コネクターの指摘はない', () => {
    const d = cell();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('connector-mismatch');
    expect(rulesOf(d)).not.toContain('connector-unconnected');
  });

  it('ロボット接続の 2 本を取り違える・ほかのメーカーのコントローラーにつなぐと connector-mismatch', () => {
    if (s.links.length > 1) {
      const swapped = cell();
      swapped.wires = swapped.wires.filter((x) => !(x.wireType === 'CABLE' && x.to.device === 'RB1'));
      swapped.wires.push(cable(`RC1.${s.links[0][0]}`, `RB1.${s.links[1][1]}`), cable(`RC1.${s.links[1][0]}`, `RB1.${s.links[0][1]}`));
      expect(rulesOf(swapped)).toContain('connector-mismatch');
    }
    const fanuc: Diagram = { devices: [dev('RC1', 'fanuc.r-30ib-mini-plus'), dev('RB1', s.robot)], wires: [cable('RC1.RM1', `RB1.${s.links[0][1]}`)] };
    expect(rulesOf(fanuc)).toContain('connector-mismatch');
    const yaskawa: Diagram = { devices: [dev('RC1', s.controller), dev('RB1', 'yaskawa.gp7')], wires: [cable(`RC1.${s.links[0][0]}`, 'RB1.X1')] };
    expect(rulesOf(yaskawa)).toContain('connector-mismatch');
  });

  it('ロボット側のコネクターは、ほかのどの機器のコネクターとも合わない（適合するコントローラーを除く）', () => {
    const rb = resolveDevice(def(s.robot));
    for (const [, r] of s.links) {
      const c = rb.terminal(r)!.connector!;
      for (const d of deviceDefinitions.filter((x) => x.type !== s.controller && x.type !== s.robot)) {
        for (const t of resolveDevice(d).terminals) {
          if (t.connector) expect(connectorsMate(c, t.connector), `${d.type}.${t.id}`).toBe(false);
        }
      }
    }
  });

  it('ロボットのロボット接続から引くと、候補は適合するコントローラーだけで、残りの接続もまとめてつなぐ', () => {
    const d: Diagram = { devices: [dev('RB1', s.robot)], wires: [] };
    const found = mateCandidates(d, { device: 'RB1', terminal: s.links[0][1] }, deviceDefinitions, lookup);
    expect(found.map((c) => c.type)).toEqual([s.controller]);
    expect(found[0].pairs).toEqual(s.links.map(([c, r]) => ({ from: r, to: c })));
    if (s.tp && s.pendant) {
      const rc: Diagram = { devices: [dev('RC1', s.controller)], wires: [] };
      expect(mateCandidates(rc, { device: 'RC1', terminal: s.tp[0] }, deviceDefinitions, lookup).map((c) => c.type)).toEqual([s.pendant]);
    }
  });

  it('ロボット接続ケーブルをつなぎ忘れると、ロボットとコントローラーの両方に connector-unconnected', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => x.to.device !== 'RB1');
    const keys = check(d)
      .filter((i) => i.rule === 'connector-unconnected')
      .map((i) => i.key)
      .sort();
    expect(keys).toEqual(s.links.flatMap(([c, r]) => [`unconnected:RB1:${r}`, `unconnected:RC1:${c}`]).sort());
  });

  it('部品表にロボット接続ケーブルが 1 本ずつ載る', () => {
    const rows = bomRows(cell(), lookup).filter((r) => r.maker === s.maker);
    for (const m of s.cableModels) expect(rows.find((r) => r.model === m)?.qty, m).toBe(1);
  });

  it('直流を電源につなぐと電源の種類の指摘になる', () => {
    const d = cell();
    d.devices.push(dev('PSU1', 'generic.psu.dc24v'));
    d.wires = d.wires.filter((x) => !(x.to.device === 'RC1' && s.power.includes(x.to.terminal)));
    d.wires.push(wire('PSU1.+V1', `RC1.${s.power[0]}`), wire('PSU1.-V1', `RC1.${s.power[1]}`));
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });

  describe('安全入力', () => {
    const [first] = s.safety;
    const [[src1, in1], [src2, in2]] = first;
    const safetyRules = (d: Diagram) => check(d).filter((i) => i.devices.includes('RC1') && /safety|estop|direct/.test(i.rule));

    it('非常停止スイッチの b 接点 2 回路を入れるとエラー・注意なし。使わない信号の短絡線も指摘なし', () => {
      const d = cell();
      d.devices.push(dev('ES1', 'idec.xw1e-bv402mr'));
      d.wires = d.wires.filter((x) => ![src1, src2].includes(x.from.terminal));
      d.wires.push(wire(`RC1.${src1}`, 'ES1.21'), wire('ES1.22', `RC1.${in1}`), wire(`RC1.${src2}`, 'ES1.41'), wire('ES1.42', `RC1.${in2}`));
      expect(safetyRules(d)).toEqual([]);
      expect(errorsOf(d)).toEqual([]);
      expect(safetyRules(cell())).toEqual([]);
    });

    it.each(s.safety.map((g) => [g[0][1], g] as const))('%s: 片側だけを配線すると safety-channel-partial のエラー', (_, g) => {
      const d = cell();
      d.wires = d.wires.filter((x) => x.from.terminal !== g[0][0]);
      const found = check(d).filter((i) => i.rule === 'safety-channel-partial');
      expect(found.map((i) => i.severity)).toEqual(['error']);
      expect(found[0].message).toContain(g[0][1]);
    });

    it('チャンネルを取り違えると safety-channel-cross、ループに a 接点を入れると estop-not-nc', () => {
      const cross = cell();
      cross.wires = cross.wires.filter((x) => ![src1, src2].includes(x.from.terminal));
      cross.wires.push(wire(`RC1.${src1}`, `RC1.${in2}`), wire(`RC1.${src2}`, `RC1.${in1}`));
      expect(rulesOf(cross)).toContain('safety-channel-cross');

      const last = s.safety[s.safety.length - 1];
      const ano = cell();
      ano.devices.push(dev('MC1', 'mitsubishi.s-t10.ac200v'));
      ano.wires = ano.wires.filter((x) => x.from.terminal !== last[0][0]);
      ano.wires.push(wire(`RC1.${last[0][0]}`, 'MC1.13'), wire('MC1.14', `RC1.${last[0][1]}`));
      expect(rulesOf(ano)).toContain('estop-not-nc');
    });
  });
});

/* ------------------------------------------------------------------ */
/* デンソーウェーブ RC8A のミニ I/O・ハンド I/O                          */
/* ------------------------------------------------------------------ */

describe('RC8A のミニ I/O（PLC との受け渡し・I/O 表）', () => {
  const cell = () => cellOf(SETS[0]);

  it('ピンの割付け: +24V・ユーザー入力・システム入力・ユーザー出力・システム出力・0V が並ぶ（入力 22 点・出力 24 点）。MIL 50 極の変換端子台とつながる', () => {
    const r = resolveDevice(def('denso.rc8a'));
    expect(r.pin('MINIIO#1')).toMatchObject({ label: '+24V（1）', role: 'supply' });
    expect(r.pin('MINIIO#3')).toMatchObject({ label: 'IN0（3）', signal: { dir: 'in', kind: 'dc', common: 'MINIIO#1' } });
    expect(r.pin('MINIIO#11')?.label).toBe('SI0 ステップストップ（11）');
    expect(r.pin('MINIIO#25')).toMatchObject({ label: 'OUT0（25）', signal: { dir: 'out', kind: 'npn' } });
    expect(r.pin('MINIIO#49')).toMatchObject({ label: '0V（49）', role: 'supply' });
    const io = r.pins.filter((p) => p.id.startsWith('MINIIO#'));
    expect(io.filter((p) => p.signal?.dir === 'in').length).toBe(8 + 14);
    expect(io.filter((p) => p.signal?.dir === 'out').length).toBe(8 + 16);
    const tb = resolveDevice(def('generic.mil-terminal-block.50p')).terminal('CN')!.connector!;
    expect(connectorsMate(r.terminal('MINIIO')!.connector!, tb)).toBe(true);
  });

  /** KEYENCE KV-C32TC（NPN 出力）の No.1 → 34 極の変換端子台 1 → 50 極の変換端子台 3（IN0）。PLC の 0V とミニ I/O の 0V をそろえる */
  const plc = (): Diagram => {
    const d = cell();
    d.devices.push(dev('PSU1', 'generic.psu.dc24v'), dev('OUT1', 'keyence.kv-c32tc.output'), dev('TB1', 'generic.mil-terminal-block.34p'), dev('TB2', 'generic.mil-terminal-block.50p'));
    d.wires.push(cable('OUT1.CN1', 'TB1.CN'), cable('RC1.MINIIO', 'TB2.CN'), wire('PSU1.-V1', 'TB1.33'), wire('TB1.1', 'TB2.3'), wire('TB2.49', 'PSU1.-V2'));
    return d;
  };

  it('PLC の NPN 出力で IN0 を駆動しても極性の指摘はなく、I/O 表に PLC の出力とのつながりが出る', () => {
    const d = plc();
    expect(errorsOf(d)).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    const in0 = points.find((p) => p.address === 'IN0')!;
    expect(in0).toMatchObject({ dir: 'in', kind: 'dc' });
    expect(in0.connections.map((c) => c.name)).toContain('OUT1.CN1#1');
    expect(points.find((p) => p.address === 'SI0')?.label).toBe('SI0 ステップストップ（11）');
    const rows = ioRows(d, lookup).filter((r) => r.host === 'RC1');
    // ミニ I/O（入力 22・出力 24）とハンド I/O（入力 8・出力 8）
    expect(rows.filter((r) => r.dir === '入力').length).toBe(22 + 8);
    expect(rows.filter((r) => r.dir === '出力').length).toBe(24 + 8);
    expect(rows.find((r) => r.address === 'IN0')?.connections).toContain('OUT1.CN1#1');
    // PLC 側の I/O 表にもロボットコントローラーの入力が出る
    expect(ioRows(d, lookup).find((r) => r.unit === 'OUT1' && r.connections.includes('RC1'))?.connections).toContain('RC1.MINIIO#3');
  });

  it('PNP のセンサーをプラスコモンの入力につなぐと signal-polarity', () => {
    const d = cell();
    d.devices.push(dev('TB2', 'generic.mil-terminal-block.50p'), dev('S1', 'keyence.pz-g41', { output: 'P' }));
    d.wires.push(cable('RC1.MINIIO', 'TB2.CN'), wire('TB2.1', 'S1.BN', { sizeSq: 0.3 }), wire('TB2.49', 'S1.BU', { sizeSq: 0.3 }), wire('S1.BK', 'TB2.4', { sizeSq: 0.3 }));
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('ユーザー出力 OUT0 でリレーを駆動: +24V から受電でき、電源が来ている', () => {
    const d = cell();
    d.devices.push(dev('TB2', 'generic.mil-terminal-block.50p'), dev('K1', 'omron.my2n.dc24'));
    d.wires.push(cable('RC1.MINIIO', 'TB2.CN'), wire('TB2.2', 'K1.14', { sizeSq: 0.3 }), wire('K1.13', 'TB2.25', { sizeSq: 0.3 }));
    expect(check(d).filter((i) => i.devices.includes('K1') && (i.severity === 'error' || i.rule === 'no-power'))).toEqual([]);
  });

  it('ハンド I/O ケーブルのセンサー・リレーが、ロボットの中とエンコーダーケーブルを通ってコントローラーの HI0・HO0 に出る', () => {
    const d = cell();
    d.devices.push(dev('CBL1', 'denso.hand-io-cable'), dev('S1', 'keyence.pz-g41'), dev('K1', 'omron.my2n.dc24'));
    d.wires.push(
      cable('RB1.HAND', 'CBL1.CN'),
      wire('CBL1.+24V-17', 'S1.BN', { sizeSq: 0.3 }),
      wire('CBL1.0V-19', 'S1.BU', { sizeSq: 0.3 }),
      wire('S1.BK', 'CBL1.HI0', { sizeSq: 0.3 }),
      wire('CBL1.+24V-18', 'K1.14', { sizeSq: 0.3 }),
      wire('K1.13', 'CBL1.HO0', { sizeSq: 0.3 }),
    );
    expect(errorsOf(d)).toEqual([]);
    expect(check(d).filter((i) => i.devices.includes('K1') && i.rule === 'no-power')).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    expect(points.find((p) => p.address === 'HI0')?.connections.map((c) => c.name)).toContain('S1.BK');
    expect(points.find((p) => p.address === 'HO0')?.connections.map((c) => c.name)).toContain('K1.13');
    // ハンド I/O ケーブルはロボットのハンド I/O から引いたときの候補
    const rb: Diagram = { devices: [dev('RB1', 'denso.vs-060')], wires: [] };
    expect(mateCandidates(rb, { device: 'RB1', terminal: 'HAND' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['denso.hand-io-cable']);
  });
});

/* ------------------------------------------------------------------ */
/* 川崎重工業 E01 の汎用入出力（D-sub 37 ピン）                          */
/* ------------------------------------------------------------------ */

describe('E01 の汎用入出力（PLC との受け渡し・I/O 表）', () => {
  const kawasaki = SETS.find((x) => x.controller === 'kawasaki.e01')!;
  const cell = () => cellOf(kawasaki);

  it('ピンの割付け: 入力 1001〜1032（CN2）・出力 1〜32（CN4）と +24V・0V。I/O ケーブルが CN2・CN4 のどちらにも合う', () => {
    const r = resolveDevice(def('kawasaki.e01'));
    expect(r.pin('CN2#1')).toMatchObject({ label: 'IN1001（1）', signal: { dir: 'in', kind: 'dc', common: 'CN2#33' } });
    expect(r.pin('CN4#1')).toMatchObject({ label: 'OUT1（1）', signal: { dir: 'out', kind: 'npn' } });
    expect(r.pin('CN4#33')).toMatchObject({ role: 'supply' });
    expect(r.pins.filter((p) => p.signal?.dir === 'in').length).toBe(32);
    expect(r.pins.filter((p) => p.signal?.dir === 'out').length).toBe(32);
    const c = resolveDevice(def('kawasaki.io-cable-d37')).terminal('CN')!.connector!;
    expect(connectorsMate(r.terminal('CN2')!.connector!, c)).toBe(true);
    expect(connectorsMate(r.terminal('CN4')!.connector!, c)).toBe(true);
    const rc: Diagram = { devices: [dev('RC1', 'kawasaki.e01')], wires: [] };
    expect(mateCandidates(rc, { device: 'RC1', terminal: 'CN2' }, deviceDefinitions, lookup).map((x) => x.type)).toContain('kawasaki.io-cable-d37');
  });

  /** KEYENCE KV-C32TC（NPN 出力）の No.1 → 34 極の変換端子台 1 → I/O ケーブルの芯線 1（入力 1001）。0V をそろえる */
  const plc = (): Diagram => {
    const d = cell();
    d.devices.push(dev('PSU1', 'generic.psu.dc24v'), dev('OUT1', 'keyence.kv-c32tc.output'), dev('TB1', 'generic.mil-terminal-block.34p'), dev('CBI', 'kawasaki.io-cable-d37'));
    d.wires.push(cable('OUT1.CN1', 'TB1.CN'), cable('RC1.CN2', 'CBI.CN'), wire('PSU1.-V1', 'TB1.33'), wire('TB1.1', 'CBI.1'), wire('CBI.35', 'PSU1.-V2'));
    return d;
  };

  it('PLC の NPN 出力で入力 1001 を駆動しても極性の指摘はなく、I/O 表に PLC の出力とのつながりが出る', () => {
    const d = plc();
    expect(errorsOf(d)).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    const in1 = points.find((p) => p.address === 'IN1001')!;
    expect(in1).toMatchObject({ dir: 'in', kind: 'dc' });
    expect(in1.connections.map((c) => c.name)).toContain('OUT1.CN1#1');
    const rows = ioRows(d, lookup).filter((r) => r.host === 'RC1');
    expect(rows.filter((r) => r.dir === '入力').length).toBe(32);
    expect(rows.filter((r) => r.dir === '出力').length).toBe(32);
    expect(rows.find((r) => r.address === 'IN1001')?.connections).toContain('OUT1.CN1#1');
  });

  it('PNP のセンサーをプラスコモンの入力につなぐと signal-polarity', () => {
    const d = cell();
    d.devices.push(dev('CBI', 'kawasaki.io-cable-d37'), dev('S1', 'keyence.pz-g41', { output: 'P' }));
    d.wires.push(cable('RC1.CN2', 'CBI.CN'), wire('CBI.33', 'S1.BN', { sizeSq: 0.3 }), wire('CBI.35', 'S1.BU', { sizeSq: 0.3 }), wire('S1.BK', 'CBI.2', { sizeSq: 0.3 }));
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('出力 1 でリレーを駆動: +24V から受電でき、電源が来ている', () => {
    const d = cell();
    d.devices.push(dev('CBO', 'kawasaki.io-cable-d37'), dev('K1', 'omron.my2n.dc24'));
    d.wires.push(cable('RC1.CN4', 'CBO.CN'), wire('CBO.33', 'K1.14', { sizeSq: 0.3 }), wire('K1.13', 'CBO.1', { sizeSq: 0.3 }));
    expect(check(d).filter((i) => i.devices.includes('K1') && (i.severity === 'error' || i.rule === 'no-power'))).toEqual([]);
    expect(ioSystem(d, 'RC1', lookup)!.units[0].points.find((p) => p.address === 'OUT1')?.connections.map((c) => c.name)).toContain('K1.13');
  });

  it('ハンドのセンサーを信号線（アーム側 UA → ベース側 UB）で入力 1001 へつなぐと、I/O 表にセンサーが出る', () => {
    const d = cell();
    d.devices.push(dev('CBI', 'kawasaki.io-cable-d37'), dev('CBU', 'kawasaki.rs007n-user-cable'), dev('CBB', 'kawasaki.rs007n-user-cable'), dev('S1', 'keyence.pz-g41'));
    d.wires.push(
      cable('RC1.CN2', 'CBI.CN'),
      cable('RB1.UA', 'CBU.CN'),
      cable('RB1.UB', 'CBB.CN'),
      // ベース側: 1 = +24V、2 = 0V、3 = センサーの出力
      wire('CBB.1', 'CBI.33', { sizeSq: 0.3 }),
      wire('CBB.2', 'CBI.35', { sizeSq: 0.3 }),
      wire('CBB.3', 'CBI.1', { sizeSq: 0.3 }),
      // アーム側: センサー（NPN）
      wire('CBU.1', 'S1.BN', { sizeSq: 0.3 }),
      wire('CBU.2', 'S1.BU', { sizeSq: 0.3 }),
      wire('S1.BK', 'CBU.3', { sizeSq: 0.3 }),
    );
    expect(errorsOf(d)).toEqual([]);
    expect(ioSystem(d, 'RC1', lookup)!.units[0].points.find((p) => p.address === 'IN1001')?.connections.map((c) => c.name)).toContain('S1.BK');
  });
});

/* ------------------------------------------------------------------ */
/* ファナック SR-3iA・M-1iA と R-30iB Compact Plus・Mate Plus             */
/* ------------------------------------------------------------------ */

describe('ファナックのスカラ・パラレルリンクとコントローラー', () => {
  const sr = SETS.find((x) => x.robot === 'fanuc.sr-3ia')!;

  it('一般名称がスカラロボット・パラレルリンクロボットで、ロボットのファミリーの中でメーカー・種類を見分けられる', () => {
    expect(def('fanuc.sr-3ia').name).toBe('スカラロボット');
    expect(def('fanuc.m-1ia').name).toBe('パラレルリンクロボット');
  });

  it('ロボットとコントローラーの組み合わせ: LR Mate・SR-3iA・M-1iA はそれぞれ自分のコントローラーとだけつながる', () => {
    const pairs: [string, string][] = [
      ['fanuc.lr-mate-200id', 'fanuc.r-30ib-mini-plus'],
      ['fanuc.sr-3ia', 'fanuc.r-30ib-compact-plus'],
      ['fanuc.m-1ia', 'fanuc.r-30ib-mate-plus'],
    ];
    for (const [robot] of pairs) {
      const rb = resolveDevice(def(robot));
      for (const [, ctrl] of pairs) {
        const rc = resolveDevice(def(ctrl));
        const ok = pairs.some(([r, c]) => r === robot && c === ctrl);
        for (const id of ['RM1', 'RP1']) expect(connectorsMate(rb.terminal(id)!.connector!, rc.terminal(id)!.connector!), `${robot} → ${ctrl} ${id}`).toBe(ok);
      }
    }
  });

  it('周辺機器 I/O（CRMA15・CRMA16）は R-30iB Mini Plus と同じ並びで、MIL 50 極の変換端子台とつながる', () => {
    for (const type of ['fanuc.r-30ib-compact-plus', 'fanuc.r-30ib-mate-plus']) {
      const r = resolveDevice(def(type));
      expect(r.pin('CRMA15#9')).toMatchObject({ label: 'DI101（A05）', signal: { dir: 'in', kind: 'dc', common: 'CRMA15#5' } });
      expect(r.pin('CRMA15#29')).toMatchObject({ label: 'DO101（A15）', signal: { dir: 'out', kind: 'pnp' } });
      const io = r.pins.filter((p) => /^CRMA1[56]#/.test(p.id));
      expect(io.filter((p) => p.signal?.dir === 'in').length).toBe(28);
      expect(io.filter((p) => p.signal?.dir === 'out').length).toBe(24);
      const tb = resolveDevice(def('generic.mil-terminal-block.50p')).terminal('CN')!.connector!;
      expect(connectorsMate(r.terminal('CRMA15')!.connector!, tb)).toBe(true);
    }
  });

  it('PLC の NPN 出力で DI101 を駆動: SDICOM を +24V につなぐとエラーなし、0V につなぐと signal-polarity。I/O 表に出る', () => {
    const plc = (sdicomTo: 'p24' | 'm0v'): Diagram => {
      const d = cellOf(sr);
      d.devices.push(dev('PSU1', 'generic.psu.dc24v'), dev('OUT1', 'keyence.kv-c32tc.output'), dev('TB1', 'generic.mil-terminal-block.34p'), dev('TB2', 'generic.mil-terminal-block.50p'));
      d.wires.push(
        cable('OUT1.CN1', 'TB1.CN'),
        cable('RC1.CRMA15', 'TB2.CN'),
        wire('PSU1.-V1', 'TB1.33'),
        wire('TB1.1', 'TB2.9'),
        wire('TB2.5', sdicomTo === 'p24' ? 'TB2.1' : 'TB2.47'),
        wire('TB2.48', 'PSU1.-V2'),
      );
      return d;
    };
    expect(errorsOf(plc('p24'))).toEqual([]);
    expect(errorsOf(plc('m0v')).map((i) => i.rule)).toContain('signal-polarity');
    const rows = ioRows(plc('p24'), lookup).filter((r) => r.host === 'RC1');
    expect(rows.find((r) => r.address === 'DI101')?.connections).toContain('OUT1.CN1#1');
    // 周辺機器 I/O（入力 28・出力 24）とロボット I/O（RI 8・RO 8）
    expect(rows.filter((r) => r.dir === '入力').length).toBe(28 + 8);
    expect(rows.filter((r) => r.dir === '出力').length).toBe(24 + 8);
  });

  it('SR-3iA の EE に EE ケーブルでセンサー・リレーをつなぐと、電源が届き、コントローラーの I/O 表の RI1・RO7 に出る', () => {
    const d = cellOf(sr);
    d.devices.push(dev('CBL1', 'fanuc.ee-cable'), dev('S1', 'keyence.pz-g41', { output: 'P' }), dev('K1', 'omron.my2n.dc24'));
    d.wires.push(
      cable('RB1.EE', 'CBL1.CN'),
      wire('CBL1.24V-9', 'S1.BN', { sizeSq: 0.3 }),
      wire('CBL1.0V-11', 'S1.BU', { sizeSq: 0.3 }),
      wire('S1.BK', 'CBL1.RI1', { sizeSq: 0.3 }),
      wire('CBL1.RO7', 'K1.14', { sizeSq: 0.3 }),
      wire('K1.13', 'CBL1.0V-12', { sizeSq: 0.3 }),
    );
    expect(errorsOf(d)).toEqual([]);
    const points = ioSystem(d, 'RC1', lookup)!.units[0].points;
    expect(points.find((p) => p.address === 'RI1')?.connections.map((c) => c.name)).toContain('S1.BK');
    expect(points.find((p) => p.address === 'RO7')?.connections.map((c) => c.name)).toContain('K1.14');
  });

  it('出力 DO101 で負荷を駆動するとき、DOSRC に +24V を供給しないと負荷に電源が来ていない（no-power）', () => {
    const base = cellOf(sr);
    base.devices.push(dev('TB2', 'generic.mil-terminal-block.50p'), dev('K1', 'omron.my2n.dc24'));
    base.wires.push(cable('RC1.CRMA15', 'TB2.CN'), wire('TB2.29', 'K1.14'), wire('K1.13', 'TB2.47'));
    const withSrc: Diagram = { ...base, wires: [...base.wires, wire('TB2.1', 'TB2.43')] };
    const coil = (d: Diagram) => check(d).filter((i) => i.devices.includes('K1') && (i.severity === 'error' || i.rule === 'no-power'));
    expect(coil(withSrc)).toEqual([]);
    expect(coil(base).map((i) => i.rule)).toContain('no-power');
  });
});
