"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function LibraryOnboardingTooltip() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the tooltip
    const hasSeen = localStorage.getItem("meepletavern_library_onboarding_seen");
    if (!hasSeen) {
      // Delay it slightly so it pops up after page load for better attention
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem("meepletavern_library_onboarding_seen", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="absolute -top-4 right-0 z-50 w-[280px] -translate-y-full animate-in fade-in slide-in-from-bottom-4 duration-500 sm:w-72 sm:-right-4">
      <div className="relative rounded-lg bg-ruby p-4 text-white shadow-xl">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); dismiss(); }} 
          className="absolute right-2 top-2 text-white/70 hover:text-white"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
        
        <div className="flex items-start gap-3">
          <span className="text-2xl animate-pulse">👋</span>
          <div className="text-sm">
            <p className="font-bold mb-1">¡Guarda tus favoritos!</p>
            <p className="text-white/90">Usa estos botones para añadir el juego a tu ludoteca o apuntarlo para jugar más tarde.</p>
          </div>
        </div>
        
        {/* Caret pointing down */}
        <div className="absolute -bottom-2 right-12 h-4 w-4 rotate-45 bg-ruby sm:right-16" />
      </div>
    </div>
  );
}
