"use client";

import { useEffect, useRef, useState } from "react";

export function ReadingProgressBar() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const frameRef = useRef<number | null>(null);
  const lastProgressRef = useRef(0);
  const lastVisibleRef = useRef(false);

  useEffect(() => {
    function updateProgress() {
      frameRef.current = null;

      const analysis = document.getElementById("analisis");
      if (!analysis) {
        if (lastProgressRef.current !== 0) {
          lastProgressRef.current = 0;
          setProgress(0);
        }
        if (lastVisibleRef.current) {
          lastVisibleRef.current = false;
          setVisible(false);
        }
        return;
      }

      const analysisRect = analysis.getBoundingClientRect();
      const analysisTop = analysisRect.top + window.scrollY;
      const readableDistance = Math.max(analysisRect.height - window.innerHeight, 1);
      const rawProgress = ((window.scrollY - analysisTop) / readableDistance) * 100;
      const nextProgress = Math.round(Math.min(Math.max(rawProgress, 0), 100) * 10) / 10;
      const nextVisible = window.scrollY >= analysisTop;

      if (nextProgress !== lastProgressRef.current) {
        lastProgressRef.current = nextProgress;
        setProgress(nextProgress);
      }
      if (nextVisible !== lastVisibleRef.current) {
        lastVisibleRef.current = nextVisible;
        setVisible(nextVisible);
      }
    }

    function scheduleUpdate() {
      if (frameRef.current !== null) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(updateProgress);
    }

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate, { passive: true });
    scheduleUpdate();

    return () => {
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, []);

  return (
    <div
      className="reading-progress-bar"
      style={{
        width: `${progress}%`,
        opacity: visible ? 1 : 0
      }}
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Progreso de lectura"
    />
  );
}
