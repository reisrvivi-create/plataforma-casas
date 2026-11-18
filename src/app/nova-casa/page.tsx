import type { Metadata } from "next";
import { getContext } from "@/lib/context";
import { NovaCasaForm } from "./form";

export const metadata: Metadata = { title: "Criar casa" };

export default async function NovaCasaPage() {
  const ctx = await getContext({ allowNoHouse: true });
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink">{ctx ? "Criar outra casa" : "Crie a sua casa"}</h1>
        <p className="text-ink-2">Você será a administradora. Depois poderá convidar outras pessoas e definir permissões.</p>
      </div>
      <div className="rounded-card border border-line bg-surface p-6">
        <NovaCasaForm />
      </div>
    </main>
  );
}
