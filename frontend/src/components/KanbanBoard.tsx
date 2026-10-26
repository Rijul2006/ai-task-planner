'use client';

import React from 'react';
import { Task, TaskStatus } from '../types';
import { TaskCard } from './TaskCard';

const COLUMNS: { key: TaskStatus; label: string }[] = [
  { key: 'TODO', label: 'To Do' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'DONE', label: 'Completed' },
];

export const KanbanBoard: React.FC<{ tasks: Task[]; onSelectTask?: (task: Task) => void }> = ({
  tasks,
  onSelectTask,
}) => {
  return (
    <div className="flex-1 p-6 overflow-x-auto flex gap-5">
      {COLUMNS.map((col) => {
        const colTasks = tasks.filter((t) => t.status === col.key);
        return (
          <div key={col.key} className="w-80 bg-[#0c111d]/70 border border-slate-800/80 rounded-2xl p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3.5 px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{col.label}</span>
              <span className="text-xs font-semibold bg-slate-800/90 text-slate-300 border border-slate-700/50 px-2 py-0.5 rounded-full">
                {colTasks.length}
              </span>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {colTasks.length === 0 ? (
                <div className="p-6 border border-dashed border-slate-800/80 rounded-xl text-center text-[11px] text-slate-600">
                  No tasks in this column
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={onSelectTask ? () => onSelectTask(task) : undefined} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};