import { defineConfig } from 'vite';
import {resolve} from 'node:path';
export default defineConfig({ base: './', server: { port: 5179, strictPort: true },build:{rollupOptions:{input:{main:resolve('index.html'),pet:resolve('pet.html')}}} });
