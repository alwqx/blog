import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

export async function writeJSON(filename, value) {
  const temporary = `${filename}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, filename);
}

export async function openState(directory, appId) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const lock = path.join(directory, 'sync.lock');
  try { await mkdir(lock, { mode: 0o700 }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`已有任务或上次任务异常退出：${lock}；确认没有同步进程后再移除此锁目录。`);
    throw error;
  }
  await writeFile(path.join(lock, 'owner.json'), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }), { mode: 0o600 });
  try {
    const filename = path.join(directory, 'state.json');
    let data;
    try { data = JSON.parse(await readFile(filename, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw new Error('同步状态文件损坏；请从备份恢复，不要删除后重跑。');
      data = { version: 1, appId, drafts: {}, assets: {} };
    }
    if (data.version !== 1 || data.appId !== appId || !data.drafts || !data.assets) {
      throw new Error('状态版本或公众号 AppID 不一致，请使用该公众号专属的持久化状态目录。');
    }
    return { data, save: () => writeJSON(filename, data), close: () => rm(lock, { recursive: true }) };
  } catch (error) { await rm(lock, { recursive: true }); throw error; }
}
