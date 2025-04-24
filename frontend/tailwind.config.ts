import type { Config } from 'tailwindcss';
// @ts-ignore
interface DaisyUIConfigExtension extends Config {
  daisyui?: Record<string, any>;
}
import daisyui from 'daisyui';
// Shadcn UI plugin will be added after running `npx shadcn init`

const config: DaisyUIConfigExtension = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/ui/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
  daisyui: {
    themes: ['light', 'dark'],
    darkTheme: 'dark',
  },
};

export default config;
