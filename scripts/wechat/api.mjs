export class WeChatError extends Error {
  constructor(code, message) { super(`微信接口错误 ${code}：${message}`); this.code = code; }
}

export class RequestNotSentError extends Error {}

const ALLOWED = new Set(['/cgi-bin/stable_token', '/cgi-bin/media/uploadimg',
  '/cgi-bin/material/add_material?type=thumb', '/cgi-bin/draft/add', '/cgi-bin/draft/update',
  '/cgi-bin/draft/get', '/cgi-bin/draft/batchget']);

export class WeChatAPI {
  constructor({ appId, appSecret, fetcher = fetch }) {
    if (!appId || !appSecret) throw new Error('请在本地 .wechat/wechat.env 中填写 WECHAT_APP_ID、WECHAT_APP_SECRET。');
    this.appId = appId;
    this.appSecret = appSecret;
    this.fetcher = fetcher;
  }

  async request(endpoint, body, form = false) {
    if (!ALLOWED.has(endpoint)) throw new Error('程序仅允许草稿和图片相关接口。');
    let url = `https://api.weixin.qq.com${endpoint}`;
    if (endpoint !== '/cgi-bin/stable_token') {
      let token;
      try { token = await this.accessToken(); }
      catch (error) {
        // Authentication failed before this business request was sent. In
        // particular, a token timeout is not an uncertain draft mutation.
        throw new RequestNotSentError(`获取接口凭据失败，业务请求尚未发送：${error.message}`);
      }
      url += `${endpoint.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`;
    }
    let response;
    try {
      response = await this.fetcher(url, { method: 'POST', signal: AbortSignal.timeout(30000),
        headers: form ? undefined : { 'content-type': 'application/json; charset=utf-8' },
        body: form ? body : JSON.stringify(body) });
    } catch {
      // Never print request URLs, access tokens or credential-bearing request bodies.
      throw new Error(endpoint === '/cgi-bin/stable_token' ? '获取微信接口凭据超时或网络中断。'
        : '微信请求超时或网络中断，写入结果可能未知；请保留状态文件并按恢复说明处理。');
    }
    let payload;
    try { payload = await response.json(); }
    catch { throw new Error(endpoint === '/cgi-bin/stable_token' ? '微信凭据接口返回了非 JSON 响应。'
      : '微信返回了非 JSON 响应，写入结果可能未知。'); }
    if (!response.ok) throw new Error(endpoint === '/cgi-bin/stable_token' ? `微信凭据接口返回 HTTP ${response.status}。`
      : `微信返回 HTTP ${response.status}，写入结果可能未知。`);
    if (payload.errcode) {
      const hints = { 40164: '出口 IP 不在公众号白名单中。', 48001: '当前公众号未获得此接口权限。',
        89503: '需要公众号管理员确认此次调用。', 40007: '草稿或素材不存在。', 46001: '素材不存在。' };
      let message = hints[payload.errcode] || String(payload.errmsg || '未知错误');
      for (const secret of [this.appSecret, this.token]) if (secret) message = message.replaceAll(secret, '[REDACTED]');
      throw new WeChatError(payload.errcode, message);
    }
    return payload;
  }

  async accessToken() {
    if (this.token && this.tokenExpires > Date.now() + 60000) return this.token;
    const result = await this.request('/cgi-bin/stable_token', { grant_type: 'client_credential',
      appid: this.appId, secret: this.appSecret, force_refresh: false });
    if (!result.access_token) throw new Error('微信未返回 access_token。');
    this.token = result.access_token;
    this.tokenExpires = Date.now() + Number(result.expires_in || 7200) * 1000;
    return this.token;
  }

  async upload(asset, cover = false) {
    const form = new FormData();
    form.append('media', new Blob([asset.bytes], { type: asset.type }), asset.filename);
    const result = await this.request(cover ? '/cgi-bin/material/add_material?type=thumb' : '/cgi-bin/media/uploadimg', form, true);
    const value = cover ? result.media_id : result.url;
    if (!value || (!cover && !/^https?:\/\//.test(value))) throw new Error('微信未返回有效的图片上传结果。');
    return value;
  }

  async getDraft(mediaId) {
    const result = await this.request('/cgi-bin/draft/get', { media_id: mediaId });
    if (!Array.isArray(result.news_item) || result.news_item.length !== 1) {
      throw new Error('草稿结构发生变化；仅支持单篇图文草稿，请在后台检查。');
    }
    return result.news_item[0];
  }

  async createDraft(article) {
    const result = await this.request('/cgi-bin/draft/add', { articles: [article] });
    if (!result.media_id) throw new Error('微信未返回草稿 media_id，结果未知。');
    return result.media_id;
  }

  async listDrafts(offset = 0) {
    const result = await this.request('/cgi-bin/draft/batchget', { offset, count: 20, no_content: 1 });
    if (!Array.isArray(result.item)) throw new Error('微信未返回预期的草稿列表。');
    return result.item.map((item) => ({ mediaId: item.media_id, updatedAt: item.update_time,
      titles: (item.content?.news_item || []).map((article) => article.title) }));
  }

  async updateDraft(mediaId, article) {
    await this.request('/cgi-bin/draft/update', { media_id: mediaId, index: 0, articles: article });
  }
}
