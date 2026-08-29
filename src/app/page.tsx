"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getStoredUser, getToken } from "@/lib/api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();

    if (!getToken() || !user) {
      router.replace("/login");
      return;
    }

    router.replace(user.role === "admin" ? "/kyc" : "/chat");
  }, [router]);

  return null;
}
