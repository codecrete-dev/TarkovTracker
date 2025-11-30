// https://nuxt.com/docs/api/configuration/nuxt-config
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const appDir = resolve(__dirname, 'app');
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  srcDir: 'app',
  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
      teamGatewayUrl: process.env.NUXT_PUBLIC_TEAM_GATEWAY_URL || '',
    },
  },
  devtools: {
    enabled: process.env.NODE_ENV === 'development',

    timeline: {
      enabled: true,
    },
  },
  serverDir: resolve(__dirname, 'app/server'),
  nitro: {
    preset: 'cloudflare-pages',
    cloudflare: {
      pages: {
        routes: {
          include: ['/*'],
          exclude: ['/_fonts/*', '/_nuxt/*', '/img/*', '/favicon.ico', '/robots.txt'],
        },
      },
    },
  },
  routeRules: {
    // Prerender the index page for zero-invocation loading of the SPA shell
    '/': { prerender: true },
    // Explicit long-term caching for build assets
    '/_nuxt/**': {
      headers: { 'cache-control': 'public,max-age=31536000,immutable' },
    },
    '/_fonts/**': {
      headers: { 'cache-control': 'public,max-age=31536000,immutable' },
    },
  },
  app: {
    baseURL: '/',
    buildAssetsDir: '/_nuxt/',
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap',
        },
      ],
    },
  },
  css: ['~/assets/css/tailwind.css'],
  alias: {
    '@': appDir,
    '~': appDir,
  },
  modules: [
    '@nuxt/eslint',
    // Only load test utils during local dev/test so production builds don't try to resolve devDependency
    process.env.NODE_ENV === 'development' ? '@nuxt/test-utils/module' : undefined,
    '@pinia/nuxt',
    '@nuxt/ui',
    '@nuxt/image',
  ].filter(Boolean) as string[],
  ui: {
    theme: {
      colors: [
        'primary',
        'secondary',
        'neutral',
        'brand',
        'accent',
        'pvp',
        'pve',
        'info',
        'success',
        'warning',
        'error',
      ],
    },
  },
  components: [
    {
      path: '~/components',
      pathPrefix: false,
    },
    {
      path: '~/features',
      pathPrefix: false,
    },
    {
      path: '~/shell',
      pathPrefix: false,
    },
  ],
  typescript: {
    tsConfig: {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          '@/*': ['./app/*'],
          '~/*': ['./app/*'],
        },
      },
    },
  },
  postcss: {
    plugins: {
      '@tailwindcss/postcss': {},
      autoprefixer: {},
    },
  },
  vite: {
    base: '/',
    optimizeDeps: {
      exclude: ['better-sqlite3'],
    },
    define: {
      // Suppress Suspense experimental feature warning
      __VUE_PROD_SUSPENSE__: 'false',
    },
    vue: {
      // Forwarded to @vitejs/plugin-vue
      template: {
        compilerOptions: {
          isCustomElement: (tag: string) => tag === 'suspense',
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules/d3')) {
              return 'vendor-d3';
            }
            if (id.includes('node_modules/graphology')) {
              return 'vendor-graphology';
            }
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('node_modules/@nuxt/ui') || id.includes('node_modules/@vueuse')) {
              return 'vendor-ui';
            }
            if (
              id.includes('node_modules/vue') ||
              id.includes('node_modules/pinia') ||
              id.includes('node_modules/ufo') ||
              id.includes('node_modules/ofetch') ||
              id.includes('node_modules/defu') ||
              id.includes('node_modules/h3')
            ) {
              return 'vendor-core';
            }
          },
        },
      },
    },
    plugins: [
      VueI18nPlugin({
        include: [resolve(appDir, 'locales/**/*.json5')],
        runtimeOnly: false,
        compositionOnly: false,
        strictMessage: false,
        escapeHtml: true,
      }),
    ],
  },
});
