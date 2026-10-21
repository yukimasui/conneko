import { defineConfig } from 'vitest/config';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  test: {
    // サブエージェントの git worktree（.claude/worktrees）のテストは対象外
    exclude: [...configDefaults.exclude, '.claude/**'],
  },
});
