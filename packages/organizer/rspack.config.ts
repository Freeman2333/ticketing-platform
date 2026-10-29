import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import { ModuleFederationPlugin } from '@module-federation/enhanced/rspack';
import { config as loadEnv } from 'dotenv';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

loadEnv({ path: path.resolve(__dirname, '../../.env') });

const publicEnvDefines = Object.fromEntries(
  Object.entries(process.env)
    .filter(([key]) => key.startsWith('NX_PUBLIC_'))
    .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)]),
);

const PORT = 4202;
const NAME = 'organizer';

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
      headers: { 'Access-Control-Allow-Origin': '*' },
    },
    resolve: {
      extensions: ['...', '.ts', '.tsx', '.jsx'],
      extensionAlias: { '.js': ['.ts', '.js'] },
    },
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
        {
          test: /\.css$/,
          use: ['postcss-loader'],
          type: 'css',
        },
      ],
    },
    plugins: [
      new rspack.DefinePlugin(publicEnvDefines),
      new rspack.HtmlRspackPlugin({
        template: './index.html',
        excludeChunks: [NAME],
      }),
      new ModuleFederationPlugin({
        name: NAME,
        filename: 'remoteEntry.js',
        exposes: {
          './App': './src/App.tsx',
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
          'react-router-dom': { singleton: true },
          '@tanstack/react-query': { singleton: true },
          sonner: { singleton: true },
          '@ticketing/api-client': {},
          '@ticketing/auth-client': { singleton: true },
          '@ticketing/ui': {},
        },
        dts: false,
      }),
    ],
  };
});
