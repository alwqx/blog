import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { syncArticle, adoptDraft } from '../sync.mjs';
import { WeChatError, WeChatAPI } from '../api.mjs';
import { openState } from '../state.mjs';

const clone = (value) => structuredClone(value);
function setup() {
  const prepared = { id: 'example', edition: 1, fingerprint: 'first',
    article: { relative: 'content/post/example.md' }, title: '示例', author: '作者', digest: '',
    sourceURL: 'https://blog.example/custom/', html: '<p>正文<img src="wechat-image-0"></p>',
    images: new Map([['wechat-image-0', { hash: 'body-hash', bytes: Buffer.from('image') }]]),
    cover: { hash: 'cover-hash', bytes: Buffer.from('cover') } };
  const state = { data: { drafts: {}, assets: {} }, save: async () => {} };
  const remote = new Map();
  const calls = { creates: 0, updates: 0, uploads: 0 };
  const api = {
    async upload(asset, cover) { calls.uploads++; return cover ? 'cover-id' : 'https://mmbiz.qpic.cn/body-image'; },
    async getDraft(id) {
      if (!remote.has(id)) throw new WeChatError(40007, 'missing');
      return clone(remote.get(id));
    },
    async createDraft(payload) { const id = `draft-${++calls.creates}`; remote.set(id, clone(payload)); return id; },
    async updateDraft(id, payload) { calls.updates++; remote.set(id, clone(payload)); },
  };
  return { prepared, state, api, remote, calls };
}

test('creates once, reuses image uploads and updates the same media_id', async () => {
  const f = setup();
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'created');
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'unchanged');
  f.prepared.html = '<p>修改后的正文<img src="wechat-image-0"></p>';
  f.prepared.fingerprint = 'second';
  const result = await syncArticle(f.prepared, f.state, f.api);
  assert.equal(result.action, 'updated');
  assert.equal(result.mediaId, 'draft-1');
  assert.deepEqual(f.calls, { creates: 1, updates: 1, uploads: 2 });
});

test('image URL rewrites preserve compact nonbreaking spaces within the API character limit', async () => {
  const f = setup();
  f.prepared.html = `<pre><code>${'\u00a0'.repeat(4000)}const x = 1;</code></pre><img src="wechat-image-0">`;
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'created');
  const saved = f.remote.get('draft-1').content;
  assert.ok(saved.length < 20000);
  assert.ok(saved.includes('\u00a0'.repeat(4000)));
  assert.ok(!saved.includes('&nbsp;'));
});

test('manual edits block overwrites even when local content is unchanged', async () => {
  const f = setup();
  await syncArticle(f.prepared, f.state, f.api);
  f.remote.get('draft-1').content += '<p>后台人工修改</p>';
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /人工修改/);
  assert.equal(f.calls.updates, 0);
});

test('missing draft is not recreated; an explicit new edition creates a new record', async () => {
  const f = setup();
  await syncArticle(f.prepared, f.state, f.api);
  f.remote.clear();
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /已不存在/);
  assert.equal(f.calls.creates, 1);
  f.prepared.edition = 2;
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'created');
  assert.equal(f.calls.creates, 2);
});

test('timeout after creation preserves intent and blocks retries until a matching draft is adopted', async () => {
  const f = setup();
  const original = f.api.createDraft;
  f.api.createDraft = async (payload) => { await original(payload); throw new Error('timeout'); };
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /timeout/);
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /创建结果未知/);
  assert.equal(f.calls.creates, 1);
  const adopted = await adoptDraft({ key: 'example:1', mediaId: 'draft-1', state: f.state, api: f.api });
  assert.equal(adopted.action, 'adopted');
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'unchanged');
});

test('adopt rejects wrong content and cannot be used to override manual edits', async () => {
  const f = setup();
  await assert.rejects(adoptDraft({ key: 'example:1', mediaId: 'draft-1', state: f.state, api: f.api }), /仅用于/);
  f.api.createDraft = async () => { throw new Error('timeout'); };
  await assert.rejects(syncArticle(f.prepared, f.state, f.api));
  f.remote.set('wrong', { title: '另一篇文章' });
  await assert.rejects(adoptDraft({ key: 'example:1', mediaId: 'wrong', state: f.state, api: f.api }), /不一致/);
  assert.ok(f.state.data.drafts['example:1'].pending);
});

test('timeout after update is recovered by read-back instead of repeated writes', async () => {
  const f = setup();
  await syncArticle(f.prepared, f.state, f.api);
  const original = f.api.updateDraft;
  f.api.updateDraft = async (...args) => { await original(...args); throw new Error('timeout'); };
  f.prepared.fingerprint = 'second';
  f.prepared.html = '<p>修改后的正文<img src="wechat-image-0"></p>';
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /timeout/);
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'unchanged');
  assert.equal(f.calls.updates, 1);
});

for (const [name, oldHTML, newHTML] of [
  ['style', '<p style="color:red">正文</p>', '<p style="color:blue">正文</p>'],
  ['link', '<a href="https://mp.weixin.qq.com/old">正文</a>', '<a href="https://mp.weixin.qq.com/new">正文</a>'],
  ['code indentation', '<pre><code>if x:<br>\u00a0print(x)</code></pre>', '<pre><code>if x:<br>\u00a0\u00a0\u00a0\u00a0print(x)</code></pre>'],
]) {
  test(`retry an unapplied ${name} update instead of adopting its fingerprint`, async () => {
    const f = setup();
    f.prepared.html = oldHTML;
    f.prepared.images = new Map();
    await syncArticle(f.prepared, f.state, f.api);
    const update = f.api.updateDraft;
    f.api.updateDraft = async () => { f.calls.updates++; throw new Error('timeout before write'); };
    f.prepared.fingerprint = 'second';
    f.prepared.html = newHTML;
    await assert.rejects(syncArticle(f.prepared, f.state, f.api), /timeout/);
    assert.equal(f.state.data.drafts['example:1'].fingerprint, 'first');
    f.api.updateDraft = update;
    assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'updated');
    assert.equal(f.calls.updates, 2);
    assert.equal(f.remote.get('draft-1').content, newHTML);
    assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'unchanged');
  });
}

test('a successful style-only update with a lost response is confirmed without writing again', async () => {
  const f = setup();
  f.prepared.html = '<p style="color:red">正文</p>';
  f.prepared.images = new Map();
  await syncArticle(f.prepared, f.state, f.api);
  const update = f.api.updateDraft;
  f.api.updateDraft = async (...args) => { await update(...args); throw new Error('response lost'); };
  f.prepared.html = '<p style="color:blue">正文</p>';
  f.prepared.fingerprint = 'second';
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /response lost/);
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'unchanged');
  assert.equal(f.calls.updates, 1);
});

test('a manual style edit during pending recovery is preserved and cannot be adopted', async () => {
  const f = setup();
  f.prepared.images = new Map();
  f.prepared.html = '<p style="color:red">正文</p>';
  await syncArticle(f.prepared, f.state, f.api);
  f.api.updateDraft = async () => { throw new Error('timeout'); };
  f.prepared.html = '<p style="color:blue">正文</p>';
  f.prepared.fingerprint = 'second';
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /timeout/);
  f.remote.get('draft-1').content = '<p style="color:green">正文</p>';
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /尚无法确认/);
  await assert.rejects(adoptDraft({ key: 'example:1', mediaId: 'draft-1', state: f.state, api: f.api }), /尚无法确认/);
  assert.equal(f.state.data.drafts['example:1'].fingerprint, 'first');
  assert.ok(f.state.data.drafts['example:1'].pending);
  assert.match(f.remote.get('draft-1').content, /green/);
});

test('cached assets do not turn a token acquisition failure into an uncertain create', async () => {
  const f = setup();
  await syncArticle(f.prepared, f.state, f.api);
  f.prepared.id = 'second-article';
  const endpoints = [];
  const api = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async (url) => {
    endpoints.push(new URL(url).pathname);
    throw new Error('token unavailable');
  } });
  await assert.rejects(syncArticle(f.prepared, f.state, api), /业务请求尚未发送/);
  assert.deepEqual(endpoints, ['/cgi-bin/stable_token']);
  assert.equal(f.state.data.drafts['second-article:1'], undefined);
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'created');
});

test('explicit API rejection can be retried without an ambiguous journal', async () => {
  const f = setup();
  const original = f.api.createDraft;
  f.api.createDraft = async () => { throw new WeChatError(48001, 'unauthorized'); };
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /48001/);
  assert.equal(f.state.data.drafts['example:1'], undefined);
  f.api.createDraft = original;
  assert.equal((await syncArticle(f.prepared, f.state, f.api)).action, 'created');
});

test('remote image filtering fails verification and retains recovery state', async () => {
  const f = setup();
  const original = f.api.createDraft;
  f.api.createDraft = async (payload) => original({ ...payload, content: '<p>正文</p>' });
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /图片丢失/);
  assert.equal(f.state.data.drafts['example:1'].mediaId, 'draft-1');
  assert.ok(f.state.data.drafts['example:1'].pending);
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /图片丢失/);
  assert.equal(f.calls.creates, 1);
});

test('edit while images upload is detected before updating the draft', async () => {
  const f = setup();
  await syncArticle(f.prepared, f.state, f.api);
  f.prepared.fingerprint = 'second';
  f.prepared.cover.hash = 'different-cover';
  const original = f.api.upload;
  f.api.upload = async (...args) => {
    f.remote.get('draft-1').title = '后台刚刚修改';
    return original(...args);
  };
  await assert.rejects(syncArticle(f.prepared, f.state, f.api), /发生变化/);
  assert.equal(f.calls.updates, 0);
});

test('persistent state survives process restarts, locks writers and binds the account', async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'wechat-state-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const first = await openState(directory, 'appid-one');
  first.data.drafts['example:1'] = { mediaId: 'draft-1' };
  await first.save();
  await assert.rejects(openState(directory, 'appid-one'), /已有任务/);
  await first.close();
  const second = await openState(directory, 'appid-one');
  assert.equal(second.data.drafts['example:1'].mediaId, 'draft-1');
  await second.close();
  await assert.rejects(openState(directory, 'appid-two'), /AppID/);
  assert.equal(JSON.parse(await readFile(path.join(directory, 'state.json'), 'utf8')).appId, 'appid-one');
});
