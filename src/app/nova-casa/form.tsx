"use client";

import { useActionState } from "react";
import { createHouse, type FormState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, FormMessage } from "@/components/ui/field";

export function NovaCasaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createHouse, {});
  return (
    <form action={action} className="space-y-4">
      <Field id="name" name="name" type="text" label="Nome da casa" required minLength={2} maxLength={80} />
      <Field
        id="slug"
        name="slug"
        type="text"
        label="Endereço da casa"
        required
        minLength={3}
        maxLength={40}
        pattern="[a-z0-9][a-z0-9\-]{2,39}"
        hint="Letras minúsculas, números e hífens. Usado no endereço do site. Não pode ser alterado depois."
      />
      <FormMessage error={state.error} />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando…" : "Criar casa"}
      </Button>
    </form>
  );
}
