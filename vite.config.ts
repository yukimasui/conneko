import { defineConfig } from 'vitest/config';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import pkg from './package.json';
import { thirdPartyLicenses } from './build/third-party';

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    thirdPartyLicenses(import.meta.dirname),
    // 配布する HTML の先頭に、著作権とライセンスの表示を入れる
    {
      name: 'conneko-license-banner',
      transformIndexHtml: (html) =>
        html.replace(
          /(<meta charset="UTF-8" \/>)/i,
          `$1\n    <!-- Conneko v${pkg.version} / Copyright (c) 2026 yukimasui / Conneko License 1.0（企業の業務利用は作成者の許諾が必要） https://github.com/yukimasui/conneko/blob/main/LICENSE / 同梱の外部ライブラリのライセンスはアプリの「Conneko について」を参照 -->`,
        ),
    },
  ],
  // 画面に表示するバージョン（package.json の version）
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    // サブエージェントの git worktree（.claude/worktrees）のテストは対象外
    exclude: [...configDefaults.exclude, '.claude/**'],
    // 変換結果のキャッシュは registry.ts の import.meta.glob の結果も保持してしまい、
    // catalog に機器を追加してもテストから見えないことがあるため使わない（テストは十分速い）
    fsModuleCache: false,
  },
});
