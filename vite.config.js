import { resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname);
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (mode !== 'demo' && (url || key)) {
    if (!url || !key) throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
    let publicKey = key.startsWith('sb_publishable_');
    if (!publicKey) {
      try {
        publicKey = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'anon';
      } catch {
        publicKey = false;
      }
    }
    if (!publicKey) throw new Error('Use a Supabase publishable or legacy anon key for the VITE_ setting.');
    if (new URL(url).protocol !== 'https:') throw new Error('Use an HTTPS Supabase project URL.');
  }
  return {
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        site: resolve(import.meta.dirname, 'index.html'),
        admin: resolve(import.meta.dirname, 'admin/index.html'),
        legacyAdmin: resolve(import.meta.dirname, 'admin.html'),
      },
    },
  },
  };
});
