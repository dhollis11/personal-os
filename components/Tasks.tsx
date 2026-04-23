'use client';

import { useState, useTransition, useMemo, useRef } from 'react';
import type { Task, TaskList, ListColor } from '@/types';
import { dueDisplay, taskSortKey } from '@/lib/task-utils';
import { TaskEditor } from './TaskEditor';

const LIST_COLOR_HEX: Record<ListColor, string> = {
  green: '#a7f3b4',
  blue:  '#7db6ff',
  amber: '#ffd27a',
  pink:  '#ff9ad6',
};

function dueChipColor(tone: ReturnType<typeof dueDisplay>['tone']): string {
  switch (tone) {
    case 'overdue': return '#ff8a7a';
    case 'today':   return '#ffd27a';
    case 'soon':    return '#a7f3b4';
    case 'future':  return '#8a8f9c';
    default:        return '#8a8f9c';
  }
}

export function Tasks({
  tasks,
  lists,
  canEdit,
  onTasksChange,
  onListsChange,
}: {
  tasks: Task[];
  lists: TaskList[];
  canEdit: boolean;
  onTasksChange: (t: Task[]) => void;
  onListsChange: (l: TaskList[]) => void;
}) {
  const [, startTransition] = useTransition();
  const [addingToList, setAddingToList] = useState<string | null>(null); // list id, or 'unlisted', or null
  const [draft, setDraft] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const dragState = useRef<{ id: string; listId: string | null } | null>(null);

  // Group tasks by list_id, keeping the list order. Tasks without a list go last.
  const grouped = useMemo(() => {
    const result: Array<{ list: TaskList | null; tasks: Task[] }> = [];
    const byListId = new Map<string, Task[]>();
    const unlisted: Task[] = [];

    for (const t of tasks) {
      if (t.list_id) {
        if (!byListId.has(t.list_id)) byListId.set(t.list_id, []);
        byListId.get(t.list_id)!.push(t);
      } else {
        unlisted.push(t);
      }
    }

    for (const l of lists) {
      const items = byListId.get(l.id) ?? [];
      items.sort((a, b) => {
        const ka = taskSortKey(a);
        const kb = taskSortKey(b);
        return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
      });
      result.push({ list: l, tasks: items });
    }

    if (unlisted.length > 0) {
      unlisted.sort((a, b) => {
        const ka = taskSortKey(a);
        const kb = taskSortKey(b);
        return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
      });
      result.push({ list: null, tasks: unlisted });
    }

    return result;
  }, [tasks, lists]);

  // ── Task mutations ───────────────────────────────────────────

  async function patchTask(id: string, patch: Partial<Task>) {
    const optimistic = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
    onTasksChange(optimistic);

    try {
      const res = await fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (data.task) {
        // Merge server response + any spawned recurrence
        let next = tasks.map((t) => (t.id === id ? (data.task as Task) : t));
        if (data.spawned) next = [...next, data.spawned as Task];
        onTasksChange(next);
      }
    } catch {
      onTasksChange(tasks); // roll back
    }
  }

  async function toggle(task: Task) {
    if (!canEdit) return;
    startTransition(() => { patchTask(task.id, { done: !task.done }); });
  }

  async function deleteTask(id: string, mode: 'single' | 'all_future') {
    const optimistic =
      mode === 'single'
        ? tasks.filter((t) => t.id !== id)
        : (() => {
            const target = tasks.find((t) => t.id === id);
            const templateId = target?.parent_id ?? target?.id;
            return tasks.filter((t) => t.id !== templateId && t.parent_id !== templateId);
          })();
    onTasksChange(optimistic);

    try {
      await fetch(`/api/tasks?id=${encodeURIComponent(id)}&mode=${mode}`, {
        method: 'DELETE',
      });
    } catch {
      onTasksChange(tasks); // roll back
    }
  }

  async function addTask(listId: string | null, listName: string) {
    const title = draft.trim();
    if (!title || !canEdit) return;
    setDraft('');
    setAddingToList(null);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      user_id: 'me',
      list_id: listId,
      list_name: listName,
      title,
      notes: null,
      due: null,
      due_at: null,
      priority: 'M',
      done: false,
      sort_order: 0,
      recurrence: null,
      parent_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onTasksChange([...tasks, optimistic]);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ list_id: listId, list_name: listName, title }),
      });
      const data = await res.json();
      if (data.task) {
        onTasksChange([...tasks.filter((t) => t.id !== tempId), data.task]);
      }
    } catch {
      onTasksChange(tasks.filter((t) => t.id !== tempId));
    }
  }

  // ── List mutations ───────────────────────────────────────────

  async function createList() {
    const name = newListName.trim();
    if (!name || !canEdit) return;
    setNewListName('');
    setAddingList(false);

    // Pick a color that's not already used (if possible)
    const usedColors = new Set(lists.map((l) => l.color));
    const colorOrder: ListColor[] = ['green', 'blue', 'amber', 'pink'];
    const color = colorOrder.find((c) => !usedColors.has(c)) ?? 'green';

    try {
      const res = await fetch('/api/task-lists', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, color, sort_order: lists.length }),
      });
      const data = await res.json();
      if (data.list) onListsChange([...lists, data.list]);
    } catch {
      // silent fail
    }
  }

  // ── Drag reorder within a list ───────────────────────────────

  function onDragStart(task: Task) {
    if (!canEdit) return;
    dragState.current = { id: task.id, listId: task.list_id };
  }

  async function onDropOver(target: Task) {
    if (!canEdit || !dragState.current) return;
    if (dragState.current.id === target.id) return;
    if (dragState.current.listId !== target.list_id) return; // only same-list reorder

    const listTasks = tasks.filter((t) => t.list_id === target.list_id);
    const draggedIdx = listTasks.findIndex((t) => t.id === dragState.current!.id);
    const targetIdx = listTasks.findIndex((t) => t.id === target.id);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const reordered = [...listTasks];
    const [moved] = reordered.splice(draggedIdx, 1);
    reordered.splice(targetIdx, 0, moved);

    // Rewrite sort_order for the affected list
    const newSort = new Map(reordered.map((t, i) => [t.id, i]));
    const optimistic = tasks.map((t) =>
      newSort.has(t.id) ? { ...t, sort_order: newSort.get(t.id)! } : t,
    );
    onTasksChange(optimistic);

    dragState.current = null;

    // Persist — fire-and-forget, one PATCH per moved item
    for (const [id, sort_order] of newSort) {
      fetch('/api/tasks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, sort_order }),
      }).catch(() => {});
    }
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-3.5">
      {grouped.map(({ list, tasks: items }) => {
        const color = list ? LIST_COLOR_HEX[list.color] : '#ff9ad6';
        const name = list?.name ?? 'Unlisted';
        const listKey = list?.id ?? 'unlisted';
        const open = items.filter((t) => !t.done).length;
        const total = items.length;
        const pct = total ? ((total - open) / total) * 100 : 0;

        return (
          <div key={listKey}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              <span className="font-semibold text-[12px]">{name}</span>
              <span className="text-inkDim font-mono text-[10px]">{open}/{total}</span>
              <div className="flex-1 h-[3px] bg-panelHi rounded-sm overflow-hidden ml-2">
                <div className="h-full" style={{ width: `${pct}%`, background: color, opacity: 0.7 }} />
              </div>
              {canEdit && list && (
                <button
                  type="button"
                  onClick={() => setAddingToList(addingToList === listKey ? null : listKey)}
                  className="font-mono text-[10px] text-inkDim hover:text-ink transition-colors"
                  aria-label={`Add task to ${name}`}
                >
                  {addingToList === listKey ? '×' : '+'}
                </button>
              )}
            </div>

            {addingToList === listKey && (
              <form
                onSubmit={(e) => { e.preventDefault(); addTask(list?.id ?? null, name); }}
                className="mb-1"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => !draft.trim() && setAddingToList(null)}
                  placeholder="New task…"
                  className="w-full bg-panelHi border border-rule rounded px-2 py-1 text-[12px] outline-none focus:border-inkDim"
                />
              </form>
            )}

            {items.map((t) => {
              const due = dueDisplay(t.due_at);
              const isOverdue = due.tone === 'overdue' && !t.done;
              return (
                <div
                  key={t.id}
                  draggable={canEdit && !t.id.startsWith('temp-')}
                  onDragStart={() => onDragStart(t)}
                  onDragOver={(e) => { if (dragState.current && dragState.current.id !== t.id) e.preventDefault(); }}
                  onDrop={() => onDropOver(t)}
                  className="group grid gap-2 py-[3px] items-start"
                  style={{
                    gridTemplateColumns: '16px 1fr auto',
                    opacity: t.done ? 0.4 : 1,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    disabled={!canEdit}
                    aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
                    className="w-[14px] h-[14px] rounded mt-[2px] flex items-center justify-center text-[10px] text-bg transition-all shrink-0"
                    style={{
                      border: `1.5px solid ${t.done ? color : '#8a8f9c'}`,
                      background: t.done ? color : 'transparent',
                      cursor: canEdit ? 'pointer' : 'default',
                    }}
                  >
                    {t.done ? '✓' : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => canEdit && setEditingTask(t)}
                    className="text-left min-w-0 cursor-pointer disabled:cursor-default"
                    disabled={!canEdit}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[12px] truncate"
                        style={{
                          color: t.done ? '#8a8f9c' : isOverdue ? '#ff8a7a' : '#e6e8ed',
                          textDecoration: t.done || isOverdue ? 'line-through' : 'none',
                        }}
                      >
                        {t.title}
                      </span>
                      {t.recurrence && (
                        <span className="text-[9px] text-inkDim font-mono shrink-0" title="Repeats">↻</span>
                      )}
                    </div>
                  </button>
                  <span
                    className="font-mono text-[10px] whitespace-nowrap"
                    style={{ color: t.priority === 'H' && !t.done ? '#ff8a7a' : dueChipColor(due.tone) }}
                  >
                    {due.label}
                  </span>
                </div>
              );
            })}

            {items.length === 0 && (
              <div className="text-inkDim text-[11px] py-1 pl-4 italic">No tasks</div>
            )}
          </div>
        );
      })}

      {/* Add-list affordance */}
      {canEdit && (
        <div className="pt-2 border-t border-rule">
          {addingList ? (
            <form onSubmit={(e) => { e.preventDefault(); createList(); }}>
              <input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onBlur={() => { if (!newListName.trim()) setAddingList(false); }}
                placeholder="New list name…"
                className="w-full bg-panelHi border border-rule rounded px-2 py-1 text-[12px] outline-none focus:border-inkDim"
              />
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setAddingList(true)}
              className="font-mono text-[10px] text-inkDim hover:text-ink tracking-label transition-colors"
            >
              + NEW LIST
            </button>
          )}
        </div>
      )}

      {/* Editor modal */}
      {editingTask && canEdit && (
        <TaskEditor
          task={editingTask}
          lists={lists}
          onSave={async (patch) => { await patchTask(editingTask.id, patch); }}
          onDelete={async (mode) => { await deleteTask(editingTask.id, mode); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}
