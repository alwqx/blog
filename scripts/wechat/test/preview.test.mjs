import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, realpath, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { previewDirectory } from '../preview.mjs';

async function fixture(t) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'wechat-preview-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  return { root, config: { previewDirectory: path.join(root, 'preview') },
    article: { file: path.join(root, '中文文章.md'), metadata: { wechat: { id: 'article' } } } };
}

test('invalid preview IDs are rejected before creating output directories', async (t) => {
  const f = await fixture(t);
  for (const id of ['../../outside', '/tmp/outside', 'a/b', '..', 123]) {
    f.article.metadata.wechat.id = id;
    await assert.rejects(previewDirectory(f.config, f.article), /wechat.id/);
  }
  assert.deepEqual(await readdir(f.root), []);
});

test('automatic previews stay under their root, including a Unicode filename fallback', async (t) => {
  const f = await fixture(t);
  assert.equal(await previewDirectory(f.config, f.article), path.join(f.config.previewDirectory, 'article'));
  delete f.article.metadata.wechat.id;
  assert.equal(await previewDirectory(f.config, f.article), path.join(f.config.previewDirectory, '中文文章'));
});

test('an existing preview symlink cannot overwrite files outside the preview root', async (t) => {
  const f = await fixture(t);
  const outside = path.join(f.root, 'outside');
  await mkdir(outside);
  await writeFile(path.join(outside, 'index.html'), 'preserve me');
  await mkdir(f.config.previewDirectory);
  await symlink(outside, path.join(f.config.previewDirectory, 'article'));
  await assert.rejects(previewDirectory(f.config, f.article), /目录内/);
  assert.equal(await readFile(path.join(outside, 'index.html'), 'utf8'), 'preserve me');
});

test('an explicitly chosen output directory remains supported', async (t) => {
  const f = await fixture(t);
  const output = path.join(f.root, 'chosen-output');
  assert.equal(await previewDirectory(f.config, f.article, output), output);
});
