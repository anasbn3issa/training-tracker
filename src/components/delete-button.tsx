"use client";

import { useEffect, useState } from "react";

const ARM_MS = 3000;

/** Two taps instead of a confirmation dialog: the first arms it for 3 s, the second confirms. */
export function DeleteButton({
  label,
  armedLabel = "Tap again to delete",
  onConfirm,
  disabled = false,
}: {
  label: string;
  armedLabel?: string;
  onConfirm: () => void;
  disabled?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const id = setTimeout(() => setArmed(false), ARM_MS);
    return () => clearTimeout(id);
  }, [armed]);

  return (
    <button
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      disabled={disabled}
      className={`type-label mt-1 h-12 text-sm disabled:border-line disabled:bg-transparent disabled:text-fg-3 ${
        armed ? "bg-danger text-bg" : "border-2 border-danger text-danger active:bg-surface"
      }`}
    >
      {armed ? armedLabel : label}
    </button>
  );
}
