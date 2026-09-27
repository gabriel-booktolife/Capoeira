"use client";

import { Info } from "lucide-react";

export function FieldInfo({ label, children }: { label: string; children: string }) {
  return <details className="field-info"><summary aria-label={`Mais informações sobre ${label}`}><Info size={14} aria-hidden="true" /></summary><span role="tooltip">{children}</span></details>;
}
