"use client";

import { useRef } from "react";
import { selectHouse } from "@/app/actions";

export function HouseSelector({ houses, currentId }: { houses: { id: string; name: string }[]; currentId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  if (houses.length < 2) {
    return <p className="truncate text-sm font-semibold text-ink">{houses[0]?.name}</p>;
  }
  return (
    <form ref={formRef} action={selectHouse} className="flex min-w-0 items-center gap-2">
      <label htmlFor="house" className="sr-only">
        Casa atual
      </label>
      <select
        id="house"
        name="house"
        defaultValue={currentId}
        onChange={() => formRef.current?.requestSubmit()}
        className="min-h-11 max-w-64 truncate rounded-control border border-control bg-surface px-3 text-sm font-semibold text-ink"
      >
        {houses.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      <noscript>
        <button type="submit" className="min-h-11 rounded-control border border-control px-3 text-sm">
          Trocar
        </button>
      </noscript>
    </form>
  );
}
