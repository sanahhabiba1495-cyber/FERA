"use client";

import { SerwistProvider } from "@serwist/turbopack/react";
import { useEffect, type ReactNode } from "react";

const isDev = process.env.NODE_ENV === "development";

export function PwaProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!isDev || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }, []);

  return (
    <SerwistProvider
      swUrl="/serwist/sw.js"
      disable={isDev}
      register={!isDev}
      cacheOnNavigation={!isDev}
      reloadOnOnline={false}
    >
      {children}
    </SerwistProvider>
  );
}
