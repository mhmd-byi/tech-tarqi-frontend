"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearSession, getStoredUser, getToken, type PanelUser } from "@/lib/api";

const NAV = [
  { href: "/kyc", label: "KYC", roles: ["admin"] },
  { href: "/providers", label: "Providers", roles: ["admin"] },
  { href: "/assignments", label: "Assignments", roles: ["admin"] },
  { href: "/chat", label: "Chat", roles: ["admin", "provider"] },
  { href: "/settings", label: "Settings", roles: ["admin"] },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PanelUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();

    if (getToken() && stored) {
      setUser(stored);
    } else {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;

    const allowed = NAV.filter((item) => item.roles.includes(user.role));
    const onAllowedPage = allowed.some(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    );

    if (!onAllowedPage) router.replace(allowed[0]?.href ?? "/login");
  }, [user, pathname, router]);

  if (!user) return null;

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  const links = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <Link href={links[0]?.href ?? "/chat"} className="flex items-center gap-2">
            <Image src="/logo.png" alt="Tech Tarqi" width={140} height={30} className="h-7 w-auto" priority />
          </Link>

          <nav className="flex flex-1 items-center gap-1">
            {links.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-sm text-zinc-500">
              {user.name}
              <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs capitalize text-zinc-600">
                {user.role}
              </span>
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
