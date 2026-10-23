import { describe, expect, it } from 'vitest';
import { resolveDevice } from '../devices/resolve';
import type { DeviceDefinition } from '../devices/types';
import { terminalFacts } from './terminalInfo';

const def: DeviceDefinition = {
  type: 't.dev',
  name: 't',
  model: 't',
  category: 'control',
  labelPrefix: 'T',
  width: 10,
  height: 10,
  svg: '',
  params: [{ key: 'v', label: '電圧', options: [{ value: 24 }, { value: 12 }], default: 24 }],
  terminals: [
    { id: 'A1', x: 0, y: 0, side: 'top', role: 'input', hint: 'コイル+', note: 'コイル +（+24V）', accepts: { system: 'DC', minVoltage: 19.2, maxVoltage: 26.4, conductors: ['+'] } },
    { id: 'P', label: '+V', x: 0, y: 0, side: 'top', role: 'supply', supply: { system: 'DC', voltage: { param: 'v' }, conductor: '+' } },
    { id: 'N', label: '-V', x: 0, y: 0, side: 'top', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-', kind: 'ossd' } },
    { id: 'X', x: 0, y: 0, side: 'top', role: 'signal', signal: { dir: 'out', kind: 'contact' } },
    { id: 'Y', x: 0, y: 0, side: 'top', role: 'signal', signal: { dir: 'in', kind: 'dc' } },
    { id: 'Z', x: 0, y: 0, side: 'top', role: 'input', accepts: { system: 'AC', minVoltage: 100, maxVoltage: 100 } },
  ],
};

const facts = (id: string, params?: Record<string, number>) => {
  const r = resolveDevice(def, params);
  return terminalFacts(r.terminal(id)!, r);
};

describe('terminalFacts', () => {
  it('受電端子は受けられる電圧の範囲と導体を出す', () => {
    expect(facts('A1')).toEqual({ printed: 'A1', hint: 'コイル+', note: 'コイル +（+24V）', kind: '受電', power: '受けられる電源: DC 19.2〜26.4V（+）' });
  });
  it('上限と下限が同じ電圧は 1 つだけ出す', () => {
    expect(facts('Z').power).toBe('受けられる電源: AC 100V');
  });
  it('電源出力はパラメータで決まる電圧を解決し、安全出力は区別する', () => {
    expect(facts('P').power).toBe('電源: DC24V（+）');
    expect(facts('P', { v: 12 }).power).toBe('電源: DC12V（+）');
    expect(facts('N').power).toBe('安全出力: DC24V（−）');
  });
  it('信号は種類と向きを出す（名前に出力・入力が入っていれば重ねない）', () => {
    expect(facts('X').kind).toBe('無電圧接点（出す側）');
    expect(facts('Y').kind).toBe('DC入力');
  });
  it('印字は label、なければ端子ID', () => {
    expect(facts('P').printed).toBe('+V');
    expect(facts('X').printed).toBe('X');
  });
});
