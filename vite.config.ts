import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  // Point Vite at the app source root so it finds index.html
  root: path.resolve(__dirname, 'src/app'),

  // Vite copies everything in publicDir to dist/ verbatim
  publicDir: path.resolve(__dirname, 'src/app/public'),

  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/app'),
      '@components': path.resolve(__dirname, './src/app/components'),
      '@utils': path.resolve(__dirname, './src/app/utils'),
      '@contexts': path.resolve(__dirname, './src/app/contexts'),
      '@styles': path.resolve(__dirname, './src/styles'),
    },
  },

  // CSS file resolution — point at the actual styles directory
  css: {
    postcss: path.resolve(__dirname, '.'),
  },

  build: {
    // Output into /dist at project root (outside src/)
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,

    // Relative asset paths so the app works from any sub-path or CDN
    assetsDir: 'assets',

    // Raise the chunk-size warning threshold (the app is intentionally large)
    chunkSizeWarningLimit: 3000,

    rollupOptions: {
      output: {
        // Deterministic file names for long-term caching
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash][extname]',

        // Split heavy vendor libraries into separate cacheable chunks
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react'
            if (id.includes('recharts'))                           return 'vendor-recharts'
            if (id.includes('lucide-react'))                       return 'vendor-lucide'
            if (id.includes('@radix-ui'))                          return 'vendor-radix'
            if (id.includes('motion'))                             return 'vendor-motion'
            return 'vendor'
          }
        },
      },
    },

    // Generate source maps for production debugging
    sourcemap: false,

    // Minify with esbuild (fast) in production
    minify: 'esbuild',

    // Target modern browsers only (matches the app's requirements)
    target: ['es2020', 'chrome90', 'firefox88', 'safari14'],
  },

  // Preview server config (for `vite preview` after build)
  preview: {
    port: 4173,
    host: true,
    strictPort: false,
  },

  // Dev server config
  server: {
    port: 5173,
    host: true,
    strictPort: false,
  },
})
