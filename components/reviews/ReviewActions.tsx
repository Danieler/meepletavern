"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

type ReviewActionsProps = {
  title: string;
  className?: string;
  tone?: "light" | "dark";
};

type Action = "share" | "copy";

type Feedback = {
  action: Action;
  message: string;
  tone: "success" | "error";
};

const FEEDBACK_DURATION_MS = 2200;

export function ReviewActions({ title, className = "", tone = "light" }: ReviewActionsProps) {
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  function clearFeedback() {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
      feedbackTimer.current = null;
    }

    setFeedback(null);
  }

  function showFeedback(nextFeedback: Feedback) {
    clearFeedback();
    setFeedback(nextFeedback);
    feedbackTimer.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimer.current = null;
    }, FEEDBACK_DURATION_MS);
  }

  async function copyUrl(url: string) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        return;
      } catch {
        // Some browsers expose Clipboard API but block it; use the click-scoped fallback.
      }
    }

    const textArea = document.createElement("textarea");
    textArea.value = url;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.inset = "0 auto auto 0";
    textArea.style.opacity = "0";
    textArea.style.pointerEvents = "none";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, url.length);

    try {
      if (!document.execCommand("copy")) {
        throw new Error("Copy command was rejected");
      }
    } finally {
      textArea.remove();
    }
  }

  async function handleShare() {
    clearFeedback();
    setPendingAction("share");

    try {
      const url = window.location.href;

      if (typeof navigator.share === "function") {
        await navigator.share({ title, url });
        showFeedback({ action: "share", message: "Contenido compartido", tone: "success" });
      } else {
        await copyUrl(url);
        showFeedback({ action: "share", message: "Enlace copiado", tone: "success" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      showFeedback({
        action: "share",
        message: "No se pudo compartir. Inténtalo de nuevo.",
        tone: "error"
      });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleCopy() {
    clearFeedback();
    setPendingAction("copy");

    try {
      await copyUrl(window.location.href);
      showFeedback({ action: "copy", message: "Enlace copiado", tone: "success" });
    } catch {
      showFeedback({
        action: "copy",
        message: "No se pudo copiar. Inténtalo de nuevo.",
        tone: "error"
      });
    } finally {
      setPendingAction(null);
    }
  }

  const shareConfirmed = feedback?.tone === "success" && feedback.action === "share";
  const shareCopied = shareConfirmed && feedback.message === "Enlace copiado";
  const copyConfirmed = feedback?.tone === "success" && feedback.action === "copy";
  const actionIsPending = pendingAction !== null;

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className}`}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleShare()}
          disabled={actionIsPending}
          aria-busy={pendingAction === "share"}
          aria-label={`Compartir ${title}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-walnut/20 bg-white/80 px-3.5 py-2 text-sm font-black text-walnut shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none"
        >
          {shareConfirmed ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
          {pendingAction === "share" ? "Abriendo…" : shareCopied ? "Copiado" : shareConfirmed ? "Compartido" : "Compartir"}
        </button>

        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={actionIsPending}
          aria-busy={pendingAction === "copy"}
          aria-label={`Copiar enlace de ${title}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-walnut/20 bg-white/80 px-3.5 py-2 text-sm font-black text-walnut shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-ember/40 hover:bg-white hover:text-ember focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 active:translate-y-0 disabled:cursor-wait disabled:opacity-60 motion-reduce:transform-none"
        >
          {copyConfirmed ? <Check size={17} aria-hidden="true" /> : <Copy size={17} aria-hidden="true" />}
          {pendingAction === "copy" ? "Copiando…" : copyConfirmed ? "Copiado" : "Copiar enlace"}
        </button>
      </div>

      <p
        className={`min-h-5 text-xs font-bold leading-5 ${
          feedback?.tone === "error"
            ? tone === "dark" ? "text-[#ffd3cc]" : "text-ruby"
            : tone === "dark" ? "text-[#f6c86f]" : "text-ember"
        }`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {feedback?.message ?? ""}
      </p>
    </div>
  );
}
