"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";

const initial: FormState = {};

export function LoginForms() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [signInState, signInAction, signInPending] = useActionState(signIn, initial);
  const [signUpState, signUpAction, signUpPending] = useActionState(signUp, initial);

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Escolha entre entrar e criar conta" className="grid grid-cols-2 gap-1 rounded-control bg-canvas p-1">
        {(["entrar", "criar"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-11 rounded-control text-sm font-semibold ${mode === m ? "bg-surface text-ink shadow-sm" : "text-ink-2"}`}
          >
            {m === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      {mode === "entrar" ? (
        <form action={signInAction} className="space-y-4">
          <Field id="email" name="email" type="email" label="E-mail" autoComplete="email" required />
          <Field id="password" name="password" type="password" label="Senha" autoComplete="current-password" required />
          <FormMessage error={signInState.error} />
          <Button type="submit" className="w-full" disabled={signInPending}>
            {signInPending ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      ) : (
        <form action={signUpAction} className="space-y-4">
          <Field id="name" name="name" type="text" label="Seu nome" autoComplete="name" />
          <Field id="email-new" name="email" type="email" label="E-mail" autoComplete="email" required />
          <Field id="password-new" name="password" type="password" label="Senha" autoComplete="new-password" minLength={10} required hint="Use pelo menos 10 caracteres." />
          <FormMessage error={signUpState.error} info={signUpState.info} />
          <Button type="submit" className="w-full" disabled={signUpPending}>
            {signUpPending ? "Criando…" : "Criar conta"}
          </Button>
        </form>
      )}
    </div>
  );
}
