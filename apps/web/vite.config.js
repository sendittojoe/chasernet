import { defineConfig } from 'vite'
import react             from '@vitejs/plugin-react'
import { VitePWA }       from 'vite-plugin-pwa'
import path              from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name:             'ChaserNet',
        short_name:       'ChaserNet',
        description:      'Real-time storm tracking & weather community',
        theme_color:      '#060A12',
        background_color: '#060A12',
        display:          'standalone',
        orientation:      'portrait-primary',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns:       ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            // Cache Open-Meteo responses for 10 minutes
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/,
            handler:    'NetworkFirst',
            options: {
              cacheName:          'open-meteo-cache',
              expiration:         { maxEntries: 100, maxAgeSeconds: 600 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:8787',
        changeOrigin: true,
        rewrite:     (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir:        'dist',
    sourcemap:     true,
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre:  ['maplibre-gl'],
          recharts:  ['recharts'],
          router:    ['react-router-dom'],
        },
      },
    },
  },
})
