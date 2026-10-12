import { NextResponse, type NextRequest } from "next/server";
import { createClient as createSb } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*  Guard                                                             */
/* ------------------------------------------------------------------ */

async function requireSuperAdmin() {
  const ssr = await createClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return { error: "unauthenticated" as const, status: 401 };

  const { data: profile } = await ssr
    .from("profiles")
    .select("is_super_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_super_admin) {
    return { error: "forbidden" as const, status: 403 };
  }
  return { user };
}

function svc() {
  return createSb(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/* ------------------------------------------------------------------ */
/*  GET — list admins + students                                      */
/* ------------------------------------------------------------------ */

export async function GET() {
  const guard = await requireSuperAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const sb = svc();

  const [admins, students] = await Promise.all([
    sb
      .from("profiles")
      .select("id, email, full_name, school, is_admin, is_super_admin, created_at")
      .eq("is_admin", true)
      .order("created_at", { ascending: false }),
    sb
      .from("profiles")
      .select("id, email, full_name, school, is_admin, is_super_admin, created_at")
      .eq("is_admin", false)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    admins: admins.data ?? [],
    students: students.data ?? [],
  });
}

/* ------------------------------------------------------------------ */
/*  POST — create / promote / demote / delete                         */
/* ------------------------------------------------------------------ */

interface Body {
  action: "create" | "promote" | "demote" | "delete";
  // create
  email?: string;
  password?: string;
  full_name?: string;
  school?: string;
  // promote/demote/delete
  userId?: string;
}

export async function POST(req: NextRequest) {
  const guard = await requireSuperAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = svc();

  switch (body.action) {
    /* -------------------------------------------------- */
    /*  Create a new admin                                */
    /* -------------------------------------------------- */
    case "create": {
      const email = body.email?.trim().toLowerCase();
      const password = body.password ?? "";
      const fullName = body.full_name?.trim() ?? "";
      const school = body.school?.trim() ?? "";

      if (!email || !password || !fullName) {
        return bad("සියලු අවශ්‍ය ක්ෂේත්‍ර පුරවන්න.");
      }
      if (password.length < 6) return bad("මුරපදය අවම අක්ෂර 6ක් විය යුතුය.");
      if (!/^\S+@\S+\.\S+$/.test(email)) return bad("වලංගු විද්‍යුත් තැපැල් ලිපිනයක් ඇතුල් කරන්න.");

      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, school },
      });

      if (createErr || !created.user) {
        const m = createErr?.message?.toLowerCase() ?? "";
        if (m.includes("already") || m.includes("duplicate"))
          return bad("මෙම විද්‍යුත් තැපෑල දැනටමත් භාවිතයේ ඇත.", 409);
        return bad(createErr?.message ?? "ගිණුම නිර්මාණය කිරීම අසාර්ථකයි.", 400);
      }

      const { error: promoErr } = await sb
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", created.user.id);

      if (promoErr) {
        // Roll back — leave no orphan
        await sb.auth.admin.deleteUser(created.user.id);
        return bad(promoErr.message, 500);
      }

      return NextResponse.json({ success: true, id: created.user.id });
    }

    /* -------------------------------------------------- */
    /*  Promote a student to admin                        */
    /* -------------------------------------------------- */
    case "promote": {
      if (!body.userId) return bad("userId අවශ්‍යයි.");

      const { error } = await sb
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", body.userId);

      if (error) return bad(error.message);
      return NextResponse.json({ success: true });
    }

    /* -------------------------------------------------- */
    /*  Demote an admin back to student                   */
    /* -------------------------------------------------- */
    case "demote": {
      if (!body.userId) return bad("userId අවශ්‍යයි.");
      if (body.userId === guard.user.id) return bad("ඔබට ඔබවම පහත හෙළිය නොහැක.");

      const { data: target } = await sb
        .from("profiles")
        .select("is_super_admin")
        .eq("id", body.userId)
        .single();

      if (target?.is_super_admin) return bad("සුපිරි පරිපාලකයෙකු පහත හෙළිය නොහැක.");

      const { error } = await sb
        .from("profiles")
        .update({ is_admin: false })
        .eq("id", body.userId);

      if (error) return bad(error.message);
      return NextResponse.json({ success: true });
    }

    /* -------------------------------------------------- */
    /*  Delete a user entirely (auth.users → cascade)     */
    /* -------------------------------------------------- */
    case "delete": {
      if (!body.userId) return bad("userId අවශ්‍යයි.");
      if (body.userId === guard.user.id) return bad("ඔබට ඔබවම මැකිය නොහැක.");

      const { data: target } = await sb
        .from("profiles")
        .select("is_super_admin")
        .eq("id", body.userId)
        .single();

      if (target?.is_super_admin) return bad("සුපිරි පරිපාලකයෙකු මැකිය නොහැක.");

      const { error } = await sb.auth.admin.deleteUser(body.userId);
      if (error) return bad(error.message);
      return NextResponse.json({ success: true });
    }

    default:
      return bad("නොදන්නා ක්‍රියාවක්.");
  }
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}