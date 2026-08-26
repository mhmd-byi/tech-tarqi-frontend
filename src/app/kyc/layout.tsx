"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearToken, getToken } from "@/lib/api";

export default function KycLayout({ children }: LayoutProps<"/kyc">) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (getToken()) {
      setIsAuthorized(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!isAuthorized) return null;

  function handleSignOut() {
    clearToken();
    router.replace("/login");
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/kyc" className="text-lg font-semibold tracking-tight text-zinc-900">
            Tech Tarqi Admin Panel
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
