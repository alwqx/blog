import { mkdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { inside, validateArticleId } from './content.mjs';

export async function previewDirectory(config, article, output) {
  const id = article.metadata.wechat?.id;
  validateArticleId(id, { required: false });
  if (output) {
    const directory = path.resolve(output);
    await mkdir(directory, { recursive: true });
    return directory;
  }
  await mkdir(config.previewDirectory, { recursive: true });
  const root = await realpath(config.previewDirectory);
  const directory = path.resolve(root, id || path.basename(article.file, '.md'));
  const relative = path.relative(root, directory);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('自动生成的预览路径必须位于预览目录内。');
  }
  try { return await inside(root, directory); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await mkdir(directory, { recursive: true });
  // Also reject an existing directory symlink that points outside this root.
  return inside(root, directory);
}
