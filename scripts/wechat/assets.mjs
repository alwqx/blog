import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { localAsset, sha256 } from './render.mjs';

const MAX_DOWNLOAD = 20 * 1024 * 1024;

export async function imageBytes(source, article, config, fetcher = fetch) {
  if (!/^https?:\/\//i.test(source)) return readFile(await localAsset(source, article, config));
  let response;
  try { response = await fetcher(source, { signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error(`下载文章图片失败：${source}`); }
  if (!response.ok) throw new Error(`下载文章图片失败（HTTP ${response.status}）：${source}`);
  if (Number(response.headers.get('content-length')) > MAX_DOWNLOAD) throw new Error(`图片超过 20 MB：${source}`);
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > MAX_DOWNLOAD) throw new Error(`图片超过 20 MB：${source}`);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function prepareImage(input, cover = false, { allowStaticAnimation = false } = {}) {
  const image = () => sharp(input, { limitInputPixels: 40000000 }).rotate();
  const metadata = await image().metadata();
  if (!cover && metadata.pages > 1 && !allowStaticAnimation) {
    throw new Error('正文包含动画图片；微信正文上传接口仅支持 JPG/PNG。请改为静态图，或设置 wechat.allowStaticAnimation: true 明确允许只保留首帧。');
  }
  if (!cover) {
    const png = await image().resize({ width: 1920, withoutEnlargement: true }).png().toBuffer();
    if (png.length < 1024 * 1024) return { bytes: png, type: 'image/png', filename: 'image.png', hash: sha256(png) };
  }
  for (const quality of [88, 78, 68, 58, 48, 38]) {
    const pipeline = image().resize(cover ? { width: 900, height: 383, fit: 'cover' }
      : { width: 1920, withoutEnlargement: true });
    const bytes = await pipeline.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (bytes.length < (cover ? 64 * 1024 : 1024 * 1024)) {
      return { bytes, type: 'image/jpeg', filename: cover ? 'cover.jpg' : 'image.jpg', hash: sha256(bytes) };
    }
  }
  throw new Error(`无法将${cover ? '封面' : '正文图片'}压缩到微信限制以内。`);
}

export async function prepareAssets(rendered, config, { offline = false, fetcher = fetch } = {}) {
  const images = new Map();
  for (const [source, placeholder] of rendered.images) {
    if (offline && /^https?:\/\//i.test(source)) { images.set(placeholder, { source, offline: true }); continue; }
    images.set(placeholder, { source, ...await prepareImage(await imageBytes(source, rendered.article, config, fetcher), false,
      { allowStaticAnimation: rendered.article.metadata.wechat?.allowStaticAnimation === true }) });
  }
  if (!rendered.cover) throw new Error('需要配置 wechat.cover 或默认封面。');
  if (offline && /^https?:\/\//i.test(rendered.cover)) throw new Error('离线预览需要本地封面。');
  const cover = await prepareImage(await imageBytes(rendered.cover, rendered.article, config, fetcher), true);
  const fingerprint = sha256(JSON.stringify({ title: rendered.title, author: rendered.author, digest: rendered.digest,
    sourceURL: rendered.sourceURL, html: rendered.html, cover: cover.hash,
    images: [...images].map(([placeholder, asset]) => [placeholder, asset.hash || asset.source]) }));
  return { ...rendered, images, cover, fingerprint };
}
