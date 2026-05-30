// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Ensure esbuild treats .js files containing JSX correctly during dependency
// scanning/pre-bundling. Some upstream packages or generated files may be
// discovered as .js but contain JSX syntax; instruct esbuild to parse them.
export default defineConfig({
	vite: {
		optimizeDeps: {
			esbuildOptions: {
				loader: {
					".js": "jsx",
				},
			},
		},
	},
});
