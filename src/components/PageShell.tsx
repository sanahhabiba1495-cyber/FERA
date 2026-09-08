import type { ReactNode } from "react";

export function PageShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="px-5 py-5 sm:px-8">
        <a href="/" className="font-display text-2xl tracking-tight text-terracotta">
          Fera
        </a>
      </header>
      <main
        className={`mx-auto w-full flex-1 px-5 pb-16 sm:px-8 ${wide ? "max-w-4xl" : "max-w-xl"}`}
      >
        {children}
      </main>
    </div>
  );
}
