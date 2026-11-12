import { load } from 'cheerio';
import { snapshot, validatePayload, compactHTML, canonicalHTML } from './render.mjs';
import { WeChatError, RequestNotSentError } from './api.mjs';

export function ensureSaved(remote, expected, { confirmMutation = false } = {}) {
  if (remote.title !== expected.title || remote.author !== expected.author ||
      (expected.digest && remote.digest !== expected.digest) ||
      remote.thumb_media_id !== expected.thumb_media_id ||
      remote.content_source_url !== expected.content_source_url) {
    throw new Error('草稿回读与提交字段不一致，请先检查公众号后台。');
  }
  const actualHTML = load(remote.content || '', {}, false);
  const expectedHTML = load(expected.content || '', {}, false);
  const text = ($) => $.root().text().replace(/\s/g, '');
  if (text(actualHTML) !== text(expectedHTML)) throw new Error('微信过滤或更改了正文文字，请检查草稿。');
  const actualImages = actualHTML('img').map((_, element) => actualHTML(element).attr('src')).get();
  const expectedImages = expectedHTML('img').map((_, element) => expectedHTML(element).attr('src')).get();
  if (JSON.stringify(actualImages) !== JSON.stringify(expectedImages)) {
    throw new Error('草稿回读发现正文图片丢失或顺序变化，请检查草稿。');
  }
  if (confirmMutation && canonicalHTML(remote.content) !== canonicalHTML(expected.content)) {
    throw new Error('尚无法确认更新已保存：正文结构、样式、链接或空白与待确认内容不一致，请核对草稿。');
  }
}

async function existingDraft(api, mediaId) {
  try { return await api.getDraft(mediaId); }
  catch (error) {
    if (error instanceof WeChatError && [40007, 46001].includes(error.code)) {
      throw new Error('原草稿已不存在（可能已发布或删除），停止同步；需要新草稿时递增 wechat.edition。');
    }
    throw error;
  }
}

export async function syncArticle(prepared, state, api) {
  const key = `${prepared.id}:${prepared.edition}`;
  const records = state.data.drafts;
  let record = records[key];
  if (record?.pending) {
    if (!record.mediaId) throw new Error(`上次创建结果未知：${key}；请按说明核对并 adopt，禁止直接重建。`);
    const remote = await existingDraft(api, record.mediaId);
    if (record.baseline && snapshot(remote) === record.baseline) {
      // The old version is still present. Keep the old fingerprint so the
      // normal path can safely retry, rather than marking the intent applied.
      delete record.pending;
      await state.save();
    } else {
      ensureSaved(remote, record.pending.expected, { confirmMutation: true });
      record.baseline = snapshot(remote);
      record.fingerprint = record.pending.fingerprint;
      delete record.pending;
      await state.save();
    }
  }
  if (record) {
    const remote = await existingDraft(api, record.mediaId);
    if (snapshot(remote) !== record.baseline) throw new Error('微信后台草稿已有人工修改，已保留该修改并停止自动覆盖。');
    if (record.fingerprint === prepared.fingerprint) return { action: 'unchanged', key, mediaId: record.mediaId };
  }
  const replacements = new Map();
  async function upload(asset, cover) {
    const cacheKey = `${cover ? 'cover' : 'body'}:${asset.hash}`;
    if (!state.data.assets[cacheKey]) {
      state.data.assets[cacheKey] = await api.upload(asset, cover);
      await state.save();
    }
    return state.data.assets[cacheKey];
  }
  for (const [placeholder, asset] of prepared.images) replacements.set(placeholder, await upload(asset, false));
  let content = prepared.html;
  // Placeholders are generated internally and only replaced in image src attributes.
  for (const [placeholder, url] of replacements) {
    const $ = load(content, {}, false);
    $(`img[src="${placeholder}"]`).attr('src', url);
    content = $.html();
  }
  const payload = { article_type: 'news', title: prepared.title, author: prepared.author,
    digest: prepared.digest, content: compactHTML(content), content_source_url: prepared.sourceURL,
    thumb_media_id: await upload(prepared.cover, true), need_open_comment: 0, only_fans_can_comment: 0 };
  validatePayload(payload);
  // Recheck after potentially slow image uploads to catch edits made during preparation.
  if (record && snapshot(await existingDraft(api, record.mediaId)) !== record.baseline) {
    throw new Error('上传图片期间微信草稿发生变化，停止自动覆盖。');
  }
  const updating = Boolean(record);
  record ||= { path: prepared.article.relative };
  records[key] = record;
  record.pending = { expected: payload, fingerprint: prepared.fingerprint, startedAt: new Date().toISOString() };
  await state.save();
  try {
    if (updating) await api.updateDraft(record.mediaId, payload);
    else record.mediaId = await api.createDraft(payload);
  } catch (error) {
    // An explicit rejection is safe to retry; network errors retain the journal.
    if (error instanceof WeChatError || error instanceof RequestNotSentError) {
      delete record.pending;
      if (!updating) delete records[key];
      await state.save();
    }
    throw error;
  }
  await state.save();
  const remote = await existingDraft(api, record.mediaId);
  ensureSaved(remote, payload);
  record.baseline = snapshot(remote);
  record.fingerprint = prepared.fingerprint;
  record.path = prepared.article.relative;
  record.updatedAt = new Date().toISOString();
  delete record.pending;
  await state.save();
  return { action: updating ? 'updated' : 'created', key, mediaId: record.mediaId };
}

export async function adoptDraft({ key, mediaId, state, api }) {
  const record = state.data.drafts[key];
  if (!record?.pending) throw new Error('adopt 仅用于恢复结果未知的任务；不用于覆盖人工修改。');
  if (record.mediaId && record.mediaId !== mediaId) throw new Error('此任务已经记录了不同的 media_id。');
  const remote = await api.getDraft(mediaId);
  ensureSaved(remote, record.pending.expected, { confirmMutation: true });
  record.mediaId = mediaId;
  record.baseline = snapshot(remote);
  record.fingerprint = record.pending.fingerprint;
  delete record.pending;
  await state.save();
  return { action: 'adopted', key, mediaId };
}
