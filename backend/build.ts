import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { build } from 'esbuild';

const handlers = readdirSync('src/handlers')
  .filter((f) => f.endsWith('.ts'))
  .map((f) => f.slice(0, -3));

rmSync('dist', { recursive: true, force: true });
await Promise.all(
  handlers.map((name) =>
    build({
      entryPoints: [`src/handlers/${name}.ts`],
      outfile: `dist/${name}/index.js`,
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'cjs',
      minify: true,
      sourcemap: true,
      external: ['@aws-sdk/*'],
      logLevel: 'warning',
    }).then(() => writeFileSync(`dist/${name}/package.json`, '{"type":"commonjs"}\n')),
  ),
);
console.log(`Build: ${handlers.join(', ')}`);
