import { defineConfig } from 'orval';

export default defineConfig({
  apiClient: {
    input: 'http://localhost:3000/api/docs-json',
    output: {
      mode: 'tags-split',
      target: 'packages/api-client/src/endpoints',
      schemas: 'packages/api-client/src/models',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: 'packages/api-client/src/mutator.ts',
          name: 'customInstance',
        },
      },
    },
  },
  apiClientZod: {
    input: 'http://localhost:3000/api/docs-json',
    output: {
      mode: 'tags-split',
      target: 'packages/api-client/src/zod',
      client: 'zod',
      fileExtension: '.zod.ts',
    },
  },
});
