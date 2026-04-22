'use client';

import { useState, useTransition } from 'react';
import type { Task } from '@/types';

const LIST_COLORS: Record<string, string> = {
  Work: '#a7f3b4',
  Home: '#7db6ff',
  'Disc Golf': '#ffd27a',
  Inbox: '#ff9ad6',
};

function colorFor(listName: string): string {
  return LIST_COLORS[listName] ?? '#ff9ad6';
}

export function Tasks({
  tasks,
  canEdit,
  onChange,
}: {
  tasks: Task[];
  canEdit: boolean;
  onChange: (t: Task[]) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [addingList, setAddingList] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  // Group by list_name, preserving first-seen order
  const grouped: { name: string; tasks: Task[] }[] = [];
  for (const t of tasks) {
    let g = grouped.find((x) => x.name === t.list_name);
    if (!g) {
      g = { name: t.list_name, tasks: [] };
      grouped.push(g);
    }
    g.tasks.push(t);
  }

  async function toggle(task: Task) {
    if (!canEdit) return;
    // Optimistic update
    const optimistic = tasks.map((t) =>
      t.id === task.id ? { ...t, done: !t.done } : t,
    );
    onChange(optimistic);

    startTransition(async () => {
      try {
        const res = await fetch('/api/tasks', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: task.id, done: !task.done }),
        });
        if (!res.ok) throw new Error('Update failed');
      } catch {
        // Roll back on failure
        onChange(tasks);
      }
    });
  }

  async function addTask(listName: string) {
    const title = draft.trim();
    if (!title || !canEdit) return;
    setDraft('');
    setAddingList(null);

    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      list_name: listName,
      title,
      due: null,
      due_at: null,
      priority: 'M',
      done: false,
      user_id: 'me',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onChange([...tasks, optimistic]);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ list_name: listName, title, priority: 'M' }),
      });
      const data = await res.json();
      if (data.task) {
        onChange([...tasks.filter((t) => t.id !== tempId), data.task]);
      }
    } catch {
      onChange(tasks.filter((t) => t.id !== tempId));
    }
  }

  return (
    <div className="flex flex-col gap-3.5">
      {grouped.map((list) => {
        const open = list.tasks.filter((t) => !t.done).length;
        const total = list.tasks.length;
        const pct = total ? ((total - open) / total) * 100 : 0;
        const color = colorFor(list.name);

        return (
          <div key={list.name}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span className="font-semibold text-[12px]">{list.name}</span>
              <span className="text-inkDim font-mono text-[10px]">
                {open}/{total}
              </span>
              <div className="flex-1 h-[3px] bg-panelHi rounded-sm overflow-hidden ml-2">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
                />
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() =>
                    setAddingList(addingList === list.name ? null : list.name)
                  }
                  className="font-mono text-[10px] text-inkDim hover:text-ink transition-colors"
                  aria-label={`Add task to ${list.name}`}
                >
                  {addingList === list.name ? '×' : '+'}
                </button>
              )}
            </div>

            {addingList === list.name && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addTask(list.name);
                }}
                className="mb-1"
              >
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => !draft.trim() && setAddingList(null)}
                  placeholder="New task…"
                  className="w-full bg-panelHi border border-rule rounded px-2 py-1 text-[12px] outline-none focus:border-inkDim"
                />
              </form>
            )}

            {list.tasks.map((t) => (
              <div
                key={t.id}
                className="grid gap-2 py-[3px]"
                style={{
                  gridTemplateColumns: '16px 1fr auto',
                  opacity: t.done ? 0.4 : 1,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  disabled={!canEdit || pending}
                  aria-label={t.done ? 'Mark incomplete' : 'Mark complete'}
                  className="w-[14px] h-[14px] rounded mt-[2px] flex items-center justify-center text-[10px] text-bg transition-all"
                  style={{
                    border: `1.5px solid ${t.done ? color : '#8a8f9c'}`,
                    background: t.done ? color : 'transparent',
                    cursor: canEdit ? 'pointer' : 'default',
                  }}
                >
                  {t.done ? '✓' : ''}
                </button>
                <span
                  className={`text-[12px] ${
                    t.done ? 'line-through text-inkDim' : 'text-ink'
                  }`}
                >
                  {t.title}
                </span>
                <span
                  className="font-mono text-[10px]"
                  style={{ color: t.priority === 'H' ? '#ff8a7a' : '#8a8f9c' }}
                >
                  {t.due ?? '—'}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
