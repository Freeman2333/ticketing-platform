import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['**/dist', '**/node_modules', '**/webpack.config.js'],
  },
  tseslint.configs.recommended,
  {
    files: ['packages/backend/src/**/*.ts'],
    ignores: ['packages/backend/src/auth/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/auth/internal/*', '**/auth/internal'],
              message: 'Import from auth/public instead of auth/internal.',
            },
          ],
        },
      ],
    },
  },
);
