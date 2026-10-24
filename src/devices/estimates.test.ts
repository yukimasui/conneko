/**
 * 推定の値の付け漏れの検査（#9）。
 * カタログのドキュメント（docs/*-catalog.md）で「推定」と書いた行にある機器の type は、機器定義でも推定を含む（hasEstimates）こと。
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasEstimates } from './estimates';
import { getDeviceDefinition } from './registry';

const DOCS = join(__dirname, '../../docs');

/**
 * 推定の行に名前があっても、推定がその機器に当たらないもの（type → 理由）。
 * 同じ行で別の型（M8 コネクタ品など）の推定を書いている
 */
const NOT_ESTIMATED: Record<string, string> = {
  'keyence.ps-n11': '推定は M8 コネクタ品（.m8）のピンの割付けだけ',
  'keyence.ps-n12': '推定は M8 コネクタ品（.m8）のピンの割付けだけ',
  'keyence.lv-n12': '推定は M8 コネクタ品（lv-n11.m8）のピンの割付けだけ',
};

/** ドキュメントの「推定」の行に書いた、登録済みの機器の type */
function estimatedTypesInDocs(): { file: string; type: string }[] {
  const out: { file: string; type: string }[] = [];
  for (const file of readdirSync(DOCS).filter((f) => /-catalog\.md$/.test(f))) {
    for (const line of readFileSync(join(DOCS, file), 'utf8').split('\n')) {
      if (!line.includes('推定')) continue;
      for (const m of line.matchAll(/`([a-z0-9-]+\.[a-z0-9.-]+)`/g)) {
        if (getDeviceDefinition(m[1]) && !NOT_ESTIMATED[m[1]]) out.push({ file, type: m[1] });
      }
    }
  }
  return out;
}

describe('推定の値の付け漏れ', () => {
  const found = estimatedTypesInDocs();

  it('ドキュメントの推定の行から機器を拾えている', () => {
    expect(found.length).toBeGreaterThan(10);
  });

  it.each(found.map((f) => [f.type, f.file] as const))('%s（%s で推定と書いた機器）は機器定義でも推定を含む', (type) => {
    expect(hasEstimates(getDeviceDefinition(type)!)).toBe(true);
  });

  it('KV-8000 / KV-X の CPU は、拡張ユニットの番号の自動割付けが推定であることを示す', () => {
    for (const type of ['keyence.kv-8000.cpu', 'keyence.kv-x550', 'keyence.kv-x500']) {
      expect(getDeviceDefinition(type)!.estimated, type).toMatch(/自動割付け/);
    }
  });
});
