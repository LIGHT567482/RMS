// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from "@lovable.dev/vite-tanstack-config";

const DEFAULT_MANUFACTURER = 'LIGHT TECHNOLOGIES';
const rootBrandingPath = path.resolve(__dirname, 'branded', 'branded.json');

function readRootBranding() {
	try {
		const content = fs.readFileSync(rootBrandingPath, 'utf-8');
		return {
			...JSON.parse(content),
			manufacturer: DEFAULT_MANUFACTURER,
		};
	} catch {
		return null;
	}
}

function brandingAssetPlugin(): Plugin {
	return {
		name: 'rms-branding-asset',
		configureServer(server) {
			server.middlewares.use((req, res, next) => {
				const url = req.url?.split('?')[0] ?? '';
				if (url !== '/branding-info.json' && url !== '/branded/branded.json') return next();

				const branding = readRootBranding();
				if (!branding) return next();

				res.setHeader('Content-Type', 'application/json');
				res.end(JSON.stringify(branding, null, 2));
			});
		},
		generateBundle(_, bundle) {
			const branding = readRootBranding();
			if (!branding) return;

			bundle['branding-info.json'] = {
				type: 'asset',
				fileName: 'branding-info.json',
				source: JSON.stringify(branding, null, 2),
			};
		},
	};
}

// Ensure esbuild treats .js files containing JSX correctly during dependency
// scanning/pre-bundling. Some upstream packages or generated files may be
// discovered as .js but contain JSX syntax; instruct esbuild to parse them.
export default defineConfig({
	vite: {
		plugins: [brandingAssetPlugin()],
		optimizeDeps: {
			esbuildOptions: {
				loader: {
					".js": "jsx",
				},
			},
		},
	},
});
