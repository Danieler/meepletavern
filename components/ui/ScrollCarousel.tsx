"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";

type ScrollCarouselProps = {
  children: ReactNode;
  containerClassName?: string;
  listClassName?: string;
};

export function ScrollCarousel({ children, containerClassName = "", listClassName = "" }: ScrollCarouselProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(true);
  
  // Drag to scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [dragged, setDragged] = useState(false);

  const updateState = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const maxScroll = list.scrollWidth - list.clientWidth;
    setCanGoBack(list.scrollLeft > 4);
    setCanGoForward(list.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    // Prevent native browser drag and drop of links/images inside the carousel,
    // which otherwise interrupts custom mouse-dragging scroll.
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };
    list.addEventListener("dragstart", handleDragStart, { capture: true });

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
      list.removeEventListener("dragstart", handleDragStart, { capture: true });
      list.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateState]);

  const scrollBy = (amount: number) => {
    if (!listRef.current) return;
    listRef.current.scrollBy({
      left: amount,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!listRef.current) return;
    setIsDragging(true);
    setDragged(false);
    setStartX(e.pageX - listRef.current.offsetLeft);
    setScrollLeft(listRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !listRef.current) return;
    e.preventDefault();
    const x = e.pageX - listRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // drag speed
    listRef.current.scrollLeft = scrollLeft - walk;
    
    if (Math.abs(walk) > 5) {
      setDragged(true);
    }
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (dragged) {
      e.stopPropagation();
      e.preventDefault();
      setDragged(false);
    }
  };

  return (
    <div className={`relative group ${containerClassName}`}>
      <div 
        ref={listRef}
        className={`scrollbar-hide overflow-x-auto overscroll-x-contain touch-pan-x select-none ${isDragging ? "cursor-grabbing snap-none" : "cursor-grab snap-x snap-mandatory"} ${listClassName}`}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClickCapture={handleClickCapture}
        onDragStart={(e) => { e.preventDefault(); }}
      >
        {children}
      </div>

      {canGoBack && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); scrollBy(-300); }}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-walnut/15 bg-paper text-wood shadow-md transition hover:scale-105 hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 disabled:hidden"
          aria-label="Desplazar hacia atrás"
        >
          <BrandIcon name="chevron-left" size={16} />
        </button>
      )}

      {canGoForward && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); scrollBy(300); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full border border-walnut/15 bg-paper text-wood shadow-md transition hover:scale-105 hover:bg-white opacity-100 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 disabled:hidden"
          aria-label="Desplazar hacia adelante"
        >
          <BrandIcon name="chevron-right" size={16} />
        </button>
      )}
    </div>
  );
}
