"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearSession, getStoredUser, getToken, type PanelUser } from "@/lib/api";

const NAV = [
  { href: "/kyc", label: "KYC", roles: ["admin"] },
  { href: "/providers", label: "Providers", roles: ["admin"] },
  { href: "/admins", label: "Admins", roles: ["admin"] },
  { href: "/assignments", label: "Assignments", roles: ["admin"] },
  { href: "/plans", label: "Plans", roles: ["admin"] },
  { href: "/subscriptions", label: "Subscriptions", roles: ["admin"] },
  { href: "/chat", label: "Chat", roles: ["admin", "provider"] },
  { href: "/settings", label: "Settings", roles: ["admin"] },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PanelUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // A route change means a nav link (or the browser) navigated us — close the mobile menu.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (!user) return null;

  function handleSignOut() {
    clearSession();
    router.replace("/login");
  }

  const links = NAV.filter((item) => item.roles.includes(user.role));

  return (
    <div className="flex flex-1 flex-col bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href={links[0]?.href ?? "/chat"} className="flex items-center gap-2">
            <Image src="/logo.png" alt="Tech Tarqi" width={140} height={30} className="h-7 w-auto" priority />
          </Link>

          <nav className="hidden flex-1 items-center gap-1 md:flex">
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

          <div className="hidden items-center gap-3 md:flex">
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

          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="rounded-lg border border-zinc-300 p-2 text-zinc-700 transition-colors hover:bg-zinc-100 md:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {menuOpen ? (
                <path
                  d="M5 5l10 10M15 5L5 15"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              ) : (
                <path
                  d="M3 5.5h14M3 10h14M3 14.5h14"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-zinc-200 px-4 py-3 md:hidden">
            <nav className="flex flex-col gap-1">
              {links.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "bg-brand text-white" : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3">
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
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
