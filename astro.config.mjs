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
  srcDir: 'src',
  experimental: {
    contentLayer: true,
  },
});
