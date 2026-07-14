import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase-server";
import { signOut } from "./actions";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();
  // getUser() re-validates against Supabase's Auth server instead of just
  // trusting the session cookie — the right check for anything gating
  // access to real data, per security.md's "validate session on every
  // protected route."
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <nav className="flex w-56 flex-col gap-1 border-r border-gray-200 bg-gray-50 p-4">
        <Link
          href="/dashboard/projects"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-200"
        >
          Projects
        </Link>
        <Link
          href="/dashboard/profile"
          className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-200"
        >
          Profile
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-lg px-3 py-2 text-left text-gray-700 hover:bg-gray-200"
          >
            Sign out
          </button>
        </form>
      </nav>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
