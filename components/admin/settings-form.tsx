"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { saveSettingsAction } from "@/lib/actions/settings";
import type { SiteSettings } from "@/lib/content/types";
import { FieldInfo } from "./field-info";

export function SettingsForm({ initial }: { initial: SiteSettings }) {
  const [form, setForm] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { const listener = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; addEventListener("beforeunload", listener); return () => removeEventListener("beforeunload", listener); }, [dirty]);
  const update = (key: keyof SiteSettings, value: string) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); };
  async function save() { setBusy(true); setMessage(""); const result = await saveSettingsAction(form); if (result.ok) { setForm(result.data); setDirty(false); setMessage(result.message || "Salvo."); } else setMessage(result.error); setBusy(false); }
  const field = (label: string, key: keyof SiteSettings, maxLength: number, textarea = false) => <label className="field"><span className="field-label-content">{label}<FieldInfo label={label}>{({ groupName: "É o nome institucional mostrado no cabeçalho, rodapé e demais áreas públicas.", tagline: "É a frase curta exibida junto ao nome do grupo no cabeçalho.", heroTitle: "É o título de destaque exibido na primeira seção da página inicial.", heroText: "É o texto de apresentação que acompanha o título principal da página inicial.", aboutTitle: "É o título da seção institucional que apresenta o grupo.", aboutText: "É o texto institucional exibido na seção sobre o grupo.", contactEmail: "É o e-mail de contato exibido aos visitantes do site.", whatsapp: "É o número usado para gerar o link direto de conversa no WhatsApp; inclua o DDI, sem espaços.", instagramUrl: "É o endereço completo do perfil do Instagram exibido nas redes sociais.", youtubeUrl: "É o endereço completo do canal ou perfil do YouTube exibido nas redes sociais.", facebookUrl: "É o endereço completo da página do Facebook exibida nas redes sociais.", tiktokUrl: "É o endereço completo do perfil do TikTok exibido nas redes sociais.", seoTitle: "É o título que pode aparecer nos resultados de buscadores e na aba do navegador.", seoDescription: "É o resumo que pode aparecer nos resultados de buscadores.", footerText: "É o texto informativo mostrado no rodapé de todas as páginas públicas." } as Record<string, string>)[key]}</FieldInfo></span>{textarea ? <textarea value={String(form[key] || "")} maxLength={maxLength} onChange={(event) => update(key, event.target.value)} /> : <input value={String(form[key] || "")} maxLength={maxLength} onChange={(event) => update(key, event.target.value)} />}<small>{String(form[key] || "").length} / {maxLength}</small></label>;
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
