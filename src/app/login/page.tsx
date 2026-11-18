import type { Metadata } from "next";
import { LoginForms } from "./login-forms";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-4 py-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold text-ink">Plataforma Casas</h1>
        <p className="text-ink-2">Entre para acessar a gestão da sua casa.</p>
      </div>
      <div className="rounded-card border border-line bg-surface p-6">
        <LoginForms />
      </div>
    </main>
  );
}
