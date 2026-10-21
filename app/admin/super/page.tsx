"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Crown,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Plus,
  Search,
  X,
  AlertTriangle,
  UserCog,
  Mail,
  Lock,
  User,
  School as SchoolIcon,
  Users as UsersIcon,
  Eye,
  EyeOff,
  UserCheck,
  UserMinus,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SchoolAutocomplete from "@/components/SchoolAutocomplete";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  school: string;
  is_admin: boolean;
  is_super_admin: boolean;
  created_at: string;
}

type Tab = "admins" | "students";
type ConfirmState =
  | { kind: "demote"; user: UserRow }
  | { kind: "promote"; user: UserRow }
  | { kind: "delete"; user: UserRow }
  | null;

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function SuperAdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<string | null>(null);
  const [meIsSuper, setMeIsSuper] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [admins, setAdmins] = useState<UserRow[]>([]);
  const [students, setStudents] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("admins");
  const [query, setQuery] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  /* ---------- Auth + role check ---------- */

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setMe(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

      setMeIsSuper(!!profile?.is_super_admin);
      if (profile?.is_super_admin) await load();
      setLoaded(true);
    })();
  }, [router]);

  /* ---------- Load users ---------- */

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? `HTTP ${res.status}`);
      setLoading(false);
      return;
    }
    const j = await res.json();
    setAdmins(j.admins ?? []);
    setStudents(j.students ?? []);
    setLoading(false);
  }

  /* ---------- Actions ---------- */

  async function doAction(
    action: "promote" | "demote" | "delete",
    userId: string
  ) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "Action failed");
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    try {
      await doAction(confirm.kind, confirm.user.id);

      if (confirm.kind === "delete") {
        setAdmins((a) => a.filter((x) => x.id !== confirm.user.id));
        setStudents((s) => s.filter((x) => x.id !== confirm.user.id));
      } else if (confirm.kind === "promote") {
        setStudents((s) => s.filter((x) => x.id !== confirm.user.id));
        setAdmins((a) => [{ ...confirm.user, is_admin: true }, ...a]);
      } else {
        setAdmins((a) => a.filter((x) => x.id !== confirm.user.id));
        setStudents((s) => [{ ...confirm.user, is_admin: false }, ...s]);
      }
      setConfirm(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setConfirm(null);
    }
  }

  /* ---------- Guards ---------- */

  if (!loaded) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <span className="text-sm">Checking permissions…</span>
        </div>
      </div>
    );
  }

  if (!meIsSuper) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-100 text-red-600">
          <ShieldOff className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold tracking-tight text-slate-900">
          Access denied
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          This page is restricted to super admins only.
        </p>
      </div>
    );
  }

  /* ---------- Filter ---------- */

  const list = tab === "admins" ? admins : students;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (u) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.school.toLowerCase().includes(q)
      )
    : list;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      {/* ============ Header ============ */}
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm shadow-amber-500/10">
            <Crown className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              User management
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Manage admins and students
            </p>
          </div>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:w-auto sm:py-2.5"
        >
          <Plus className="h-4 w-4" /> New admin
        </button>
      </header>

      {/* ============ Tabs + search ============ */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs (Full width on mobile) */}
        <div className="flex w-full rounded-xl border border-slate-200 bg-slate-100/60 p-1 text-sm sm:w-fit">
          <button
            onClick={() => setTab("admins")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition sm:flex-none ${
              tab === "admins"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Admins
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition ${
                tab === "admins"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-white/70 text-slate-600"
              }`}
            >
              {admins.length}
            </span>
          </button>
          <button
            onClick={() => setTab("students")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition sm:flex-none ${
              tab === "students"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            Students
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums transition ${
                tab === "students"
                  ? "bg-sky-100 text-sky-700"
                  : "bg-white/70 text-slate-600"
              }`}
            >
              {students.length}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5"
            placeholder="Search by name, email, or school…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* ============ Error banner ============ */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ============ List (Table & Mobile Cards) ============ */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="grid place-items-center py-16">
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-sky-500" />
              <span className="text-sm">Loading users…</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            isEmpty={list.length === 0}
            tab={tab}
            onAdd={() => setCreateOpen(true)}
          />
        ) : (
          <>
            {/* ---- Desktop Table ---- */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">School</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((u) => {
                    const isMe = u.id === me;
                    const isSuper = u.is_super_admin;
                    return (
                      <tr
                        key={u.id}
                        className={`transition ${
                          isMe ? "bg-amber-50/40" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">
                              {u.full_name || "—"}
                            </span>
                            {isMe && (
                              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-50 truncate px-5 py-3.5 text-slate-600">
                          {u.email}
                        </td>
                        <td className="max-w-50 truncate px-5 py-3.5 text-slate-600">
                          {u.school || "—"}
                        </td>
                        <td className="px-5 py-3.5">
                          <RoleBadge
                            isAdmin={u.is_admin}
                            isSuper={u.is_super_admin}
                          />
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            <RowActions
                              u={u}
                              isMe={isMe}
                              isSuper={isSuper}
                              tab={tab}
                              setConfirm={setConfirm}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ---- Mobile Cards ---- */}
            <div className="divide-y divide-slate-100 sm:hidden">
              {filtered.map((u) => {
                const isMe = u.id === me;
                const isSuper = u.is_super_admin;
                return (
                  <div key={u.id} className="flex flex-col gap-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-semibold text-slate-800">
                            {u.full_name || "—"}
                          </span>
                          {isMe && (
                            <span className="shrink-0 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                              You
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                          <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{u.email}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <SchoolIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span className="truncate">{u.school || "—"}</span>
                        </div>
                      </div>
                      <RoleBadge
                        isAdmin={u.is_admin}
                        isSuper={u.is_super_admin}
                      />
                    </div>
                    
                    {/* Mobile Actions Bar */}
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <RowActions
                        u={u}
                        isMe={isMe}
                        isSuper={isSuper}
                        tab={tab}
                        setConfirm={setConfirm}
                        isMobile
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ============ Create admin modal ============ */}
      {createOpen && (
        <CreateAdminModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            setTab("admins");
            load();
          }}
        />
      )}

      {/* ============ Confirm dialog ============ */}
      {confirm && (
        <ConfirmDialog
          state={confirm}
          onCancel={() => setConfirm(null)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row Actions (Shared between Table & Mobile Cards)                 */
/* ------------------------------------------------------------------ */

function RowActions({
  u,
  isMe,
  isSuper,
  tab,
  setConfirm,
  isMobile = false,
}: {
  u: UserRow;
  isMe: boolean;
  isSuper: boolean;
  tab: Tab;
  setConfirm: (c: ConfirmState) => void;
  isMobile?: boolean;
}) {
  const btnClass = `grid place-items-center rounded-lg transition active:scale-95 ${
    isMobile ? "h-10 w-10" : "h-9 w-9"
  }`;

  return (
    <>
      {tab === "students" && (
        <button
          onClick={() => setConfirm({ kind: "promote", user: u })}
          className={`${btnClass} text-slate-500 hover:bg-sky-50 hover:text-sky-600`}
          title="Promote to admin"
          aria-label="Promote to admin"
        >
          <UserCog className="h-4 w-4" />
        </button>
      )}
      {tab === "admins" && !isSuper && !isMe && (
        <button
          onClick={() => setConfirm({ kind: "demote", user: u })}
          className={`${btnClass} text-slate-500 hover:bg-amber-50 hover:text-amber-600`}
          title="Demote to student"
          aria-label="Demote to student"
        >
          <ShieldOff className="h-4 w-4" />
        </button>
      )}
      <button
        onClick={() => setConfirm({ kind: "delete", user: u })}
        disabled={isMe || isSuper}
        className={`${btnClass} text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500`}
        title={
          isSuper
            ? "Cannot delete a super admin"
            : isMe
              ? "Cannot delete yourself"
              : "Delete user"
        }
        aria-label="Delete user"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Role badge                                                        */
/* ------------------------------------------------------------------ */

function RoleBadge({
  isAdmin,
  isSuper,
}: {
  isAdmin: boolean;
  isSuper: boolean;
}) {
  if (isSuper) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
        <Crown className="h-2.5 w-2.5" /> Super Admin
      </span>
    );
  }
  if (isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
        <ShieldCheck className="h-2.5 w-2.5" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
      Student
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Confirm dialog                                                    */
/* ------------------------------------------------------------------ */

function ConfirmDialog({
  state,
  onCancel,
  onConfirm,
}: {
  state: { kind: "promote" | "demote" | "delete"; user: UserRow };
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const copy = {
    promote: {
      icon: <UserCheck className="h-6 w-6" />,
      tone: "bg-sky-100 text-sky-600",
      title: "Promote to admin?",
      desc: "This student will be able to manage the question bank and quizzes.",
      cta: "Promote",
      ctaClass:
        "bg-sky-500 hover:bg-sky-600 shadow-sm shadow-sky-500/25",
    },
    demote: {
      icon: <UserMinus className="h-6 w-6" />,
      tone: "bg-amber-100 text-amber-600",
      title: "Demote to student?",
      desc: "This admin will lose all admin privileges and become a regular student.",
      cta: "Demote",
      ctaClass:
        "bg-amber-500 hover:bg-amber-600 shadow-sm shadow-amber-500/25",
    },
    delete: {
      icon: <Trash2 className="h-6 w-6" />,
      tone: "bg-red-100 text-red-600",
      title: "Delete this user?",
      desc: "The account, quiz results, and all associated data will be permanently deleted. This can't be undone.",
      cta: "Delete",
      ctaClass:
        "bg-red-600 hover:bg-red-700 shadow-sm shadow-red-500/25",
    },
  }[state.kind];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div
            className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${copy.tone}`}
          >
            {copy.icon}
          </div>
          <h2 className="mt-4 text-lg font-bold tracking-tight text-slate-900">
            {copy.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {copy.desc}
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-left">
            <div className="truncate text-sm font-semibold text-slate-800">
              {state.user.full_name}
            </div>
            <div className="truncate text-xs text-slate-500">
              {state.user.email}
            </div>
          </div>
        </div>

        {/* Stacked on mobile */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row">
          <button
            onClick={onCancel}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] sm:py-2.5"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`inline-flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] sm:py-2.5 ${copy.ctaClass}`}
          >
            {copy.cta}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create admin modal                                                */
/* ------------------------------------------------------------------ */

function CreateAdminModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [school, setSchool] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid =
    fullName.trim().length >= 2 &&
    /^\S+@\S+\.\S+$/.test(email) &&
    password.length >= 6;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        email: email.trim(),
        password,
        full_name: fullName.trim(),
        school: school.trim(),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to create admin");
      return;
    }
    onCreated();
  }

  const inputBase =
    "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 sm:py-2.5";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-3 backdrop-blur-sm sm:p-4">
      <div className="mx-auto my-4 w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:my-8">
        {/* Header */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold tracking-tight text-slate-900">
                New admin
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Create an admin account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 px-4 py-5 sm:px-5">
          <Field
            icon={<User className="h-4 w-4" />}
            label="Full name"
            required
          >
            <input
              className={`${inputBase} pl-10`}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field icon={<Mail className="h-4 w-4" />} label="Email" required>
            <input
              type="email"
              className={`${inputBase} pl-10`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field
            icon={<SchoolIcon className="h-4 w-4" />}
            label="School"
            hint="Optional"
          >
            <SchoolAutocomplete value={school} onChange={setSchool} />
          </Field>

          <Field
            icon={<Lock className="h-4 w-4" />}
            label="Password"
            hint="Min 6 characters"
            required
          >
            <input
              type={showPw ? "text" : "password"}
              className={`${inputBase} pl-10 pr-20`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Show
                </>
              )}
            </button>
          </Field>

          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-amber-800">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              This account activates immediately — no email confirmation
              required. Share the password securely.
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-none sm:py-2.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!valid || saving}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none sm:flex-none sm:py-2.5"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {saving ? "Creating…" : "Create admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field wrapper                                                     */
/* ------------------------------------------------------------------ */

function Field({
  icon,
  label,
  hint,
  required,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-semibold text-slate-800">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </span>
        {hint && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
            {hint}
          </span>
        )}
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                       */
/* ------------------------------------------------------------------ */

function EmptyState({
  isEmpty,
  tab,
  onAdd,
}: {
  isEmpty: boolean;
  tab: Tab;
  onAdd: () => void;
}) {
  const isAdmins = tab === "admins";

  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-400">
        {isEmpty ? (
          isAdmins ? (
            <ShieldCheck className="h-6 w-6" />
          ) : (
            <UsersIcon className="h-6 w-6" />
          )
        ) : (
          <Search className="h-6 w-6" />
        )}
      </div>
      <h3 className="mt-2 font-semibold text-slate-800">
        {isEmpty
          ? isAdmins
            ? "No admins yet"
            : "No students yet"
          : "No matches found"}
      </h3>
      <p className="max-w-sm text-sm text-slate-500">
        {isEmpty
          ? isAdmins
            ? "Create your first admin account to delegate quiz management."
            : "Students will appear here once they register."
          : "Try a different name, email, or school."}
      </p>
      {isEmpty && isAdmins && (
        <button
          onClick={onAdd}
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sky-500/25 transition hover:bg-sky-600 active:scale-[0.98] sm:w-auto sm:py-2.5"
        >
          <Plus className="h-4 w-4" /> Create first admin
        </button>
      )}
    </div>
  );
}