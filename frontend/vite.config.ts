import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		// Required for TronWeb compatibility
		'process.env': {},
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['tronweb']
	}
});
