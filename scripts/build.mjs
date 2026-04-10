import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

const entryPoints = {
  'background/service-worker': path.join(root, 'src/background/service-worker.ts'),
  'content/index': path.join(root, 'src/content/index.ts'),
  'popup/popup': path.join(root, 'src/popup/popup.ts'),
  'options/options': path.join(root, 'src/options/options.ts')
};

await build({
  entryPoints,
  outdir: dist,
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  sourcemap: false,
  legalComments: 'none',
  minify: false,
  treeShaking: true,
  loader: {
    '.ts': 'ts'
  }
});

await Promise.all([
  cp(path.join(root, 'manifest.json'), path.join(dist, 'manifest.json')),
  cp(path.join(root, 'src/content/content.css'), path.join(dist, 'content/content.css')),
  cp(path.join(root, 'src/popup/popup.html'), path.join(dist, 'popup/popup.html')),
  cp(path.join(root, 'src/popup/popup.css'), path.join(dist, 'popup/popup.css')),
  cp(path.join(root, 'src/options/options.html'), path.join(dist, 'options/options.html')),
  cp(path.join(root, 'src/options/options.css'), path.join(dist, 'options/options.css')),
  cp(path.join(root, 'icons'), path.join(dist, 'icons'), { recursive: true })
]);

console.log(`Built Crunchyroll Audio Filter into ${dist}`);
