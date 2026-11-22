/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  RefreshCw,
  Edit3,
  ListTodo,
  Calendar,
  AlertTriangle,
  Lock,
  LogOut,
  UserCheck,
  Search,
  Eraser,
  HardDrive,
  Send,
  Upload,
  X
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  initWorkspaceAuth,
  signInWithGoogleWorkspace,
  signOutGoogleWorkspace,
  getWorkspaceAccessToken,
  listTaskLists,
  createTaskList,
  updateTaskList,
  deleteTaskList,
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  clearCompletedTasks,
  type GoogleTaskList,
  type GoogleTaskItem
} from '../utils/googleWorkspace';
import { createDriveFile } from '../utils/googleDrive';

interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => Promise<void>;
}

const GoogleSignInMaterialButton: React.FC<{ onClick: () => void; disabled?: boolean; label?: string }> = ({
  onClick,
  disabled,
  label = 'Sign in with Google'
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="gsi-material-button"
  >
    <div className="gsi-material-button-state" />
    <div className="gsi-material-button-content-wrapper">
      <div className="gsi-material-button-icon">
        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          <path fill="none" d="M0 0h48v48H0z" />
        </svg>
      </div>
      <span className="gsi-material-button-contents">{disabled ? 'Signing in...' : label}</span>
      <span style={{ display: 'none' }}>{label}</span>
    </div>
  </button>
);

interface GoogleTasksModuleProps {
  onInjectIntoChat?: (content: string, immediate?: boolean) => void;
}

export const GoogleTasksModule: React.FC<GoogleTasksModuleProps> = ({ onInjectIntoChat }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(getWorkspaceAccessToken());
  const [needsAuth, setNeedsAuth] = useState<boolean>(!getWorkspaceAccessToken());
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Create List Modal
  const [newListTitle, setNewListTitle] = useState<string>('');
  const [creatingList, setCreatingList] = useState<boolean>(false);

  // Rename List Modal
  const [renamingList, setRenamingList] = useState<{ id: string; title: string } | null>(null);

  // Create Task Form
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskNotes, setNewTaskNotes] = useState<string>('');
  const [newTaskDue, setNewTaskDue] = useState<string>('');
  const [creatingTask, setCreatingTask] = useState<boolean>(false);

  // Edit Task Modal
  const [editingTask, setEditingTask] = useState<{
    id: string;
    title: string;
    notes: string;
    due: string;
  } | null>(null);

  // Bulk Checklist Import Modal
  const [showBulkModal, setShowBulkModal] = useState<boolean>(false);
  const [bulkLinesText, setBulkLinesText] = useState<string>('');
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // MANDATORY confirmation state for ALL mutating/destructive Google Workspace API calls
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmation | null>(null);
  const [executingConfirm, setExecutingConfirm] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = initWorkspaceAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
        setNeedsAuth(false);
      },
      () => {
        setAccessToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const loadTasksForList = useCallback(async (token: string, listId: string) => {
    setLoading(true);
    setError(null);
    try {
      const items = await listTasks(token, listId, { showCompleted: true, showHidden: true });
      setTasks(items);
    } catch (err: any) {
      const msg = err?.message || 'Failed to load Google Tasks.';
      if (msg.includes('401') || msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('token')) {
        setNeedsAuth(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(async () => {
    const token = accessToken || getWorkspaceAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const lists = await listTaskLists(token);
      setTaskLists(lists);
      const selected = lists.find(l => l.id === activeListId)?.id || lists[0]?.id || '@default';
      setActiveListId(selected);
      const items = await listTasks(token, selected, { showCompleted: true, showHidden: true });
      setTasks(items);
    } catch (err: any) {
      const msg = err?.message || 'Failed to fetch Google Tasks lists.';
      if (msg.includes('401') || msg.toLowerCase().includes('token')) {
        setNeedsAuth(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeListId]);

  useEffect(() => {
    if (accessToken) {
      loadAll();
    }
  }, [accessToken]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);
    try {
      const res = await signInWithGoogleWorkspace();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setNeedsAuth(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleWorkspace();
    setUser(null);
    setAccessToken(null);
    setNeedsAuth(true);
    setTaskLists([]);
    setTasks([]);
  };

  const handleSelectList = async (listId: string) => {
    setActiveListId(listId);
    const token = accessToken || getWorkspaceAccessToken();
    if (token) {
      await loadTasksForList(token, listId);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = accessToken || getWorkspaceAccessToken();
    if (!token || !newListTitle.trim()) return;
    setCreatingList(true);
    setError(null);
    try {
      const created = await createTaskList(token, newListTitle.trim());
      setNewListTitle('');
      const lists = await listTaskLists(token);
      setTaskLists(lists);
      setActiveListId(created.id);
      await loadTasksForList(token, created.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to create task list');
    } finally {
      setCreatingList(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = accessToken || getWorkspaceAccessToken();
    if (!token || !newTaskTitle.trim() || !activeListId) return;
    setCreatingTask(true);
    setError(null);
    try {
      await createTask(token, activeListId, {
        title: newTaskTitle.trim(),
        notes: newTaskNotes.trim() || undefined,
        due: newTaskDue || undefined
      });
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
      await loadTasksForList(token, activeListId);
    } catch (err: any) {
      setError(err?.message || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  // Trigger confirmation modal for toggling task status
  const requestToggleTask = (task: GoogleTaskItem) => {
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    setPendingConfirm({
      title: nextStatus === 'completed' ? 'Mark Task Completed?' : 'Reopen Task?',
      description: `Update status of "${task.title}" to ${nextStatus === 'completed' ? 'Completed' : 'Needs Action'} in Google Tasks?`,
      confirmLabel: nextStatus === 'completed' ? 'Confirm Complete' : 'Confirm Reopen',
      destructive: false,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token || !activeListId) return;
        await updateTask(token, activeListId, task.id, { status: nextStatus });
        await loadTasksForList(token, activeListId);
      }
    });
  };

  // Trigger confirmation modal for saving task edits
  const requestSaveEditTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title.trim()) return;
    const snapshot = { ...editingTask };
    setPendingConfirm({
      title: 'Confirm Task Update',
      description: `Overwrite task "${snapshot.title}" in your Google Tasks list with your edited title, notes, and due date?`,
      confirmLabel: 'Save Changes',
      destructive: false,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token || !activeListId) return;
        await updateTask(token, activeListId, snapshot.id, {
          title: snapshot.title.trim(),
          notes: snapshot.notes,
          due: snapshot.due || undefined
        });
        setEditingTask(null);
        await loadTasksForList(token, activeListId);
      }
    });
  };

  // Trigger confirmation modal for deleting a task
  const requestDeleteTask = (task: GoogleTaskItem) => {
    setPendingConfirm({
      title: 'Delete Task from Google Tasks?',
      description: `Permanently delete "${task.title}" from your Google Tasks account? This action cannot be undone.`,
      confirmLabel: 'Permanently Delete',
      destructive: true,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token || !activeListId) return;
        await deleteTask(token, activeListId, task.id);
        await loadTasksForList(token, activeListId);
      }
    });
  };

  // Trigger confirmation modal for clearing completed tasks
  const requestClearCompleted = () => {
    const completedCount = tasks.filter(t => t.status === 'completed').length;
    if (completedCount === 0) return;
    setPendingConfirm({
      title: `Clear ${completedCount} Completed Task(s)?`,
      description: `Remove all ${completedCount} completed task(s) from the active Google Tasks list?`,
      confirmLabel: `Clear ${completedCount} Completed`,
      destructive: true,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token || !activeListId) return;
        await clearCompletedTasks(token, activeListId);
        await loadTasksForList(token, activeListId);
      }
    });
  };

  // Trigger confirmation modal for renaming a list
  const requestRenameList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingList || !renamingList.title.trim()) return;
    const snap = { ...renamingList };
    setPendingConfirm({
      title: 'Rename Google Tasks List?',
      description: `Rename list to "${snap.title.trim()}" in your Google Tasks account?`,
      confirmLabel: 'Confirm Rename',
      destructive: false,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token) return;
        await updateTaskList(token, snap.id, snap.title.trim());
        setRenamingList(null);
        await loadAll();
      }
    });
  };

  // Trigger confirmation modal for deleting a list
  const requestDeleteList = (list: GoogleTaskList) => {
    setPendingConfirm({
      title: `Delete List "${list.title}"?`,
      description: `Permanently delete task list "${list.title}" and all tasks inside it from Google Tasks? This cannot be undone.`,
      confirmLabel: 'Delete Task List',
      destructive: true,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token) return;
        await deleteTaskList(token, list.id);
        setActiveListId('');
        await loadAll();
      }
    });
  };

  // Trigger confirmation modal for exporting active task list to Google Drive as Markdown
  const requestExportToDrive = () => {
    const listTitle = activeList?.title || 'Tasks';
    const fileName = `Google_Tasks_${listTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.md`;
    setPendingConfirm({
      title: `Export "${listTitle}" to Google Drive?`,
      description: `Create Markdown file "${fileName}" containing ${tasks.length} task(s) inside your Google Drive account?`,
      confirmLabel: 'Confirm Drive Export',
      destructive: false,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token) return;
        const lines = [
          `# ${listTitle}`,
          `Exported: ${new Date().toISOString()}`,
          '',
          ...tasks.map((t) => {
            const box = t.status === 'completed' ? '[x]' : '[ ]';
            const due = t.due ? ` (Due: ${t.due.slice(0, 10)})` : '';
            const notes = t.notes ? `\n  > ${t.notes.replace(/\n/g, '\n  > ')}` : '';
            return `- ${box} ${t.title}${due}${notes}`;
          })
        ];
        const created = await createDriveFile(token, fileName, lines.join('\n'), 'text/markdown');
        setExportNotice(`Exported "${created.name}" to Google Drive.`);
        setTimeout(() => setExportNotice(null), 5000);
      }
    });
  };

  // Trigger confirmation modal for bulk importing lines into Google Tasks
  const requestBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = bulkLinesText
      .split(/\r?\n/)
      .map((l) => l.replace(/^\s*(?:[-*]|\d+[.)]|\[[ xX]?\]\s*)+/, '').trim())
      .filter(Boolean);
    if (lines.length === 0) return;
    const targetName = activeList?.title || 'Default List';
    setPendingConfirm({
      title: `Import ${lines.length} Task(s) into "${targetName}"?`,
      description: `Create ${lines.length} new task(s) inside your Google Tasks list "${targetName}"? First item: "${lines[0]}".`,
      confirmLabel: `Create ${lines.length} Tasks`,
      destructive: false,
      onConfirm: async () => {
        const token = accessToken || getWorkspaceAccessToken();
        if (!token || !activeListId) return;
        for (const title of lines) {
          await createTask(token, activeListId, { title });
        }
        setShowBulkModal(false);
        setBulkLinesText('');
        await loadTasksForList(token, activeListId);
      }
    });
  };

  const executePendingConfirmation = async () => {
    if (!pendingConfirm) return;
    setExecutingConfirm(true);
    setError(null);
    try {
      await pendingConfirm.onConfirm();
      setPendingConfirm(null);
    } catch (err: any) {
      setError(err?.message || 'Operation failed');
    } finally {
      setExecutingConfirm(false);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'active' && t.status === 'completed') return false;
    if (filterMode === 'completed' && t.status !== 'completed') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q);
    }
    return true;
  });

  const activeList = taskLists.find(l => l.id === activeListId);
  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-sky-950/40 border border-zinc-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <ListTodo className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-100 font-mono">Google Tasks Manager</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold">
                Tasks API v1
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Manage Google Tasks lists, due dates, and completion states with permission from your account.
            </p>
          </div>
        </div>

        {user && !needsAuth ? (
          <div className="flex items-center gap-3 bg-zinc-950/80 p-2 pl-3.5 rounded-2xl border border-zinc-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-zinc-200 font-medium">{user.email || user.displayName || 'Connected Account'}</span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <GoogleSignInMaterialButton onClick={handleSignIn} disabled={isSigningIn} />
        )}
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-mono flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">{error}</div>
        </div>
      )}

      {exportNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 text-xs font-mono flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="flex-1">{exportNotice}</div>
        </div>
      )}

      {needsAuth ? (
        <div className="p-10 rounded-3xl bg-zinc-900/40 border border-zinc-800 text-center space-y-5 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100 font-mono">Connect Google Tasks</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sign in with your Google account to view task lists, create to-dos, and update tasks with your explicit confirmation.
          </p>
          <div className="flex justify-center">
            <GoogleSignInMaterialButton onClick={handleSignIn} disabled={isSigningIn} label="Sign in with Google" />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
          {/* Task Lists Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 uppercase text-[11px]">Task Lists ({taskLists.length})</span>
                <button
                  onClick={loadAll}
                  disabled={loading}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-sky-300 cursor-pointer"
                  title="Refresh Task Lists"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {taskLists.map(list => (
                  <div
                    key={list.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition-all ${
                      activeListId === list.id
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-200 font-bold'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <button
                      onClick={() => handleSelectList(list.id)}
                      className="flex-1 text-left truncate cursor-pointer"
                    >
                      {list.title}
                    </button>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setRenamingList({ id: list.id, title: list.title })}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-amber-300 cursor-pointer"
                        title="Rename List"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      {taskLists.length > 1 && (
                        <button
                          onClick={() => requestDeleteList(list)}
                          className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 cursor-pointer"
                          title="Delete List"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleCreateList} className="pt-2 border-t border-zinc-800 flex gap-1.5">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={e => setNewListTitle(e.target.value)}
                  placeholder="New list name..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={creatingList || !newListTitle.trim()}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold disabled:opacity-40 cursor-pointer"
                  title="Create List"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Active Task List View */}
          <div className="lg:col-span-3 space-y-4 font-mono text-xs">
            {/* Add Task Form */}
            <form onSubmit={handleCreateTask} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-200 text-xs">
                  Add Task to <span className="text-sky-400">{activeList?.title || 'Default List'}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  className="sm:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                <input
                  type="date"
                  value={newTaskDue}
                  onChange={e => setNewTaskDue(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newTaskNotes}
                  onChange={e => setNewTaskNotes(e.target.value)}
                  placeholder="Optional notes or context..."
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={creatingTask || !newTaskTitle.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{creatingTask ? 'Adding...' : 'Add Task'}</span>
                </button>
              </div>
            </form>

            {/* Filter & Search Bar */}
            <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {(['all', 'active', 'completed'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`px-3 py-1.5 rounded-xl capitalize transition-colors cursor-pointer ${
                      filterMode === mode
                        ? 'bg-sky-500/20 border border-sky-500/40 text-sky-300 font-bold'
                        : 'bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-1 sm:flex-initial flex-wrap">
                <div className="relative flex-1 sm:w-48">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Filter tasks..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-sky-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Bulk Import Checklist Lines"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Bulk Import</span>
                </button>
                <button
                  type="button"
                  onClick={requestExportToDrive}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
                  title="Export List to Google Drive (Requires Confirmation)"
                >
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>Export to Drive</span>
                </button>
                {completedCount > 0 && (
                  <button
                    onClick={requestClearCompleted}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold flex items-center gap-1.5 cursor-pointer"
                    title="Clear Completed Tasks (Requires Confirmation)"
                  >
                    <Eraser className="w-3.5 h-3.5" />
                    <span>Clear ({completedCount})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tasks List */}
            {loading ? (
              <div className="p-10 text-center text-zinc-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>Syncing Google Tasks...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="p-10 text-center text-zinc-500 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                No tasks match the current filter in this list.
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map(task => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-2xl border flex items-start justify-between gap-3 transition-all ${
                        isDone
                          ? 'bg-zinc-900/30 border-zinc-800/60 opacity-75'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <button
                        onClick={() => requestToggleTask(task)}
                        className="mt-0.5 text-sky-400 hover:text-sky-300 shrink-0 cursor-pointer"
                        title={isDone ? 'Mark Active (Requires Confirmation)' : 'Mark Completed (Requires Confirmation)'}
                      >
                        {isDone ? <CheckSquare className="w-5 h-5 text-emerald-400" /> : <Square className="w-5 h-5" />}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className={`text-sm font-sans font-semibold ${isDone ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                          {task.title}
                        </div>
                        {task.notes && (
                          <p className="text-xs font-sans text-zinc-400 whitespace-pre-wrap">{task.notes}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-zinc-500">
                          {task.due && (
                            <span className="inline-flex items-center gap-1 text-amber-300/90">
                              <Calendar className="w-3 h-3" />
                              Due {new Date(task.due).toLocaleDateString()}
                            </span>
                          )}
                          {task.updated && (
                            <span>Updated {new Date(task.updated).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {onInjectIntoChat && (
                          <button
                            onClick={() =>
                              onInjectIntoChat(
                                `Execute Google Task from list "${activeList?.title || 'Default'}":\nTitle: ${task.title}${task.due ? `\nDue: ${task.due.slice(0, 10)}` : ''}${task.notes ? `\nNotes: ${task.notes}` : ''}`,
                                false
                              )
                            }
                            className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-300 cursor-pointer"
                            title="Dispatch Task to AI Chat"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setEditingTask({
                              id: task.id,
                              title: task.title,
                              notes: task.notes || '',
                              due: task.due ? task.due.slice(0, 10) : ''
                            })
                          }
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-amber-300 cursor-pointer"
                          title="Edit Task"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => requestDeleteTask(task)}
                          className="p-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                          title="Delete Task (Requires Confirmation)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingTask(null);
          }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Edit Task</h3>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                aria-label="Close Edit Task Modal"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={requestSaveEditTask} className="space-y-3">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Due Date</label>
                <input
                  type="date"
                  value={editingTask.due}
                  onChange={e => setEditingTask({ ...editingTask, due: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={editingTask.notes}
                  onChange={e => setEditingTask({ ...editingTask, notes: e.target.value })}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold cursor-pointer"
                >
                  Review & Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename List Modal */}
      {renamingList && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setRenamingList(null);
          }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-sm w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Rename Task List</h3>
              <button
                type="button"
                onClick={() => setRenamingList(null)}
                aria-label="Close Rename Modal"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={requestRenameList} className="space-y-3">
              <input
                type="text"
                required
                value={renamingList.title}
                onChange={e => setRenamingList({ ...renamingList, title: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingList(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold cursor-pointer"
                >
                  Review Rename
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Checklist Import Modal */}
      {showBulkModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowBulkModal(false);
          }}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-zinc-100">Bulk Import Checklist to Google Tasks</h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                aria-label="Close Bulk Import Modal"
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Paste Markdown checkboxes or one task title per line. You will review and confirm before tasks are added.
            </p>
            <form onSubmit={requestBulkImport} className="space-y-3">
              <textarea
                rows={7}
                value={bulkLinesText}
                onChange={(e) => setBulkLinesText(e.target.value)}
                placeholder={'- [ ] Audit API secrets\n- [ ] Verify Google Tasks sync\n- [ ] Run tsc --noEmit'}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!bulkLinesText.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-zinc-950 font-bold disabled:opacity-40 cursor-pointer"
                >
                  Review Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANDATORY Explicit Confirmation Modal for Every Mutating / Destructive Google Tasks Action */}
      {pendingConfirm && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget && !executingConfirm) setPendingConfirm(null);
          }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <div className={`bg-zinc-950 border rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-5 shadow-2xl font-mono text-xs ${
            pendingConfirm.destructive ? 'border-rose-500/50' : 'border-amber-500/50'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                  pendingConfirm.destructive
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                    : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                }`}>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-zinc-100">{pendingConfirm.title}</h3>
                  <p className="text-[11px] text-zinc-400">Explicit Google Tasks Action Confirmation</p>
                </div>
              </div>
              {!executingConfirm && (
                <button
                  type="button"
                  onClick={() => setPendingConfirm(null)}
                  aria-label="Close Confirmation"
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-200 leading-relaxed">
              {pendingConfirm.description}
            </div>

            <div className="flex items-center justify-end gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => setPendingConfirm(null)}
                disabled={executingConfirm}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executePendingConfirmation}
                disabled={executingConfirm}
                className={`px-5 py-2 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer ${
                  pendingConfirm.destructive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                {executingConfirm ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying...</span>
                  </>
                ) : (
                  <span>{pendingConfirm.confirmLabel}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
