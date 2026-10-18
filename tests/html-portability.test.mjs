import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

/** A copied static release must retain exactly the authoritative gameplay rules. */
test('portable HTML rules copy matches shared simulation', async () => {
  const original = await readFile(new URL('../javascript/core.mjs', import.meta.url), 'utf8');
  const portable = await readFile(new URL('../html/core.js', import.meta.url), 'utf8');
  const banner = '// Generated from javascript/core.mjs by scripts/sync-html.mjs; do not edit.\n';
  assert.equal(portable, banner + original, 'Run npm run sync:html before committing rule changes');
});
