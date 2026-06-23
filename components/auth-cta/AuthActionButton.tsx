"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthPromptModal } from "@/components/auth-cta/AuthPromptModal";
import { useAuth } from "@/hooks/useAuth";

type AuthActionButtonProps = {
  href?: string;
  intent: string;
  className?: string;
  children: React.ReactNode;
  modalTitle?: string;
  modalDescription?: string;
  authenticated?: boolean;
};

export function AuthActionButton({
  href,
  intent,
  className,
  children,
  modalTitle,
  modalDescription,
  authenticated
}: AuthActionButtonProps) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const next = pathname || "/";
  const isAuthenticated = authenticated ?? Boolean(user);

  if (!loading && isAuthenticated && href) {
    return (
      <Link className={className} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className={className}
        disabled={loading}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      <AuthPromptModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={modalTitle}
        description={modalDescription}
        next={next}
        intent={intent}
      />
    </>
  );
}
