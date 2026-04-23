'use client';

import { useEffect, useRef, useState } from 'react';
import type { Task, TaskList, Priority, Recurrence } from '@/types';
import { describeRecurrence } from '@/lib/task-utils';

type Props = {
  task: Task;
  lists: TaskList[];
  onSave: (patch: Partial<Task>) => Promise<void>;
  onDelete: (mode: 'single' | 'all_future') => Promise<void>;
  onClose: () => void;
};

const WEEKDAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function TaskEditor({ task, lists, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes ?? '');
  const [dueAt, setDueAt] = useState(task.due_at ?? '');
  const [priority, setPriority] = useState<Priority>(task.priority);
  const [listId, setListId] = useState<string | null>(task.list_id);
  const [recurrence, setRecurrence] = useState<Recurrence | null>(task.recurrence);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close on click-outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Attach next tick so the click that opened us doesn't close us
    const id = setTimeout(() => document.addEventListener('mousedown', onDown), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  async function handleSave() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const listName = listId ? (lists.find(l => l.id === listId)?.name ?? task.list_name) : task.list_name;
    await onSave({
      title: trimmed,
      notes: notes.trim() || null,
      due_at: dueAt || null,
      priority,
      list_id: listId,
      list_name: listName,
      recurrence,
    });
    onClose();
  }

  async function handleDelete(mode: 'single' | 'all_future') {
    setShowDeleteMenu(false);
    await onDelete(mode);
    onClose();
  }

  const isRecurring = !!recurrence;

  return (
    <div
      className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className="ccard w-full max-w-md mt-8 sm:mt-24 shadow-2xl"
      >
        {/* Title */}
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave(); } }}
          placeholder="Task title"
          className="w-full bg-transparent border-b border-rule px-0 py-1 text-[15px] font-medium text-ink outline-none focus:border-inkDim"
        />

        {/* Quick grid: due date + priority */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div>
            <div className="clabel mb-1">Due</div>
            <input
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="w-full bg-panelHi border border-rule rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-inkDim"
            />
          </div>
          <div>
            <div className="clabel mb-1">Priority</div>
            <div className="pill-group !p-[2px]">
              {(['H', 'M', 'L'] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-active={priority === p}
                  onClick={() => setPriority(p)}
                  className="!px-3"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List */}
        {lists.length > 0 && (
          <div className="mt-4">
            <div className="clabel mb-1">List</div>
            <select
              value={listId ?? ''}
              onChange={(e) => setListId(e.target.value || null)}
              className="w-full bg-panelHi border border-rule rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-inkDim"
            >
              <option value="">— None —</option>
              {lists.map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Recurrence */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <div className="clabel">Repeats</div>
            {isRecurring && (
              <button
                type="button"
                onClick={() => setRecurrence(null)}
                className="font-mono text-[9px] text-inkDim hover:text-ink tracking-label"
              >
                CLEAR
              </button>
            )}
          </div>
          <RecurrenceEditor value={recurrence} onChange={setRecurrence} />
          {recurrence && (
            <div className="text-[11px] text-inkDim mt-1.5">
              {describeRecurrence(recurrence)}
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-4">
          <div className="clabel mb-1">Notes</div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Optional…"
            className="w-full bg-panelHi border border-rule rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-inkDim resize-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-rule">
          <div className="relative">
            <button
              type="button"
              onClick={() => isRecurring ? setShowDeleteMenu((v) => !v) : handleDelete('single')}
              className="font-mono text-[10px] text-red hover:bg-red/10 px-2 py-1 rounded tracking-label transition-colors"
            >
              DELETE
            </button>
            {showDeleteMenu && (
              <div className="absolute bottom-full left-0 mb-1 bg-panel border border-rule rounded-lg shadow-xl min-w-[220px] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleDelete('single')}
                  className="w-full text-left px-3 py-2 text-[11px] text-ink hover:bg-panelHi transition-colors"
                >
                  Delete just this one
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete('all_future')}
                  className="w-full text-left px-3 py-2 text-[11px] text-red hover:bg-panelHi transition-colors border-t border-rule"
                >
                  Delete this and stop repeating
                </button>
              </div>
            )}
          </div>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] text-inkDim hover:text-ink px-2 py-1 rounded tracking-label transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!title.trim()}
            className="font-mono text-[10px] bg-ink text-bg px-3 py-1.5 rounded font-semibold tracking-label disabled:opacity-50"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Recurrence sub-editor
// ─────────────────────────────────────────────────────────────

function RecurrenceEditor({
  value,
  onChange,
}: {
  value: Recurrence | null;
  onChange: (r: Recurrence | null) => void;
}) {
  const pattern = value?.pattern ?? 'none';

  function setPattern(p: 'none' | Recurrence['pattern']) {
    if (p === 'none') return onChange(null);
    if (p === 'daily')   return onChange({ pattern: 'daily',   interval: 1 });
    if (p === 'weekly')  return onChange({ pattern: 'weekly',  interval: 1, weekdays: [new Date().getDay()] });
    if (p === 'monthly') return onChange({ pattern: 'monthly', interval: 1, day_of_month: new Date().getDate() });
    if (p === 'yearly')  return onChange({ pattern: 'yearly',  interval: 1 });
  }

  return (
    <div>
      <select
        value={pattern}
        onChange={(e) => setPattern(e.target.value as 'none' | Recurrence['pattern'])}
        className="w-full bg-panelHi border border-rule rounded px-2 py-1.5 text-[12px] text-ink outline-none focus:border-inkDim"
      >
        <option value="none">Does not repeat</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
        <option value="monthly">Monthly</option>
        <option value="yearly">Yearly</option>
      </select>

      {value?.pattern === 'weekly' && (
        <div className="flex gap-1 mt-2">
          {WEEKDAY_NAMES.map((name, idx) => {
            const active = value.weekdays.includes(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const weekdays = active
                    ? value.weekdays.filter((d) => d !== idx)
                    : [...value.weekdays, idx].sort((a, b) => a - b);
                  onChange({ ...value, weekdays });
                }}
                className="flex-1 py-1 rounded font-mono text-[10px] tracking-label transition-colors"
                style={{
                  background: active ? '#a7f3b4' : '#1a1e26',
                  color: active ? '#0e1014' : '#8a8f9c',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}

      {value?.pattern === 'monthly' && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-inkDim">On day</span>
          <input
            type="number"
            min={1}
            max={31}
            value={value.day_of_month}
            onChange={(e) => onChange({
              ...value,
              day_of_month: Math.max(1, Math.min(31, Number(e.target.value) || 1)),
            })}
            className="w-16 bg-panelHi border border-rule rounded px-2 py-1 text-[12px] text-ink outline-none focus:border-inkDim"
          />
          <span className="text-[11px] text-inkDim">of the month</span>
        </div>
      )}
    </div>
  );
}
