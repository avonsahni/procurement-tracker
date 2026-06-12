"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}

export default function SubmitButton({ children, pendingLabel, className }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className={className}
    >
      {pending ? (
        <span className="flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {pendingLabel ?? "Saving…"}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
