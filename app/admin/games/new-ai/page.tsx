import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AiGenerateForm } from "@/components/AiGenerateForm";
import { SectionHeader } from "@/components/SectionHeader";

export default function NewAiGamePage() {
  return (
    <div className="max-w-3xl">
      <Link className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-moss" href="/admin/games">
        <ChevronLeft size={16} aria-hidden="true" />
        Volver a juegos
      </Link>
      <SectionHeader
        title="Crear ficha con IA"
        description="Escribe el nombre del juego y se creará un borrador editable con contenido mock si no hay API key configurada."
      />
      <AiGenerateForm />
    </div>
  );
}

