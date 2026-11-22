import fs from 'fs';
import path from 'path';

const MEMORY_DIR = path.join(process.cwd(), 'data');
const TASK_MEMORY_FILE = path.join(MEMORY_DIR, 'task_memory.json');

export interface TaskActionLogEntry {
  id: string;
  cycle: number;
  timestamp: string;
  action: string;
  status: 'running' | 'complete' | 'accomplished' | 'interrupted';
  details?: string;
}

export interface TaskRecord {
  id: string;
  description: string;
  status: 'active' | 'completed' | 'interrupted';
  createdAt: string;
  updatedAt: string;
  agentId?: string;
  agentName?: string;
  goal?: string;
  cycle?: number;
  lastAction?: string;
  progressNotes?: string;
  source?: 'chat' | 'voice' | 'workflow' | 'autonomous';
  sessionId?: string;
  actionLog?: TaskActionLogEntry[];
  checkpointJson?: string;
}

function writeJsonAtomic(filePath: string, payload: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

export function saveTaskMemory(tasks: TaskRecord[]): void {
  try {
    const clean = Array.isArray(tasks) ? tasks.slice(-200) : [];
    writeJsonAtomic(TASK_MEMORY_FILE, clean);
  } catch (err) {
    console.warn('[TaskMemory] Failed to write task_memory.json:', err);
  }
}

export function loadTaskMemory(): TaskRecord[] {
  if (!fs.existsSync(TASK_MEMORY_FILE)) {
    return [];
  }
  try {
    const data = fs.readFileSync(TASK_MEMORY_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function upsertTaskRecord(
  input: Partial<TaskRecord> & { id: string; description?: string }
): TaskRecord {
  const tasks = loadTaskMemory();
  const now = new Date().toISOString();
  const idx = tasks.findIndex((t) => t.id === input.id);

  if (idx >= 0) {
    const existing = tasks[idx];
    const merged: TaskRecord = {
      ...existing,
      ...input,
      id: existing.id,
      description: input.description ?? existing.description,
      status: input.status ?? existing.status,
      createdAt: existing.createdAt || input.createdAt || now,
      updatedAt: now,
      actionLog: Array.isArray(input.actionLog)
        ? input.actionLog.slice(-60)
        : existing.actionLog
    };
    tasks[idx] = merged;
    saveTaskMemory(tasks);
    return merged;
  }

  const created: TaskRecord = {
    id: input.id,
    description: input.description || input.goal || 'Autonomous orchestrator task',
    status: input.status || 'active',
    createdAt: input.createdAt || now,
    updatedAt: now,
    agentId: input.agentId,
    agentName: input.agentName,
    goal: input.goal,
    cycle: input.cycle ?? 1,
    lastAction: input.lastAction,
    progressNotes: input.progressNotes,
    source: input.source || 'autonomous',
    sessionId: input.sessionId,
    actionLog: Array.isArray(input.actionLog) ? input.actionLog.slice(-60) : undefined,
    checkpointJson: input.checkpointJson
  };
  tasks.push(created);
  saveTaskMemory(tasks);
  return created;
}

export function deleteTaskRecord(id: string): { removed: number; remaining: TaskRecord[] } {
  const tasks = loadTaskMemory();
  const remaining =
    id === 'completed'
      ? tasks.filter((t) => t.status !== 'completed')
      : tasks.filter((t) => t.id !== id);
  const removed = tasks.length - remaining.length;
  if (removed > 0) {
    saveTaskMemory(remaining);
  }
  return { removed, remaining };
}

/**
 * Called at server boot: any task left in 'active' state when the previous process exited
 * or restarted is promoted to 'interrupted' so agents & UI detect and resume it cleanly.
 */
export function markOrphanedActiveTasksInterrupted(): number {
  const tasks = loadTaskMemory();
  let changed = 0;
  const now = new Date().toISOString();
  const updated = tasks.map((t) => {
    if (t.status === 'active') {
      changed += 1;
      const note = `Interrupted across server restart/disconnect at ${now}; queued for automatic resumption.`;
      return {
        ...t,
        status: 'interrupted' as const,
        updatedAt: now,
        progressNotes: t.progressNotes ? `${t.progressNotes} | ${note}` : note
      };
    }
    return t;
  });
  if (changed > 0) {
    saveTaskMemory(updated);
  }
  return changed;
}

export function getTaskResumeSummary(limit = 8): string {
  const tasks = loadTaskMemory();
  const pending = tasks
    .filter((t) => t.status === 'active' || t.status === 'interrupted')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);

  const recentlyCompleted = tasks
    .filter((t) => t.status === 'completed')
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 3);

  if (pending.length === 0 && recentlyCompleted.length === 0) return '';

  const lines: string[] = [];
  if (pending.length > 0) {
    lines.push('ACTIVE / INTERRUPTED TASKS (RESUME AUTOMATICALLY IF RELEVANT):');
    for (const t of pending) {
      lines.push(
        `- [${t.status.toUpperCase()}] id=${t.id} · ${t.description}${t.cycle ? ` (Cycle #${t.cycle})` : ''}${t.lastAction ? ` · Last: ${t.lastAction.slice(0, 120)}` : ''}${t.progressNotes ? ` · Note: ${t.progressNotes.slice(0, 140)}` : ''}`
      );
    }
  }
  if (recentlyCompleted.length > 0) {
    lines.push('RECENTLY COMPLETED TASKS:');
    for (const t of recentlyCompleted) {
      lines.push(`- [COMPLETED] ${t.description}${t.progressNotes ? ` · ${t.progressNotes.slice(0, 100)}` : ''}`);
    }
  }
  return lines.join('\n');
}
