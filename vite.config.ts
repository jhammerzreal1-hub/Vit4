import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const preserveSameOriginCredentialsPlugin = () => ({
  name: 'preserve-same-origin-credentials',
  transformIndexHtml(html: string) {
    return html
      .replace(/<script([^>]*?)\s+crossorigin(?:="[^"]*")?([^>]*?src="\/(?:assets|src)\/[^"]+")/gi, '<script$1$2')
      .replace(/<link([^>]*?rel="(?:modulepreload|stylesheet)"[^>]*?)\s+crossorigin(?:="[^"]*")?([^>]*?href="\/(?:assets|src)\/[^"]+")/gi, '<link$1$2');
  }
});

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    preserveSameOriginCredentialsPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    hmr: false,
    ws: false,
    watch: {
      ignored: [
        '**/data/**',
        '**/dist/**',
        '**/*.db',
        '**/*.db-*',
        '**/*.tar.gz',
        '**/node_modules/**',
        '**/sovereign_apps/**',
        '**/downloads/**',
        '**/wineprefix/**',
        '**/.active_port',
        '**/*.log',
        '**/.termux*',
        '**/FORENSIC_SYSTEMS_MANUAL.md',
        '**/infinite_sim_store.json',
        '**/dynamic_tools.json',
        '**/agents_manifest.json',
        '**/swarm-agent-models.json',
        '**/public/sw.js'
      ]
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'lucide-react',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore'
    ],
    exclude: ['@mlc-ai/web-llm']
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@mlc-ai/web-llm')) {
              return 'vendor-webllm';
            }
            if (id.includes('/three/') || id.includes('\\three\\')) {
              return 'vendor-three';
            }
            if (id.includes('/mathjs/') || id.includes('\\mathjs\\')) {
              return 'vendor-math';
            }
            if (id.includes('/firebase/') || id.includes('@firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@google/genai')) {
              return 'vendor-genai';
            }
            if (id.includes('/motion/') || id.includes('framer-motion')) {
              return 'vendor-motion';
            }
          }
        }
      }
    }
  },
});
