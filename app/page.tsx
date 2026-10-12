import Link from "next/link";
import { FlaskConical, Trophy, ClipboardList, Languages } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-brand-50 via-white to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-white">
            <FlaskConical className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-slate-900">O/L Science Quiz</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/auth/login" className="btn-outline">ඇතුල් වන්න</Link>
          <Link href="/auth/register" className="btn-primary">ලියාපදිංචි වන්න</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-4xl px-5 pt-10 pb-16 text-center">
        <span className="badge bg-brand-50 text-brand-700">🇱🇰 සාමාන්‍ය පෙළ · විද්‍යාව</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          විද්‍යාවට ලකුණු වැඩි කරගන්න <span className="text-brand-600">තරඟකාරී</span> ප්‍රශ්නාවලියක්
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          දිවයින පුරා සිසුන් සමඟ තරඟ කරන්න · සිංහල මාධ්‍යයෙන් · නොමිලේ ·
          සෑම ප්‍රශ්නයකටම විස්තරාත්මක පැහැදිලි කිරීම්.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/register" className="btn-primary px-6 py-3 text-base">
            දැන්ම ලියාපදිංචි වන්න
          </Link>
          <Link href="/auth/login" className="btn-outline px-6 py-3 text-base">
            මම දැනටමත් සාමාජිකයෙක්
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2 lg:grid-cols-4">
        <Feature icon={<ClipboardList className="h-5 w-5" />} title="නියමිත වේලාවට විභාග"
                 desc="පරිපාලකයා විසින් ප්‍රකාශයට පත් කරන ප්‍රශ්නාවලි." />
        <Feature icon={<Trophy className="h-5 w-5" />} title="දිවයින පුරා ශ්‍රේණිගත කිරීම්"
                 desc="ඔබේ පාසලේ හා දිවයිනේ ස්ථානය බලන්න." />
        <Feature icon={<Languages className="h-5 w-5" />} title="සිංහල + English"
                 desc="ප්‍රශ්න සිංහලෙන්, අවශ්‍ය නම් ඉංග්‍රීසියෙන් ද." />
        <Feature icon={<FlaskConical className="h-5 w-5" />} title="විද්‍යාව පමණයි"
                 desc="ජීව විද්‍යාව · රසායනය · භෞතිකය — එකම වේදිකාවක." />
      </section>
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="card p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{desc}</p>
    </div>
  );
}