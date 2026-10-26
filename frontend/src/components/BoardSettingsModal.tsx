'react';
import { useState, useEffect } from 'react';
import {
  getBoardMembers,
  addBoardMember,
  updateBoard,
  deleteBoard,
  updateBoardMember,
  removeBoardMember,
} from '../lib/api';

interface BoardSettingsModalProps {
  board: { id: string; name: string; description?: string; role?: string } | null;
  isOpen: boolean;
  onClose: () => void;
  onBoardUpdated: () => void;
  onBoardDeleted: () => void;
}

export default function BoardSettingsModal({
  board,
  isOpen,
  onClose,
  onBoardUpdated,
  onBoardDeleted,
}: BoardSettingsModalProps) {
  const isOwner = board?.role === 'OWNER';
  const [name, setName] = useState(board?.name || '');
  const [description, setDescription] = useState(board?.description || '');
  const [members, setMembers] = useState<
    { id: string; displayName: string; email: string; role: 'OWNER' | 'MEMBER' | 'VIEWER' }[]
  >([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'MEMBER' | 'VIEWER'>('MEMBER');
  const [loading, setLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [membersError, setMembersError] = useState<string | null>(null);

  useEffect(() => {
    if (board) {
      setName(board.name || '');
      setDescription(board.description || '');
    }
  }, [board?.id, board?.name, board?.description]);

  useEffect(() => {
    if (isOpen && board?.id) {
      getBoardMembers(board.id)
        .then((res) => {
          setMembers(res.data.members || []);
          setMembersError(null);
        })
        .catch((err: any) => {
          setMembersError(err.response?.data?.message || err.message || 'Failed to load board members.');
        });
    }
  }, [isOpen, board?.id]);

  if (!isOpen || !board) return null;

  const handleUpdateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateBoard(board.id, { name, description });
      onBoardUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to update board details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    setInviteError(null);

    try {
      await addBoardMember(board.id, newEmail.trim(), newRole);
      setNewEmail('');
      const res = await getBoardMembers(board.id);
      setMembers(res.data.members || []);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to add board member');
    }
  };

  const handleMemberRoleChange = async (userId: string, role: 'MEMBER' | 'VIEWER') => {
    try {
      await updateBoardMember(board.id, userId, role);
      setMembers((current) => current.map((member) => member.id === userId ? { ...member, role } : member));
    } catch (err: any) {
      setInviteError(err.response?.data?.message || err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this person from the board?')) return;
    try {
      await removeBoardMember(board.id, userId);
      setMembers((current) => current.filter((member) => member.id !== userId));
    } catch (err: any) {
      setInviteError(err.response?.data?.message || err.message || 'Failed to remove board member.');
    }
  };

  const handleDeleteBoard = async () => {
    if (!confirm('Are you sure you want to delete this board? All associated tasks will be removed.')) return;
    setLoading(true);
    try {
      await deleteBoard(board.id);
      onBoardDeleted();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete board');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <h3 className="text-lg font-semibold">Board Settings & Members</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">✕</button>
        </div>

        {/* Board Details Section */}
        <form onSubmit={handleUpdateBoard} className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Board Name</label>
            <input
              type="text"
              disabled={!isOwner}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
            <textarea
              rows={2}
              disabled={!isOwner}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {isOwner && (
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={handleDeleteBoard}
                className="rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 px-3 py-1.5 text-xs font-medium"
              >
                Delete Workspace
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-medium"
              >
                Save Details
              </button>
            </div>
          )}
        </form>

        <hr className="border-slate-800 my-4" />

        {/* Members Management Section */}
        <div>
          <h4 className="text-sm font-semibold mb-3">Workspace Members</h4>
          {membersError && (
            <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
              {membersError}
            </div>
          )}
          {inviteError && (
            <div className="mb-3 rounded-lg bg-red-500/10 border border-red-500/20 p-2 text-xs text-red-400">
              {inviteError}
            </div>
          )}

          {isOwner && (
            <form onSubmit={handleAddMember} className="flex gap-2 mb-4">
              <input
                type="email"
                placeholder="User email to invite..."
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              />
              <select
                value={newRole}
                onChange={(e: any) => setNewRole(e.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 text-xs font-medium"
              >
                Invite
              </button>
            </form>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/60 border border-slate-800 text-xs">
                <div>
                  <div className="font-medium text-slate-200">{m.displayName || m.email}</div>
                  <div className="text-slate-400 text-[10px]">{m.email}</div>
                </div>
                {isOwner && m.role !== 'OWNER' ? (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Role for ${m.email}`}
                      value={m.role}
                      onChange={(event) => handleMemberRoleChange(m.id, event.target.value as 'MEMBER' | 'VIEWER')}
                      className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] text-slate-300"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.id)}
                      className="text-rose-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="rounded bg-slate-700/80 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {m.role}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}