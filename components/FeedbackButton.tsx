"use client";

const TALLY_SCRIPT_URL = "https://tally.so/widgets/embed.js";
const TALLY_FEEDBACK_FORM_ID = process.env.NEXT_PUBLIC_TALLY_FEEDBACK_FORM_ID?.trim() || "WOQK0N";
const TALLY_FEEDBACK_URL = process.env.NEXT_PUBLIC_TALLY_FEEDBACK_URL?.trim() || "https://tally.so/r/WOQK0N";

type TallyApi = {
  openPopup: (
    formId: string,
    options?: { layout?: "default" | "modal"; overlay?: boolean; width?: number }
  ) => void;
};

type TallyWindow = Window & typeof globalThis & { Tally?: TallyApi };

let tallyLoadPromise: Promise<TallyApi> | null = null;
let popupIsOpening = false;

function getTally() {
  return (window as TallyWindow).Tally;
}

function loadTallyOnDemand() {
  const loadedTally = getTally();
  if (loadedTally) {
    return Promise.resolve(loadedTally);
  }

  if (tallyLoadPromise) {
    return tallyLoadPromise;
  }

  tallyLoadPromise = new Promise<TallyApi>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TALLY_SCRIPT_URL}"]`
    );
    const script = existingScript || document.createElement("script");

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    const handleLoad = () => {
      cleanup();
      const tally = getTally();
      if (tally) {
        resolve(tally);
      } else {
        reject(new Error("Tally no está disponible después de cargar el script."));
      }
    };

    const handleError = () => {
      cleanup();
      if (script.dataset.meepletavernFeedback === "true") {
        script.remove();
      }
      reject(new Error("No se ha podido cargar Tally."));
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
    const timeoutId = window.setTimeout(handleError, 8000);

    if (!existingScript) {
      script.src = TALLY_SCRIPT_URL;
      script.async = true;
      script.dataset.meepletavernFeedback = "true";
      document.body.appendChild(script);
    } else if (getTally()) {
      handleLoad();
    }
  }).catch((error) => {
    tallyLoadPromise = null;
    throw error;
  });

  return tallyLoadPromise;
}

function openFallbackForm() {
  const link = document.createElement("a");
  link.href = TALLY_FEEDBACK_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function FeedbackButton() {
  async function openFeedback() {
    if (popupIsOpening) {
      return;
    }

    popupIsOpening = true;

    try {
      const tally = await loadTallyOnDemand();
      tally.openPopup(TALLY_FEEDBACK_FORM_ID, {
        layout: "modal",
        overlay: true,
        width: 520
      });
    } catch {
      openFallbackForm();
    } finally {
      popupIsOpening = false;
    }
  }

  return (
    <button
      aria-haspopup="dialog"
      aria-label="Enviar feedback sobre MeepleTavern"
      className="fixed bottom-[4.5rem] right-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-walnut/20 bg-parchment/95 p-0 text-sm font-bold text-walnut shadow-soft backdrop-blur transition hover:-translate-y-0.5 hover:border-ember hover:text-wood focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 motion-reduce:transform-none lg:bottom-5 sm:right-5 sm:h-auto sm:w-auto sm:max-w-[calc(100vw-2.5rem)] sm:px-4 sm:py-2"
      onClick={openFeedback}
      type="button"
    >
      <span className="sm:hidden" aria-hidden="true">💬</span>
      <span className="hidden sm:inline">💬 Ayúdanos a mejorar</span>
    </button>
  );
}
