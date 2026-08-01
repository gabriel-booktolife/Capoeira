"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/content/types";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { const listener = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; addEventListener("beforeunload", listener); return () => removeEventListener("beforeunload", listener); }, [dirty]);
  const update = (key: keyof SiteSettings, value: string) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  async function save() { setBusy(true); setMessage(""); const result = await saveSettingsAction(form); if (result.ok) { setForm(result.data); setDirty(false); setMessage(result.message || "Salvo."); } else setMessage(result.error); setBusy(false); }
  const field = (label: string, key: keyof SiteSettings, maxLength: number, textarea = false) => <label className="field"><span>{label}</span>{textarea ? <textarea value={String(form[key] || "")} maxLength={maxLength} onChange={(event) => update(key, event.target.value)} /> : <input value={String(form[key] || "")} maxLength={maxLength} onChange={(event) => update(key, event.target.value)} />}<small>{String(form[key] || "").length} / {maxLength}</small></label>;
  return <>
    <header className="admin-page-header"><div><h1>Configurações</h1><p>Textos institucionais, contatos, redes e informações para busca.</p></div></header>
    <section className="admin-editor"><div className="form-grid">
      {field("Nome do grupo", "groupName", 120)}{field("Slogan", "tagline", 180)}
      {field("Título do hero", "heroTitle", 180)}{field("Texto do hero", "heroText", 700, true)}
      {field("Título institucional", "aboutTitle", 160)}{field("Texto institucional", "aboutText", 6000, true)}
      {field("E-mail", "contactEmail", 240)}{field("WhatsApp (com DDI)", "whatsapp", 40)}
      {field("Instagram", "instagramUrl", 600)}{field("YouTube", "youtubeUrl", 600)}
      {field("Facebook", "facebookUrl", 600)}{field("TikTok", "tiktokUrl", 600)}
      {field("Título para buscadores", "seoTitle", 160)}{field("Descrição para buscadores", "seoDescription", 320, true)}
      {field("Texto do rodapé", "footerText", 500, true)}
    </div>{message ? <p className="form-message" role="status">{message}</p> : null}<div className="editor-actions">{dirty ? <span className="unsaved-indicator">Alterações ainda não salvas</span> : null}<button className="admin-button primary" disabled={busy} type="button" onClick={() => void save()}><Save size={16} /> Salvar configurações</button></div></section>
  </>;
}
