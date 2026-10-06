import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// __dirname is undefined when @rspack/cli loads this config as ESM (it
// does, because the file uses `import` statements). Derive it from the
// module URL so the config works regardless of how the loader interprets it.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = 4200;
const NAME = 'shell';

// Read mode from the rspack CLI arg (`--mode=development|production`) so the
// config works the same on Windows + POSIX without depending on a shell
// `NODE_ENV=...` prefix.
export default defineConfig((_env, argv) => {
  const isDev = argv.mode !== 'production';
  return {
    context: __dirname,
    entry: { main: './src/index.ts' },
    output: {
      path: path.resolve(__dirname, 'dist'),
      publicPath: 'auto',
      uniqueName: NAME,
      clean: true,
    },
    devServer: {
      port: PORT,
      historyApiFallback: true,
      hot: true,
      static: { directory: path.resolve(__dirname, 'public') },
    },
    resolve: { extensions: ['...', '.ts', '.tsx', '.jsx'] },
    module: {
      rules: [
        {
          test: /\.(j|t)sx?$/,
          exclude: [/node_modules/],
          use: {
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', tsx: true },
                transform: {
                  react: { runtime: 'automatic', development: isDev },
                },
              },
              env: {
                targets:
                  'Chrome >= 87, Firefox >= 78, Edge >= 88, Safari >= 14',
              },
            },
          },
        },
      ],
    },
    plugins: [
      new rspack.HtmlRspackPlugin({ template: './index.html' }),
      // Ships public/remotes-manifest.json next to the production build too,
      // so swapping a provider's URL only means editing that file - no shell
      // rebuild (frontend-design.md §5).
      new rspack.CopyRspackPlugin({
        patterns: [{ from: 'public', to: '.' }],
      }),
      new ModuleFederationPlugin({
        name: NAME,
        // No build-time `remotes:` block - registered at runtime in
        // src/mf.ts at module load time.
        shared: ['react', 'react-dom'],
      }),
    ],
  };
});
