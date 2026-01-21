import { useEffect, useRef, useState, type ChangeEvent } from "react";
import api from "@/lib/api";
import { useWorkspaceStore } from "@/stores/workspaces";
import { useAuthStore } from "@/stores/auth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { setIssueBreadcrumb, setKbBreadcrumb } from "@/lib/breadcrumbs";

const roles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

type Member = {
  id: string;
  role: (typeof roles)[number];
  user: { id: string; name: string; email: string; avatarUrl?: string | null; contact?: string | null };
};

type MemberOverview = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
    contact?: string | null;
  };
  stats: {
    issuesCreated: number;
    issuesAssigned: number;
    kbWorkedOn: number;
  };
  recent: {
    issuesCreated: { _id: string; ticketId?: string; title: string; status: string; priority: string }[];
    issuesAssigned: { _id: string; ticketId?: string; title: string; status: string; priority: string }[];
    kbWorkedOn: { _id: string; kbId?: string; title: string; updatedAt?: string }[];
  };
};

type ActivityItem = {
  id: string;
  label: string;
  title: string;
  href: string;
  onSelect?: () => void;
};

type ActivitySectionProps = {
  title: string;
  emptyLabel: string;
  items: ActivityItem[];
};

const ActivitySection = ({ title, emptyLabel, items }: ActivitySectionProps) => (
  <div className="rounded-md border border-border bg-surface p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
      {title}
    </p>
    <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
      {items.length === 0 ? (
        <p className="text-xs text-foreground-muted">{emptyLabel}</p>
      ) : (
        items.map((item) => (
          <Link
            key={item.id}
            to={item.href}
            onClick={item.onSelect}
            className="block rounded-md border border-border px-3 py-2 text-sm hover:border-accent hover:text-foreground"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground-muted">
              {item.label}
            </p>
            <p className="text-sm font-medium text-foreground">{item.title}</p>
          </Link>
        ))
      )}
    </div>
  </div>
);

export default function SettingsPage() {
  const currentWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const workspaces = useWorkspaceStore((state) => state.workspaces);
  const currentWorkspace = workspaces.find((item) => item.id === currentWorkspaceId);
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [contactValue, setContactValue] = useState(user?.contact ?? "");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberOverview | null>(null);
  const [isMemberOpen, setIsMemberOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

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

  useEffect(() => {
    setProfileName(user?.name ?? "");
    setAvatarPreview(user?.avatarUrl ?? null);
    setContactValue(user?.contact ?? "");
  }, [user?.name, user?.avatarUrl, user?.contact]);

  const handleAvatarSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    const trimmedName = profileName.trim();
    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      await updateProfile({
        name: trimmedName,
        avatarUrl: avatarPreview,
        contact: contactValue.trim() || null
      });
      toast.success("Profile updated");
    } catch {
      toast.error("Unable to update profile");
    }
  };

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

  const openMemberDetails = async (memberId: string) => {
    if (!currentWorkspaceId) return;
    setMemberLoading(true);
    setIsMemberOpen(true);
    try {
      const res = await api.get(
        `/api/workspaces/${currentWorkspaceId}/members/${memberId}/overview`
      );
      setSelectedMember(res.data as MemberOverview);
    } catch {
      toast.error("Unable to load member details");
      setIsMemberOpen(false);
    } finally {
      setMemberLoading(false);
    }
  };

  const closeMemberDialog = () => setIsMemberOpen(false);

  const buildIssueItem = (
    issue: MemberOverview["recent"]["issuesCreated"][number]
  ): ActivityItem => ({
    id: issue._id,
    label: issue.ticketId ?? "ISSUE",
    title: issue.title,
    href: `/app/issues/${issue._id}`,
    onSelect: () => {
      setIssueBreadcrumb(issue._id, issue.ticketId);
      closeMemberDialog();
    }
  });

  const buildKbItem = (
    kb: MemberOverview["recent"]["kbWorkedOn"][number]
  ): ActivityItem => ({
    id: kb._id,
    label: kb.kbId ?? "KB",
    title: kb.title,
    href: `/app/kb?articleId=${kb._id}`,
    onSelect: () => {
      setKbBreadcrumb(kb._id, kb.kbId ?? kb.title ?? "Article");
      closeMemberDialog();
    }
  });

  const kbItems = selectedMember ? selectedMember.recent.kbWorkedOn.map(buildKbItem) : [];
  const createdItems = selectedMember
    ? selectedMember.recent.issuesCreated.map(buildIssueItem)
    : [];
  const assignedItems = selectedMember
    ? selectedMember.recent.issuesAssigned.map(buildIssueItem)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Workspace settings</h1>
        <p className="mt-2 text-sm text-foreground-muted">
          Manage members and invite new teammates to {currentWorkspace?.name}.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-border bg-muted px-4 py-3 text-sm text-accent">
          {error}
        </div>
      ) : null}

      <div className="rounded-md border border-border bg-surface p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Account</h2>
            <p className="mt-1 text-sm text-foreground-muted">
              Update your display name and profile photo.
            </p>
          </div>
          <Button onClick={handleProfileSave} disabled={!user}>
            Save profile
          </Button>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-4">
            <Avatar
              size="md"
              name={user?.name ?? "User"}
              email={user?.email}
              src={avatarPreview}
            />
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarSelect}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!user}
                >
                  Upload photo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAvatarPreview(null)}
                  disabled={!user || !avatarPreview}
                >
                  Remove
                </Button>
              </div>
              <p className="text-xs text-foreground-muted">
                JPG, PNG, or GIF up to 2MB.
              </p>
            </div>
          </div>
          <div className="min-w-[240px] flex-1 space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-name">
              Name
            </label>
            <Input
              id="profile-name"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              disabled={!user}
            />
            <label className="text-sm font-medium text-foreground" htmlFor="profile-contact">
              Contact
            </label>
            <Input
              id="profile-contact"
              value={contactValue}
              onChange={(event) => setContactValue(event.target.value)}
              disabled={!user}
              placeholder="Phone, Slack, or preferred channel"
            />
            <label className="text-sm font-medium text-foreground" htmlFor="profile-email">
              Email
            </label>
            <Input id="profile-email" value={user?.email ?? ""} disabled />
          </div>
        </div>
      </div>

      {!currentWorkspaceId ? (
        <div className="rounded-md border border-border bg-surface p-6">
          <h2 className="text-lg font-semibold">Select a workspace</h2>
          <p className="mt-2 text-sm text-foreground-muted">
            Choose a workspace to manage members and invites.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Invite link</h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  Share this code with teammates to join the workspace.
                </p>
              </div>
              <Button type="button" onClick={handleInvite} disabled={!canInvite}>
                Generate invite
              </Button>
            </div>
            {!canInvite ? (
              <p className="mt-2 text-xs text-foreground-muted">
                Only owners or admins can generate invites.
              </p>
            ) : null}
            {inviteCode ? (
              <div className="mt-4 rounded-md border border-border bg-muted px-4 py-3 text-sm">
                <p className="font-medium text-foreground">Code: {inviteCode}</p>
                {inviteLink ? (
                  <p className="mt-1 text-xs text-foreground-muted">{inviteLink}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="rounded-md border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Members</h2>
            {!canManageMembers ? (
              <p className="mt-1 text-xs text-foreground-muted">
                Only owners can change member roles.
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              {isLoading ? (
                <p className="text-sm text-foreground-muted">Loading...</p>
              ) : null}
              {members.length === 0 && !isLoading ? (
                <p className="text-sm text-foreground-muted">No members found.</p>
              ) : null}
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <button
                    type="button"
                    className="flex min-w-[220px] items-center gap-3 text-left"
                    onClick={() => openMemberDetails(member.id)}
                  >
                    <Avatar
                      size="sm"
                      name={member.user.name}
                      email={member.user.email}
                      src={member.user.avatarUrl ?? null}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.user.name}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {member.user.email}
                      </p>
                    </div>
                  </button>
                  <select
                    className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
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
        </>
      )}
      <Dialog
        open={isMemberOpen}
        onOpenChange={(open) => {
          setIsMemberOpen(open);
          if (!open) {
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="w-full max-w-5xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Member details</DialogTitle>
          </DialogHeader>
          {memberLoading || !selectedMember ? (
            <p className="text-sm text-foreground-muted">Loading...</p>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-6 rounded-md border border-border bg-muted px-5 py-4">
                <div className="flex items-center gap-3">
                  <Avatar
                    size="md"
                    name={selectedMember.user.name}
                    email={selectedMember.user.email}
                    src={selectedMember.user.avatarUrl ?? null}
                  />
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {selectedMember.user.name}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {selectedMember.user.email}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      {selectedMember.user.contact || "No contact on file"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-6 text-xs text-foreground-muted">
                  <div className="rounded-md border border-border bg-surface px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      KBs worked on
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedMember.stats.kbWorkedOn}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-surface px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Issues created
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedMember.stats.issuesCreated}
                    </p>
                  </div>
                  <div className="rounded-md border border-border bg-surface px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-foreground-muted">
                      Issues assigned
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {selectedMember.stats.issuesAssigned}
                    </p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <ActivitySection
                  title="KBs worked on"
                  emptyLabel="No KB activity yet."
                  items={kbItems}
                />
                <ActivitySection
                  title="Issues created"
                  emptyLabel="No issues created yet."
                  items={createdItems}
                />
                <ActivitySection
                  title="Issues assigned"
                  emptyLabel="No assignments yet."
                  items={assignedItems}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

