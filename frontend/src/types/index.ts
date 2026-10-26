export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';

export interface User {
  id: string;
  displayName: string;
  email: string;
}

export interface Task {
  id: string;
  boardId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  dueDate?: string;
  assigneeName?: string;
}

export interface ActionCard {
  id: string;
  toolName: string;
  reason: string;
  status: string;
  taskId?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  action?: ActionCard;
}