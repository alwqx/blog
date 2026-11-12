import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WeChatAPI, RequestNotSentError } from '../api.mjs';

test('uses stable token and draft endpoints only, with the documented update envelope', async () => {
  const calls = [];
  const api = new WeChatAPI({ appId: 'app', appSecret: 'private-secret', fetcher: async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url: new URL(url), body });
    if (url.endsWith('/stable_token')) return Response.json({ access_token: 'private-token', expires_in: 7200 });
    if (url.includes('/draft/get')) return Response.json({ news_item: [{ title: '标题' }] });
    if (url.includes('/draft/add')) return Response.json({ media_id: 'draft-1' });
    return Response.json({ errcode: 0 });
  } });
  await api.createDraft({ title: '标题' });
  await api.getDraft('draft-1');
  await api.updateDraft('draft-1', { title: '新标题' });
  assert.equal(calls.filter((call) => call.url.pathname.endsWith('stable_token')).length, 1);
  assert.equal(calls[0].body.force_refresh, false);
  assert.deepEqual(calls[3].body, { media_id: 'draft-1', index: 0, articles: { title: '新标题' } });
  await assert.rejects(api.request('/cgi-bin/freepublish/submit', {}), /仅允许/);
});

test('credentials and token-bearing URLs are not exposed by errors', async () => {
  const secret = 'secret-do-not-print';
  const api = new WeChatAPI({ appId: 'app', appSecret: secret, fetcher: async () => {
    throw new Error(`https://api.weixin.qq.com?secret=${secret}`);
  } });
  await assert.rejects(api.accessToken(), (error) => !error.message.includes(secret) && !error.message.includes('https://'));
});

test('IP allowlist and missing permissions have distinct errors', async () => {
  for (const [code, message] of [[40164, /白名单/], [48001, /权限/]]) {
    const api = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async () => Response.json({ errcode: code, errmsg: 'failure' }) });
    await assert.rejects(api.accessToken(), message);
  }
});

test('draft read-back rejects multi-article bundles instead of modifying their first article', async () => {
  const api = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async (url) =>
    url.endsWith('/stable_token') ? Response.json({ access_token: 'token' }) : Response.json({ news_item: [{}, {}] }) });
  await assert.rejects(api.getDraft('bundle'), /单篇/);
});

test('draft listing exposes titles and IDs for recovery without printing article content', async () => {
  const api = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async (url) =>
    url.endsWith('/stable_token') ? Response.json({ access_token: 'token' }) : Response.json({ item: [
      { media_id: 'draft-1', update_time: 100, content: { news_item: [{ title: '示例', content: 'private body' }] } },
    ] }) });
  assert.deepEqual(await api.listDrafts(), [{ mediaId: 'draft-1', updatedAt: 100, titles: ['示例'] }]);
});

test('a token-only network failure is distinguished from an uncertain draft write', async () => {
  const endpoints = [];
  const tokenFailure = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async (url) => {
    endpoints.push(new URL(url).pathname);
    throw new Error('offline');
  } });
  await assert.rejects(tokenFailure.createDraft({ title: 'draft' }), (error) => {
    assert.ok(error instanceof RequestNotSentError);
    assert.match(error.message, /业务请求尚未发送/);
    assert.doesNotMatch(error.message, /结果可能未知|保留状态/);
    return true;
  });
  assert.deepEqual(endpoints, ['/cgi-bin/stable_token']);
  const draftFailure = new WeChatAPI({ appId: 'app', appSecret: 'secret', fetcher: async (url) => {
    if (url.endsWith('/stable_token')) return Response.json({ access_token: 'token' });
    throw new Error('connection lost after sending draft');
  } });
  await assert.rejects(draftFailure.createDraft({ title: 'draft' }),
    (error) => !(error instanceof RequestNotSentError) && /结果可能未知/.test(error.message));
});
