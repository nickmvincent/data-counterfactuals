import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default defineConfig({
  integrations: [preact()],
  markdown: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [rehypeKatex],
  },
  vite: {
    build: {
      // The advanced prototype lazy-loads Three.js behind its own route-only chunk.
      chunkSizeWarningLimit: 650,
    },
  },
  srcDir: 'src',
  experimental: {
    contentLayer: true,
  },
});
