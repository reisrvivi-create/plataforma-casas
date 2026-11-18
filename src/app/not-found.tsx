import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-2xl font-semibold text-ink">Página não encontrada</h1>
      <p className="text-ink-2">O endereço não existe ou você não tem permissão para vê-lo.</p>
      <Link href="/dashboard" className="font-semibold text-primary underline">
        Voltar ao dashboard
      </Link>
    </main>
  );
}
