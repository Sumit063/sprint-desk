import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";

const roles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

type Member = {
  id: string;
  role: (typeof roles)[number];
  user: { id: string; name: string; email: string };
};

export default function SettingsPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspace = workspaces.find((item) => item.id === currentWorkspaceId);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const canInvite = currentWorkspace?.role === "OWNER" || currentWorkspace?.role === "ADMIN";
  const canManageMembers = currentWorkspace?.role === "OWNER";

  const loadMembers = async () => {
    if (!currentWorkspaceId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get(`/api/workspaces/${currentWorkspaceId}/members`);
      setMembers(res.data.members ?? []);
    } catch {
      setError("Unable to load members");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [currentWorkspaceId]);

  const handleInvite = async () => {
    if (!currentWorkspaceId) return;
    setError(null);
    try {
      const res = await api.post(`/api/workspaces/${currentWorkspaceId}/invite`);
      setInviteCode(res.data.inviteCode ?? null);
      setInviteLink(res.data.inviteLink ?? null);
    } catch {
      setError("Unable to create invite");
    }
  };

  const handleRoleChange = async (memberId: string, role: Member["role"]) => {
    if (!currentWorkspaceId) return;
    setError(null);
    try {
      await api.patch(`/api/workspaces/${currentWorkspaceId}/members/${memberId}`, {
        role
      });
      await loadMembers();
    } catch {
      setError("Unable to update role");
    }
  };

  if (!currentWorkspaceId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Select a workspace</h2>
        <p className="mt-2 text-sm text-slate-600">
          Choose a workspace to manage members and invites.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace settings</h1>
        <p className="mt-2 text-sm text-slate-600">
          Manage members and invite new teammates to {currentWorkspace?.name}.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Invite link</h2>
            <p className="mt-1 text-sm text-slate-600">
              Share this code with teammates to join the workspace.
            </p>
          </div>
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={handleInvite}
            disabled={!canInvite}
          >
            Generate invite
          </button>
        </div>
        {!canInvite ? (
          <p className="mt-2 text-xs text-slate-500">
            Only owners or admins can generate invites.
          </p>
        ) : null}
        {inviteCode ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-medium text-slate-700">Code: {inviteCode}</p>
            {inviteLink ? (
              <p className="mt-1 text-xs text-slate-500">{inviteLink}</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Members</h2>
        {!canManageMembers ? (
          <p className="mt-1 text-xs text-slate-500">
            Only owners can change member roles.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {members.length === 0 && !isLoading ? (
            <p className="text-sm text-slate-500">No members found.</p>
          ) : null}
          {members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {member.user.name}
                </p>
                <p className="text-xs text-slate-500">{member.user.email}</p>
              </div>
              <select
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                value={member.role}
                onChange={(event) =>
                  handleRoleChange(member.id, event.target.value as Member["role"])
                }
                disabled={!canManageMembers}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
