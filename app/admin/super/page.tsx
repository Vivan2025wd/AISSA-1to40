"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import SchoolAutocomplete from "@/components/SchoolAutocomplete";

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
  const [confirm, setConfirm] = useState<
    | { kind: "demote"; user: UserRow }
    | { kind: "promote"; user: UserRow }
    | { kind: "delete"; user: UserRow }
    | null
  >(null);

  /* ---------- auth + role check ---------- */

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      setLoaded(true);
    })();
  }, [router]);

  /* ---------- load users ---------- */

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

  useEffect(() => {
    if (meIsSuper) load();
  }, [meIsSuper]);

  /* ---------- actions ---------- */

  async function doAction(action: "promote" | "demote" | "delete", userId: string) {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, userId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? "ක්‍රියාව අසාර්ථකයි");
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
    } catch (e: any) {
      setError(e.message ?? "Unknown error");
      setConfirm(null);
    }
  }

  /* ---------- guards ---------- */

  if (!loaded) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!meIsSuper) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
          <ShieldOff className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">ප්‍රවේශය ප්‍රතික්ෂේප විය</h1>
        <p className="mt-2 text-sm text-slate-600">
          මෙම පිටුව සුපිරි පරිපාලකයන් සඳහා පමණි.
        </p>
      </div>
    );
  }

  /* ---------- filter ---------- */

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
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-amber-100 text-amber-700">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              පරිපාලක කළමනාකරණය
            </h1>
            <p className="mt-0.5 text-sm text-slate-600">
              Manage admins and students
            </p>
          </div>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> නව පරිපාලකයෙක්
        </button>
      </div>

      {/* Tabs + search */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm">
          <button
            onClick={() => setTab("admins")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${
              tab === "admins"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            පරිපාලකයන්
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {admins.length}
            </span>
          </button>
          <button
            onClick={() => setTab("students")}
            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 font-medium transition ${
              tab === "students"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UsersIcon className="h-4 w-4" />
            සිසුන්
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
              {students.length}
            </span>
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="නම, ඊමේල් හෝ පාසල..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="card mt-4 overflow-hidden">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-500">
            {list.length === 0
              ? tab === "admins"
                ? "පරිපාලකයන් නොමැත."
                : "සිසුන් නොමැත."
              : "ගැලපෙන ප්‍රතිඵල නොමැත."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">නම</th>
                  <th className="px-5 py-3 font-medium">විද්‍යුත් තැපෑල</th>
                  <th className="px-5 py-3 font-medium">පාසල</th>
                  <th className="px-5 py-3 font-medium">කාර්යභාරය</th>
                  <th className="px-5 py-3 text-right font-medium">ක්‍රියා</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => {
                  const isMe = u.id === me;
                  const isSuper = u.is_super_admin;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-800">
                        {u.full_name || "—"}
                        {isMe && (
                          <span className="ml-2 text-xs font-semibold text-brand-600">
                            (ඔබ)
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{u.email}</td>
                      <td className="max-w-50 truncate px-5 py-3 text-slate-600">
                        {u.school || "—"}
                      </td>
                      <td className="px-5 py-3">
                        {isSuper ? (
                          <span className="badge bg-amber-50 text-amber-700">
                            <Crown className="h-3 w-3" /> Super Admin
                          </span>
                        ) : u.is_admin ? (
                          <span className="badge bg-brand-50 text-brand-700">
                            <ShieldCheck className="h-3 w-3" /> Admin
                          </span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600">
                            Student
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {tab === "students" && (
                            <button
                              onClick={() => setConfirm({ kind: "promote", user: u })}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-brand-50 hover:text-brand-600"
                              title="පරිපාලකයෙකු කරන්න"
                            >
                              <UserCog className="h-4 w-4" />
                            </button>
                          )}
                          {tab === "admins" && !isSuper && !isMe && (
                            <button
                              onClick={() => setConfirm({ kind: "demote", user: u })}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                              title="පහත හෙළන්න"
                            >
                              <ShieldOff className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirm({ kind: "delete", user: u })}
                            disabled={isMe || isSuper}
                            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                            title="මකන්න"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create admin modal */}
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

      {/* Confirm dialog */}
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
      icon: <UserCog className="h-6 w-6" />,
      tone: "bg-brand-100 text-brand-600",
      title: "පරිපාලකයෙකු කරන්නද?",
      desc: "මෙම සිසුවාට ප්‍රශ්න බැංකුව සහ ප්‍රශ්නාවලි කළමනාකරණය කිරීමට අවසර ලැබේ.",
      cta: "පරිපාලකයෙකු කරන්න",
    },
    demote: {
      icon: <ShieldOff className="h-6 w-6" />,
      tone: "bg-amber-100 text-amber-600",
      title: "පහත හෙළන්නද?",
      desc: "මෙම පරිපාලකයාට සිසු අයිතිවාසිකම් වලට පමණක් ප්‍රවේශය ලැබේ.",
      cta: "පහත හෙළන්න",
    },
    delete: {
      icon: <Trash2 className="h-6 w-6" />,
      tone: "bg-red-100 text-red-600",
      title: "සම්පූර්ණයෙන් මකන්නද?",
      desc: "ගිණුම, ප්‍රතිඵල සහ සියලු දත්ත ස්ථීරව මකා දැමේ. ප්‍රතිවර්තනය කළ නොහැක.",
      cta: "මකන්න",
    },
  }[state.kind];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${copy.tone}`}>
            {copy.icon}
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{copy.desc}</p>
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <span className="font-semibold">{state.user.full_name}</span>
            <br />
            <span className="text-slate-500">{state.user.email}</span>
          </p>
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onCancel} className="btn-outline flex-1">
            අවලංගු
          </button>
          <button
            onClick={onConfirm}
            className={state.kind === "delete" ? "btn-danger flex-1" : "btn-primary flex-1"}
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
      setError(j.error ?? "නිර්මාණය අසාර්ථකයි");
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4">
      <div className="mx-auto my-8 w-full max-w-md rounded-xl bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">නව පරිපාලකයෙක්</h2>
              <p className="text-[11px] text-slate-500">Create a new admin account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-4 px-5 py-5">
          <Field icon={<User className="h-4 w-4" />} si="සම්පූර්ණ නම" en="Full name">
            <input
              className="input pl-9"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field icon={<Mail className="h-4 w-4" />} si="විද්‍යුත් තැපෑල" en="Email">
            <input
              type="email"
              className="input pl-9"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>

          <Field icon={<SchoolIcon className="h-4 w-4" />} si="පාසල" en="School (optional)">
            <SchoolAutocomplete value={school} onChange={setSchool} />
          </Field>

          <Field icon={<Lock className="h-4 w-4" />} si="මුරපදය" en="Password (min 6)">
            <input
              type={showPw ? "text" : "password"}
              className="input pl-9 pr-20"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              {showPw ? "සඟවන්න" : "පෙන්වන්න"}
            </button>
          </Field>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            මෙම ගිණුම වහාම සක්‍රීය වේ. ඊමේල් තහවුරු කිරීමක් අවශ්‍ය නැත.
            මුරපදය ආරක්ෂිතව බෙදාගන්න.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-outline">
              අවලංගු
            </button>
            <button type="submit" disabled={!valid || saving} className="btn-primary">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? "නිර්මාණය කරමින්..." : "පරිපාලකයෙකු සාදන්න"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  icon,
  si,
  en,
  children,
}: {
  icon: React.ReactNode;
  si: string;
  en: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-800">{si}</span>
        <span className="text-[11px] text-slate-400">{en}</span>
      </div>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}