"use client";

import { useEffect, useState } from "react";

export function InstallHint() {
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);

  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsIos(ios);
    setIsStandalone(standalone);
  }, []);

  if (isStandalone || !isIos) return null;

  return (
    <p className="mt-10 text-center text-sm text-muted">
      On iPhone, tap Share and then Add to Home Screen to install Fera.
    </p>
  );
}
