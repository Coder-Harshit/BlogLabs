// @ts-check
import { defineConfig } from 'astro/config';

<<<<<<< HEAD
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  }
=======
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
>>>>>>> grub
});