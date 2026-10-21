/**
 * 配布する HTML に含まれる外部ライブラリ（dependencies とその依存）のライセンス文を集める Vite プラグイン。
 * 'virtual:third-party-licenses' として一覧を提供し、アプリの「Conneko について」で表示する
 * （MIT などのライセンスは、配布物に著作権表示とライセンス文を含めることを求めるため）。
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

export interface ThirdPartyLicense {
  name: string;
  version: string;
  license: string;
  text: string;
}

function collect(root: string): ThirdPartyLicense[] {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  const seen = new Map<string, ThirdPartyLicense>();
  const walk = (name: string) => {
    // 型定義だけのパッケージは配布物に含まれない
    if (seen.has(name) || name.startsWith('@types/')) return;
    const dir = join(root, 'node_modules', name);
    const file = join(dir, 'package.json');
    if (!existsSync(file)) return;
    const j = JSON.parse(readFileSync(file, 'utf8')) as { version: string; license?: string; dependencies?: Record<string, string> };
    const licFile = readdirSync(dir).find((f) => /^licen[sc]e/i.test(f));
    seen.set(name, { name, version: j.version, license: j.license ?? '不明', text: licFile ? readFileSync(join(dir, licFile), 'utf8').trim() : '' });
    for (const d of Object.keys(j.dependencies ?? {})) walk(d);
  };
  for (const d of Object.keys(pkg.dependencies ?? {})) walk(d);
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function thirdPartyLicenses(root: string): Plugin {
  const id = 'virtual:third-party-licenses';
  const resolved = '\0' + id;
  return {
    name: 'conneko-third-party-licenses',
    resolveId: (source) => (source === id ? resolved : undefined),
    load: (source) => (source === resolved ? `export default ${JSON.stringify(collect(root))};` : undefined),
  };
}
