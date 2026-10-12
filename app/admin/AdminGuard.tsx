"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { hasAdminSession, clearAdminSession } from "@/lib/admin-session";

type State = "checking" | "denied" | "ok";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1. Tab-scoped token
      if (!hasAdminSession()) {
        if (!cancelled) {
          setReason("session");
          setState("denied");
        }
        return;
      }

      // 2. Auth session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.replace("/auth/login");
        return;
      }

      // 3. DB role
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (!profile?.is_admin) {
        clearAdminSession();
        setReason("role");
        setState("denied");
        return;
      }

      setState("ok");
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-sm">පරිපාලක අනුමත කිරීම පරීක්ෂා කරමින්...</span>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50 px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">ප්‍රවේශය ප්‍රතික්ෂේප විය</h1>
          <p className="mt-2 text-sm text-slate-600">
            {reason === "session"
              ? "පරිපාලක සැසිය කල් ඉකුත් වී ඇත. ප්‍රවේශ කේතය නැවත ඇතුල් කරන්න."
              : "මෙම ගිණුමට පරිපාලක අවසර නොමැත."}
          </p>
          <button
            onClick={() => router.replace("/auth/login")}
            className="btn-primary mt-6"
          >
            පිවිසුම් පිටුවට
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}