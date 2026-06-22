"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";

export function MobileRankingCarousel({ children, count }: { children: ReactNode; count: number }) {
  const listRef = useRef<HTMLOListElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(count > 1);

  const updateState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const items = Array.from(list.children) as HTMLElement[];
    const firstOffset = items[0]?.offsetLeft || 0;
    const current = items.reduce((nearest, item, index) => {
      const distance = Math.abs(item.offsetLeft - firstOffset - list.scrollLeft);
      const nearestDistance = Math.abs(items[nearest].offsetLeft - firstOffset - list.scrollLeft);
      return distance < nearestDistance ? index : nearest;
    }, 0);
    const maxScroll = list.scrollWidth - list.clientWidth;

    setActiveIndex(current);
    setCanGoBack(list.scrollLeft > 4);
    setCanGoForward(list.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    let frame = 0;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateState);
    };

    scheduleUpdate();
    list.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateState]);

  function goTo(index: number) {
    const list = listRef.current;
    const items = list ? (Array.from(list.children) as HTMLElement[]) : [];
    const target = items[Math.max(0, Math.min(index, items.length - 1))];
    if (!list || !target || !items[0]) return;

    list.scrollTo({
      left: target.offsetLeft - items[0].offsetLeft,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  }

  return (
    <div className="min-w-0 max-w-full">
      <div className="mb-3 flex items-center justify-between gap-3 md:hidden">
        <p id="mobile-ranking-hint" className="text-xs font-bold text-walnut/60">
          Desliza para ver más
        </p>
        <div className="flex items-center gap-2" aria-label="Controles del carrusel">
          <span className="min-w-10 text-center text-xs font-black tabular-nums text-walnut/55" aria-live="polite">
            {activeIndex + 1} / {count}
          </span>
          <button
            type="button"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-walnut/15 bg-paper text-wood shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Juego anterior"
            disabled={!canGoBack}
            onClick={() => goTo(activeIndex - 1)}
          >
            <BrandIcon name="chevron-left" size={18} />
          </button>
          <button
            type="button"
            className="focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full border border-walnut/15 bg-paper text-wood shadow-sm disabled:cursor-not-allowed disabled:opacity-35"
            aria-label="Juego siguiente"
            disabled={!canGoForward}
            onClick={() => goTo(activeIndex + 1)}
          >
            <BrandIcon name="chevron-right" size={18} />
          </button>
        </div>
      </div>

      <ol
        ref={listRef}
        aria-label="Juegos mejor valorados"
        aria-describedby="mobile-ranking-hint"
        className="scrollbar-hide -mx-4 flex w-[calc(100%+2rem)] max-w-[calc(100%+2rem)] snap-x snap-mandatory items-stretch gap-4 overflow-x-auto overscroll-x-contain px-4 pb-2 scroll-px-4 touch-pan-x md:mx-0 md:grid md:w-auto md:max-w-none md:snap-none md:grid-cols-2 md:overflow-visible md:px-0 md:pb-0"
      >
        {children}
      </ol>
    </div>
  );
}
