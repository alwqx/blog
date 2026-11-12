import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const cli = new URL('../cli.mjs', import.meta.url).pathname;

test('direct JS invocation loads local credentials and preserves environment overrides', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wechat-cli-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const envFile = path.join(directory, 'wechat.env');
  await writeFile(envFile, 'WECHAT_APP_ID=file-app\nWECHAT_APP_SECRET=file-secret\n');
  const preload = path.join(directory, 'mock-fetch.mjs');
  await writeFile(preload, `import assert from 'node:assert/strict';
globalThis.fetch = async (url, options) => {
  if (url.endsWith('/stable_token')) {
    const request = JSON.parse(options.body);
    assert.equal(request.appid, process.env.EXPECTED_APP);
    assert.equal(request.secret, process.env.EXPECTED_SECRET);
    return Response.json({ access_token: 'mock-token', expires_in: 7200 });
  }
  assert.equal(new URL(url).pathname, '/cgi-bin/draft/batchget');
  return Response.json({ item: [{ media_id: 'mock-draft', update_time: 100,
    content: { news_item: [{ title: '本地配置验证' }] } }] });
};`);
  const baseEnv = { ...process.env, WECHAT_ENV_FILE: envFile };
  delete baseEnv.WECHAT_APP_ID;
  delete baseEnv.WECHAT_APP_SECRET;
  for (const override of [false, true]) {
    const env = { ...baseEnv, EXPECTED_APP: override ? 'process-app' : 'file-app',
      EXPECTED_SECRET: override ? 'process-secret' : 'file-secret' };
    if (override) { env.WECHAT_APP_ID = 'process-app'; env.WECHAT_APP_SECRET = 'process-secret'; }
    const { stdout, stderr } = await run(process.execPath, ['--import', preload, cli, 'drafts'], { env });
    assert.equal(JSON.parse(stdout).mediaId, 'mock-draft');
    assert.equal(stderr, '');
    assert.doesNotMatch(stdout, /file-secret|process-secret|mock-token/);
  }
});

test('explicitly missing local config reports the file without contacting WeChat', async () => {
  await assert.rejects(run(process.execPath, [cli, 'drafts'], {
    env: { ...process.env, WECHAT_ENV_FILE: '/nonexistent/wechat-config.env' },
  }), (error) => /无法读取本地公众号配置/.test(error.stderr));
});
