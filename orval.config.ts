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
        operations: {
          Events_listEvents: {
            query: {
              useSuspenseInfiniteQuery: true,
              useInfinite: true,
              useInfiniteQueryParam: 'page',
            },
          },
          Venues_findMine: {
            query: {
              useSuspenseQuery: true,
            },
          },
          Venues_findOne: {
            query: {
              useSuspenseQuery: true,
            },
          },
          Venues_getStats: {
            query: {
              useSuspenseQuery: true,
            },
          },
          Events_listMyEvents: {
            query: {
              useSuspenseInfiniteQuery: true,
              useInfinite: true,
              useInfiniteQueryParam: 'page',
            },
          },
          Events_getEvent: {
            query: {
              useSuspenseQuery: true,
            },
          },
          Events_getStats: {
            query: {
              useSuspenseQuery: true,
            },
          },
          Events_listSeatTypes: {
            query: {
              useSuspenseQuery: true,
            },
          },
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
