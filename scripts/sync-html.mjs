/** Refresh the portable HTML rules copy; javascript/core.mjs is authoritative. */
import {readFile, writeFile} from 'node:fs/promises';
const source = await readFile(new URL('../javascript/core.mjs', import.meta.url), 'utf8');
const banner = '// Generated from javascript/core.mjs by scripts/sync-html.mjs; do not edit.\n';
await writeFile(new URL('../html/core.js', import.meta.url), banner + source);
console.log('Updated html/core.js from the shared rules.');
