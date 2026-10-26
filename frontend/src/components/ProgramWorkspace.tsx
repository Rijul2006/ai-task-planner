'react';
import { useState, useEffect } from 'react';
import { getBoards, getBoardTasks, createTask, updateTask, deleteTask } from '../lib/api';
import TaskModal from './TaskModal';
import BoardSettingsModal from './BoardSettingsModal';
import CreateBoardModal from './CreateBoardModal';

interface Board {
  id: string;
  name: string;
  description?: string;
  role?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
}

export default function ProgramWorkspace() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);

  // New task form state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [newTaskStatus, setNewTaskStatus] = useState('TODO');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const canEditTasks = activeBoard?.role === 'OWNER' || activeBoard?.role === 'MEMBER';

  // Fetch boards on load
  const loadBoards = async () => {
    try {
      const res = await getBoards();
      const loadedBoards = res.data?.boards || [];
      setBoards(loadedBoards);
      if (loadedBoards.length > 0 && !activeBoard) {
        setActiveBoard(loadedBoards[0]);
      }
    } catch (err) {
      console.error('Failed to load boards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoards();
  }, []);

  // Fetch tasks when active board changes
  useEffect(() => {
    if (activeBoard?.id) {
      getBoardTasks(activeBoard.id)
        .then((res) => setTasks(res.data?.tasks || []))
        .catch((err) => console.error('Failed to load tasks:', err));
    }
  }, [activeBoard?.id]);

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBoard || !newTaskTitle.trim()) return;

    setIsCreatingTask(true);
    try {
      const res = await createTask(activeBoard.id, {
        title: newTaskTitle.trim(),
        description: newTaskDesc.trim(),
        priority: newTaskPriority,
        status: newTaskStatus,
      });

      const created = res.data?.task;
      if (created) {
        setTasks((prev) => [created, ...prev]);
      }
      setNewTaskTitle('');
      setNewTaskDesc('');
      setIsCreateTaskOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskSaved = async (taskId: string, updates: Partial<Task>) => {
    const res = await updateTask(taskId, updates);
    const updated = res.data?.task;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
  };

  const handleTaskDeleted = async (taskId: string) => {
    await deleteTask(taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleBoardCreated = (newBoard: Board) => {
    setBoards((prev) => [newBoard, ...prev]);
    setActiveBoard(newBoard);
  };

  const columns = [
    { key: 'TODO', title: 'To Do', color: 'border-slate-600' },
    { key: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500' },
    { key: 'BLOCKED', title: 'Blocked', color: 'border-amber-500' },
    { key: 'DONE', title: 'Done', color: 'border-emerald-500' },
  ];

  if (loading) {
    return <div className="p-8 text-slate-400 text-center">Loading Kanban Workspace...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-slate-800 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={activeBoard?.id || ''}
            onChange={(e) => {
              const selected = boards.find((b) => b.id === e.target.value);
              if (selected) setActiveBoard(selected);
            }}
            className="bg-slate-900 border border-slate-800 text-sm font-semibold px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
          >
            {boards.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.role})
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCreateBoardOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            + New Board
          </button>
        </div>

        {activeBoard && (
          <div className="flex items-center gap-2">
            {canEditTasks && (
              <button
                onClick={() => setIsCreateTaskOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium transition-colors shadow-sm"
              >
                + Create Task
              </button>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-3 py-2 rounded-lg text-xs font-medium"
            >
              ⚙ Board Settings & Members
            </button>
          </div>
        )}
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-4 flex flex-col">
              <div className={`flex items-center justify-between border-b ${col.color} pb-2 mb-3 border-l-2 pl-2`}>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{col.title}</h2>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] text-slate-400 font-bold">{colTasks.length}</span>
              </div>

              <div className="space-y-3 flex-1 overflow-y-auto">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      setSelectedTask(task);
                      setIsTaskModalOpen(true);
                    }}
                    className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-lg p-3 cursor-pointer shadow-sm transition-all"
                  >
                    <div className="text-sm font-medium text-slate-100 mb-1">{task.title}</div>
                    {task.description && (
                      <div className="text-xs text-slate-400 line-clamp-2 mb-2">{task.description}</div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-700/60 font-medium">{task.priority}</span>
                      {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Task Modal */}
      {isCreateTaskOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h3 className="text-lg font-semibold">Create Task</h3>
              <button onClick={() => setIsCreateTaskOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>

            <form onSubmit={handleCreateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Task title..."
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Optional details..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Initial Column</label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-medium transition-colors"
                >
                  {isCreatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onBoardCreated={handleBoardCreated}
      />

      <BoardSettingsModal
        board={activeBoard}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onBoardUpdated={loadBoards}
        onBoardDeleted={() => {
          setActiveBoard(null);
          loadBoards();
        }}
      />

      <TaskModal
        task={selectedTask}
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleTaskSaved}
        onDelete={handleTaskDeleted}
        canEdit={canEditTasks}
      />
    </div>
  );
}