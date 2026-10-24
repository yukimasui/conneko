import { describe, expect, it } from 'vitest';
import { getDeviceDefinition, deviceDefinitions } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import { paramVariants } from '../devices/validate';
import { deviceElements, elementSymbol, splitIoLabel, type SchematicElement } from './elements';

const elementsOf = (type: string): SchematicElement[] => {
  const def = getDeviceDefinition(type);
  if (!def) throw new Error(type);
  return deviceElements(def);
};
/** 要素の要約（キー・種類・記号） */
const summary = (els: SchematicElement[]) => els.map((e) => `${e.key} ${e.kind} ${e.symbol}`);

describe('全機器の切り出し', () => {
  it.each(deviceDefinitions.map((d) => [d.type, d] as const))('%s', (_, def) => {
    for (const params of paramVariants(def)) {
      const els = deviceElements(def, params);
      const r = resolveDevice(def, params);
      const where = `${def.type} ${JSON.stringify(params)}`;
      // キーが一意
      const keys = els.map((e) => e.key);
      expect(keys.length - new Set(keys).size, where).toBe(0);
      // 端子は 1 つの要素にだけ入る
      const ids = els.flatMap((e) => Object.keys(e.pinOf));
      expect(ids.length - new Set(ids).size, where).toBe(0);
      // コネクタ・エアのポート以外の端子・ピンはどれかの要素に入る（リンクは要素を持たない）
      if (def.category !== 'link') {
        const all = [...r.terminals.filter((t) => t.role !== 'connector' && t.role !== 'air'), ...r.pins.filter((p) => p.role !== 'air')].map((t) => t.id);
        expect(all.filter((id) => !ids.includes(id)), where).toEqual([]);
      }
      for (const e of els) {
        // 記号があり、要素の端子は記号の端子に当たる
        const sym = elementSymbol(e);
        for (const pin of Object.values(e.pinOf)) expect(sym.pins[pin], `${where} ${e.key} ${pin}`).toBeDefined();
        // 属性は記号に定義がある
        const tags = new Set(sym.attributes.map((a) => a.tag));
        for (const tag of Object.keys(e.attributes)) expect(tags.has(tag), `${where} ${e.key} ${tag}`).toBe(true);
        expect(JSON.stringify(e), where).not.toMatch(/undefined|NaN/);
      }
    }
  });
});

describe('代表的な機器の切り出し', () => {
  it('電磁接触器: コイル・主接点・補助接点', () => {
    expect(summary(elementsOf('mitsubishi.s-t12.ac200v'))).toEqual([
      'A1-A2 coil coil',
      'main contactor contactor-3p',
      '13-14 contact contact-no',
      '21-22 contact contact-nc',
    ]);
    const main = elementsOf('mitsubishi.s-t12.ac200v')[1];
    expect(main.pinOf).toEqual({ '1/L1': '1', '2/T1': '2', '3/L2': '3', '4/T2': '4', '5/L3': '5', '6/T3': '6' });
  });

  it('サーマルリレー: 熱動素子と熱動の接点', () => {
    expect(summary(elementsOf('mitsubishi.th-t18'))).toEqual([
      'main thermal thermal-3p',
      '95-96 contact contact-nc-thermal',
      '97-98 contact contact-no-thermal',
    ]);
  });

  it('遮断器: 漏電遮断器は漏電検出付き、サーキットプロテクタは遮断器の記号', () => {
    expect(summary(elementsOf('mitsubishi.nv32-sv.3p'))).toEqual(['main breaker elb-3p']);
    expect(summary(elementsOf('mitsubishi.nf32-sv.3p'))).toEqual(['main breaker breaker-3p']);
    expect(summary(elementsOf('mitsubishi.cp30-ba.1p'))).toEqual(['main breaker breaker-1p']);
  });

  it('リレー: 端子の並びが 2, 1 でもコイルは 1-2', () => {
    expect(summary(elementsOf('idec.rf1v-2a2bl-d24'))[0]).toBe('1-2 coil coil');
  });

  it('照光式の非常停止: 非常停止の b 接点と表示灯', () => {
    expect(summary(elementsOf('idec.xw1e-lv402q4mr'))).toEqual([
      'X1-X2 lamp lamp',
      '21-22 contact contact-nc-emergency',
      '41-42 contact contact-nc-emergency',
    ]);
  });

  it('安全リレー: A1/A2 は電源なので箱に入り、出力接点は別の要素', () => {
    const els = elementsOf('omron.g9sa-301');
    expect(els.filter((e) => e.kind === 'contact').map((e) => e.key)).toEqual(['13-14', '23-24', '33-34', '41-42']);
    const box = els.find((e) => e.kind === 'box');
    expect(box && Object.keys(box.pinOf)).toContain('A1');
  });

  it('電動機: 電動機と接地', () => {
    expect(summary(elementsOf('generic.motor.3p'))).toEqual(['U-V-W motor motor-3p', 'E ground ground']);
  });

  it('PLC の入力ユニット（MIL）: 入力点 32 点と、コモンのピンの箱', () => {
    const els = elementsOf('keyence.kv-c32xc.input');
    const inputs = els.filter((e) => e.kind === 'plc-input');
    expect(inputs).toHaveLength(32);
    expect(inputs[0].attributes).toEqual({ ADDR: 'R000', T1: '1' });
    expect(els.filter((e) => e.kind === 'box').map((e) => e.key)).toEqual(['CN1']);
  });

  it('PLC の出力ユニット: 出力点ごとの要素', () => {
    const els = elementsOf('mitsubishi.ry10r2');
    expect(els.filter((e) => e.kind === 'plc-output').map((e) => e.attributes.ADDR).slice(0, 3)).toEqual(['Y00', 'Y01', 'Y02']);
  });

  it('端子台: 上下のネジを 1 つの端子にまとめる', () => {
    const els = elementsOf('generic.terminal-block.6p');
    expect(els).toHaveLength(6);
    expect(els[0]).toMatchObject({ kind: 'terminal', pinOf: { '1a': '1', '1b': '2' } });
  });

  it('MIL 変換端子台: ネジとピンを 1 つの端子にまとめる', () => {
    const els = elementsOf('generic.mil-terminal-block.40p');
    expect(els.filter((e) => e.kind === 'terminal')).toHaveLength(40);
    expect(els[0]).toMatchObject({ key: '1', pinOf: { '1': '1', 'CN#1': '2' } });
  });

  it('汎用リレー（c 接点）: 共通・b 接点・a 接点の 3 端子を 1 つの c 接点にする', () => {
    expect(summary(elementsOf('omron.my2n.dc24'))).toEqual(['13-14 coil coil', '9-1-5 contact contact-c', '12-4-8 contact contact-c']);
    expect(elementsOf('omron.my2n.dc24')[1]).toMatchObject({ pinOf: { 9: '1', 1: '2', 5: '3' }, attributes: { T1: '9', T2: '1', T3: '5' } });
  });

  it('リンクは要素を持たない', () => {
    expect(elementsOf('generic.link')).toEqual([]);
  });
});

describe('PLC の入出力点のラベル', () => {
  it.each([
    ['R000 (No.1)', 'CN1#1', 'R000', '1'],
    ['X00 (B20)', 'CN1#20', 'X00', 'B20'],
    ['IN016（1B）', 'I/O#1', 'IN016', '1B'],
    ['R000（上端子台 No.1）', 'U1', 'R000', 'U1'],
    ['1SVON 軸1 サーボ ON 出力', 'CN1#21', '1SVON', '21'],
    ['Y0', 'Y0', 'Y0', 'Y0'],
  ])('%s', (label, id, addr, pin) => {
    expect(splitIoLabel(label, id)).toEqual({ addr, pin });
  });
});

describe('エアのポート', () => {
  it('画面に出さないエアのポート（装着形の電磁弁の P・EA・EB など）は、展開図の要素にしない（#34）', () => {
    const bad: string[] = [];
    for (const def of deviceDefinitions) {
      const r = resolveDevice(def);
      const air = new Set([...r.terminals, ...r.pins].filter((t) => t.role === 'air').map((t) => t.id));
      if (!air.size) continue;
      for (const e of deviceElements(def)) for (const id of Object.keys(e.pinOf)) if (air.has(id)) bad.push(`${def.type}:${id}`);
    }
    expect(bad).toEqual([]);
  });
});
