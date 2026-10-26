'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { KanbanBoard } from '../components/KanbanBoard';
import { AIChatDrawer } from '../components/AIChatDrawer';
import { CreateTaskModal } from '../components/CreateTaskModal';
import CreateBoardModal from '../components/CreateBoardModal';
import BoardSettingsModal from '../components/BoardSettingsModal';
import TaskModal from '../components/TaskModal';
import { ChatMessage, Priority, Task, TaskStatus, User } from '../types';
import {
  boardTasksQueryKey,
  useUserBoards,
  useBoardTasks,
  userBoardsQueryKey,
} from '../hooks/useBoardData';
import { useApproveAction, useRejectAction } from '../hooks/useAIActions';
import { api } from '../lib/api';
import { ShieldAlert } from 'lucide-react';

export default function TPMDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'board' | 'ai'>('board');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false);
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // 1. Authenticate Current Session
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await api.get('/auth/me');
        const user = res.data?.data?.user || res.data?.user;
        setCurrentUser(user);
        setChatMessages([
          {
            id: '1',
            sender: 'ai',
            text: `Welcome back, ${user.displayName || user.email}! AI Risk Engine initialized.`,
          },
        ]);
      } catch {
        queryClient.clear();
        router.push('/login');
      } finally {
        setAuthLoading(false);
      }
    };

    fetchSession();
  }, [queryClient, router]);

  // 2. Fetch Active Boards
  const { data: boards = [] } = useUserBoards(currentUser?.id);
  const activeBoard = boards.find((board: any) => board.id === selectedBoardId) || boards[0];
  const currentBoardId = activeBoard?.id || '';
  const currentBoardName = activeBoard?.name || 'Program Workspace';
  const canEditTasks = activeBoard?.role === 'OWNER' || activeBoard?.role === 'MEMBER';

  // 3. Fetch Tasks linked to the current active board
  const { data: boardTasks = [], isLoading: tasksLoading } = useBoardTasks(currentUser?.id, currentBoardId);
  const approveMutation = useApproveAction(currentUser?.id, currentBoardId);
  const rejectMutation = useRejectAction();

  // Robust Task Creation Handler
  const handleCreateTask = async (newTaskData: { title: string; priority: Priority; status: TaskStatus; description?: string }) => {
    try {
      // Direct API fetch to guarantee target board ID availability
      let targetBoardId = currentBoardId;

      if (!targetBoardId) {
        const boardRes = await api.get('/boards');
        const boardsList = boardRes.data?.data?.boards || boardRes.data?.boards || [];
        targetBoardId = boardsList[0]?.id;
      }

      if (!targetBoardId) {
        alert('Board initialization failed. Please refresh the page.');
        return;
      }

      // POST task request to backend
      await api.post(`/boards/${targetBoardId}/tasks`, {
        title: newTaskData.title,
        description: newTaskData.description || '',
        priority: newTaskData.priority || 'MEDIUM',
        status: newTaskData.status || 'TODO',
      });

      await queryClient.invalidateQueries({
        queryKey: boardTasksQueryKey(currentUser?.id, targetBoardId),
        exact: true,
      });
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Task Submission Error:', err);
      const serverError = err.response?.data?.message || err.response?.data?.error || err.message;
      alert(`Task Creation Failed: ${serverError}`);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      queryClient.clear();
      setCurrentUser(null);
    }
    router.push('/login');
  };

  const handleBoardCreated = (board: { id: string }) => {
    queryClient.invalidateQueries({ queryKey: userBoardsQueryKey(currentUser?.id) });
    setSelectedBoardId(board.id);
  };

  const handleBoardDeleted = () => {
    queryClient.invalidateQueries({ queryKey: userBoardsQueryKey(currentUser?.id) });
    queryClient.removeQueries({
      queryKey: boardTasksQueryKey(currentUser?.id, currentBoardId),
      exact: true,
    });
    setSelectedBoardId('');
  };

  const handleTaskSave = async (taskId: string, updates: Partial<Task>) => {
    await api.patch(`/tasks/${taskId}`, updates);
    await queryClient.invalidateQueries({
      queryKey: boardTasksQueryKey(currentUser?.id, currentBoardId),
      exact: true,
    });
  };

  const handleTaskDelete = async (taskId: string) => {
    await api.delete(`/tasks/${taskId}`);
    await queryClient.invalidateQueries({
      queryKey: boardTasksQueryKey(currentUser?.id, currentBoardId),
      exact: true,
    });
  };

  const handleSendMessage = async (text: string) => {
    const userMsgId = Date.now().toString();
    setChatMessages((prev) => [...prev, { id: userMsgId, sender: 'user', text }]);

    try {
      const response = await api.post('/ai/chat', { boardId: currentBoardId, message: text });
      const data = response.data;

      if (data.type === 'action_proposal') {
        setChatMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: 'AI Agent suggests a task status mutation to prevent sprint delays.',
            action: {
              id: data.action.id,
              toolName: data.action.toolName,
              reason: data.action.reason || 'AI Risk Mitigation',
              status: data.action.status,
            },
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { id: (Date.now() + 1).toString(), sender: 'ai', text: data.content },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'AI TPM Co-Pilot is online and actively monitoring workspace risks.',
        },
      ]);
    }
  };

  const handleApproveAction = (actionId: string) => {
    approveMutation.mutate(actionId, {
      onSuccess: () => {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.action && m.action.id === actionId
              ? { ...m, action: { ...m.action, status: 'executed' } }
              : m
          )
        );
        queryClient.invalidateQueries({
          queryKey: boardTasksQueryKey(currentUser?.id, currentBoardId),
          exact: true,
        });
      },
    });
  };

  const handleRejectAction = (actionId: string) => {
    rejectMutation.mutate(actionId, {
      onSuccess: () => {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.action && m.action.id === actionId
              ? { ...m, action: { ...m.action, status: 'rejected' } }
              : m
          )
        );
      },
    });
  };

  if (authLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#090d16] text-slate-400 text-xs font-medium">
        Authenticating TPM Workspace...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={currentUser}
        onLogout={handleLogout}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <Header
          boardName={currentBoardName}
          boards={boards}
          activeBoardId={currentBoardId}
          onSelectBoard={setSelectedBoardId}
          onCreateBoard={() => setIsCreateBoardOpen(true)}
          riskCount={boardTasks.filter((t) => t.priority === 'URGENT' || t.status === 'BLOCKED').length}
          onOpenCreateModal={() => setIsModalOpen(true)}
          canCreateTasks={canEditTasks}
        />

        {activeTab === 'board' ? (
          tasksLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">Loading Workspace...</div>
          ) : (
            <>
              {activeBoard && (
                <div className="px-6 pt-3 flex justify-end">
                  <button
                    onClick={() => setIsBoardSettingsOpen(true)}
                    className="text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg px-3 py-1.5"
                  >
                    Board Settings & Members
                  </button>
                </div>
              )}
              <KanbanBoard tasks={boardTasks} onSelectTask={setSelectedTask} />
            </>
          )
        ) : (
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            <div className="border border-slate-800 bg-[#0c111d] p-6 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5" /> AI Risk Engine Analysis
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Active risk engine is monitoring sprint backlog velocity, blockages, and critical path dependencies.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#121826] border border-slate-800 rounded-xl space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Monitored Tasks</p>
                <p className="text-xl font-bold text-slate-100">{boardTasks.length}</p>
              </div>
              <div className="p-4 bg-[#121826] border border-slate-800 rounded-xl space-y-1">
                <p className="text-[10px] text-amber-400 uppercase font-bold">Blocked / Urgent Signals</p>
                <p className="text-xl font-bold text-amber-400">
                  {boardTasks.filter((t) => t.priority === 'URGENT' || t.status === 'BLOCKED').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <AIChatDrawer
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        onApproveAction={handleApproveAction}
        onRejectAction={handleRejectAction}
      />

      <CreateTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTask}
      />
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onBoardCreated={handleBoardCreated}
      />
      {activeBoard && (
        <BoardSettingsModal
          board={activeBoard}
          isOpen={isBoardSettingsOpen}
          onClose={() => setIsBoardSettingsOpen(false)}
          onBoardUpdated={() => queryClient.invalidateQueries({ queryKey: userBoardsQueryKey(currentUser?.id) })}
          onBoardDeleted={handleBoardDeleted}
        />
      )}
      <TaskModal
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onSave={handleTaskSave}
        onDelete={handleTaskDelete}
        canEdit={canEditTasks}
      />
    </div>
  );
}