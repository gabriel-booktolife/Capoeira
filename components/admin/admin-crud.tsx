"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, Plus, RotateCcw, Save, Search, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { deleteContentAction, saveContentAction } from "@/lib/actions/content";
import type { SectionConfig } from "@/lib/content/config";
import { contentTitle } from "@/lib/content/format";
import { emptyContent } from "@/lib/content/schema";
import type { AnyContent, MediaItem, ScheduleItem, StoryBlock, WeekDay } from "@/lib/content/types";
import { weekDays } from "@/lib/content/types";
import { MediaUploader } from "./media-uploader";

type Option = { id: string; label: string };

function adminDate(value: unknown) {
  if (!value) return "Ainda não salvo";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Atualizado agora" : new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function Field({ label, name, value, onChange, type = "text", wide = false, textarea = false, placeholder, maxLength, error }: {
  label: string; name: string; value: string | number; onChange: (value: string) => void; type?: string; wide?: boolean; textarea?: boolean; placeholder?: string; maxLength?: number; error?: string;
}) {
  return <label className={wide ? "field wide" : "field"}><span>{label}</span>{textarea ? <textarea name={name} value={String(value)} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input name={name} type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}{maxLength ? <small>{String(value).length} / {maxLength}</small> : null}{error ? <p className="field-error">{error}</p> : null}</label>;
}

function WeekdaySelector({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <div className="field wide"><span className="field-label">Dias da semana</span><div className="weekday-grid">{weekDays.map((day) => <label key={day}><input type="checkbox" checked={value.includes(day)} onChange={(event) => onChange(event.target.checked ? [...value, day] : value.filter((item) => item !== day))} />{day}</label>)}</div></div>;
}

function ScheduleEditor({ items, onChange }: { items: ScheduleItem[]; onChange: (items: ScheduleItem[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), day: "Seg", startTime: "", endTime: "", label: "" }]);
  return <div className="wide"><div className="editor-heading"><h2>Horários estruturados</h2><button className="admin-button" type="button" onClick={add}><Plus size={16} /> Horário</button></div>{items.map((item) => <div className="form-grid story-block" key={item.id}><label className="field"><span>Dia</span><select value={item.day} onChange={(event) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, day: event.target.value as WeekDay } : entry))}>{weekDays.map((day) => <option key={day}>{day}</option>)}</select></label><Field label="Início" name="startTime" type="time" value={item.startTime || ""} onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, startTime: value } : entry))} /><Field label="Fim" name="endTime" type="time" value={item.endTime || ""} onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, endTime: value } : entry))} /><Field label="Observação" name="label" value={item.label || ""} onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, label: value } : entry))} /><div className="wide story-block-actions"><button className="admin-button danger" type="button" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}><Trash2 size={15} /> Remover</button></div></div>)}</div>;
}

function StoryEditor({ blocks, onChange, collectionId }: { blocks: StoryBlock[]; onChange: (blocks: StoryBlock[]) => void; collectionId: string | null }) {
  function move(index: number, direction: -1 | 1) { const next = [...blocks]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; onChange(next); }
  return <div className="wide"><div className="editor-heading"><h2>Blocos da história</h2><div><button className="admin-button" type="button" onClick={() => onChange([...blocks, { id: crypto.randomUUID(), type: "text", text: "" }])}><Plus size={15} /> Texto</button> <button className="admin-button" type="button" disabled={blocks.filter((item) => item.type === "image").length >= 2} onClick={() => onChange([...blocks, { id: crypto.randomUUID(), type: "image" }])}><Plus size={15} /> Imagem</button></div></div>{blocks.map((block, index) => <div className="story-block" key={block.id}><div className="story-block-actions"><button className="admin-button" type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Mover bloco para cima"><ArrowUp size={15} /></button><button className="admin-button" type="button" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label="Mover bloco para baixo"><ArrowDown size={15} /></button><button className="admin-button danger" type="button" onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}><X size={15} /> Remover</button></div>{block.type === "text" ? <textarea value={block.text || ""} maxLength={6000} onChange={(event) => onChange(blocks.map((item) => item.id === block.id ? { ...item, text: event.target.value } : item))} aria-label="Texto da história" /> : <MediaUploader collection="stories" documentId={collectionId} target="storyBlock" blockId={block.id} media={block.media ? [block.media] : []} onChange={(media) => onChange(blocks.map((item) => item.id === block.id ? { ...item, media: media[0] } : item))} />}</div>)}</div>;
}

export function AdminCrud({ config, initialItems, teamOptions, locationOptions }: { config: SectionConfig; initialItems: AnyContent[]; teamOptions: Option[]; locationOptions: Option[] }) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<AnyContent | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(() => emptyContent(config.kind));
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => { const listener = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", listener); return () => window.removeEventListener("beforeunload", listener); }, [dirty]);

  const filtered = useMemo(() => items.filter((item) => {
    const title = contentTitle(config.kind, item).toLowerCase();
    return title.includes(query.toLowerCase()) && (statusFilter === "all" || item.status === statusFilter);
  }), [config.kind, items, query, statusFilter]);

  const update = (key: string, value: unknown) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); setErrors((current) => ({ ...current, [key]: [] })); };
  const select = (item: AnyContent) => { if (dirty && !window.confirm("Descartar alterações não salvas?")) return; setEditing(item); setForm({ ...emptyContent(config.kind), ...item }); setDirty(false); setMessage(""); setErrors({}); };
  const createNew = () => { if (dirty && !window.confirm("Descartar alterações não salvas?")) return; setEditing(null); setForm(emptyContent(config.kind)); setDirty(false); setMessage(""); setErrors({}); };

  async function save(status: "draft" | "published") {
    setBusy(true); setMessage(""); setErrors({});
    const result = await saveContentAction(config.collection, editing?.id || null, form, status);
    if (result.ok) {
      setEditing(result.data); setForm({ ...emptyContent(config.kind), ...result.data }); setDirty(false); setMessage(result.message || "Salvo.");
      setItems((current) => [result.data, ...current.filter((item) => item.id !== result.data.id)]);
    } else { setMessage(result.error); setErrors(result.fieldErrors || {}); }
    setBusy(false);
  }

  async function remove(target = editing) {
    if (!target) return;
    const title = contentTitle(config.kind, target);
    if (window.prompt(`Esta exclusão é definitiva e também removerá as mídias. Digite “${title}” para confirmar.`) !== title) return;
    setBusy(true); setMessage("Excluindo conteúdo e mídias…");
    const result = await deleteContentAction(config.collection, target.id);
    if (result.ok) { setItems((current) => current.filter((item) => item.id !== target.id)); setEditing(null); setForm(emptyContent(config.kind)); setDirty(false); setErrors({}); setMessage(result.message || "Excluído."); }
    else { setMessage(`${result.error} A exclusão ficou pendente e pode ser tentada novamente.`); setItems((current) => current.map((item) => item.id === target.id ? { ...item, status: "deleting" } : item)); }
    setBusy(false);
  }

  const err = (key: string) => errors[key]?.[0];
  const media = (form.media as MediaItem[]) || [];
  const photo = form.photo as MediaItem | null | undefined;
  const blocks = (form.blocks as StoryBlock[]) || [];

  return <>
    <header className="admin-page-header"><div><h1>{config.label}</h1><p>Crie rascunhos, revise e publique com segurança.</p></div><button className="admin-button primary" type="button" onClick={createNew}><Plus size={18} /> Novo {config.singular.toLowerCase()}</button></header>
    <div className="admin-toolbar"><label className="field admin-search"><span className="field-label">Buscar</span><span style={{ position: "relative" }}><Search size={16} style={{ position: "absolute", left: 12, top: 15 }} /><input className="admin-input" style={{ paddingLeft: 38 }} value={query} onChange={(event) => setQuery(event.target.value)} /></span></label><label className="field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos</option><option value="draft">Rascunhos</option><option value="published">Publicados</option><option value="deleting">Exclusão pendente</option></select></label></div>
    <div className="admin-crud">
      <div className="admin-list">{filtered.length ? filtered.map((item) => <div key={item.id} className={editing?.id === item.id ? "admin-list-item active" : "admin-list-item"}><button type="button" onClick={() => select(item)}><strong>{contentTitle(config.kind, item)}</strong><span className={`status-badge ${item.status}`}>{item.status === "published" ? "Publicado" : item.status === "deleting" ? "Exclusão pendente" : "Rascunho"}</span><span>{adminDate(item.updatedAt)}</span></button>{item.status === "deleting" ? <button className="admin-button danger" type="button" aria-label="Tentar exclusão novamente" onClick={() => void remove(item)}><RotateCcw size={15} /></button> : null}</div>) : <p className="form-message">Nenhum conteúdo encontrado.</p>}</div>
      <section className="admin-editor">
        <div className="editor-heading"><h2>{editing ? contentTitle(config.kind, editing) : `Novo ${config.singular.toLowerCase()}`}</h2>{editing?.slug ? <Link className="admin-button" href={`/admin/preview/${config.collection}/${editing.id}`} target="_blank"><Eye size={16} /> Prévia</Link> : null}</div>
        <div className="form-grid">
          {config.kind === "team" || config.kind === "location" ? <Field label="Nome" name="name" value={String(form.name || "")} maxLength={config.kind === "team" ? 120 : 160} onChange={(value) => update("name", value)} error={err("name")} /> : <Field label="Título" name="title" value={String(form.title || "")} maxLength={160} onChange={(value) => update("title", value)} error={err("title")} />}
          <Field label="Slug da URL" name="slug" value={String(form.slug || "")} maxLength={96} placeholder="Gerado automaticamente" onChange={(value) => update("slug", value)} error={err("slug")} />
          {config.kind === "team" ? <><Field label="Graduação" name="graduation" value={String(form.graduation || "")} maxLength={120} onChange={(value) => update("graduation", value)} /><Field label="Papel no grupo" name="role" value={String(form.role || "")} maxLength={120} onChange={(value) => update("role", value)} /><Field label="Idade (opcional)" name="age" type="number" value={String(form.age ?? "")} onChange={(value) => update("age", value)} /><Field label="História" name="history" value={String(form.history || "")} maxLength={6000} textarea wide onChange={(value) => update("history", value)} error={err("history")} /></> : null}
          {config.kind === "story" ? <><Field label="Resumo" name="summary" value={String(form.summary || "")} maxLength={600} textarea wide onChange={(value) => update("summary", value)} /><StoryEditor blocks={blocks} collectionId={editing?.id || null} onChange={(value) => update("blocks", value)} /></> : null}
          {["publication", "event", "initiative", "location"].includes(config.kind) ? <Field label="Descrição" name="description" value={String(form.description || "")} maxLength={config.kind === "location" ? 3000 : 6000} textarea wide onChange={(value) => update("description", value)} error={err("description")} /> : null}
          {config.kind === "publication" || config.kind === "event" ? <><Field label="Data" name="date" type="date" value={String(form.date || "")} onChange={(value) => update("date", value)} error={err("date")} /><Field label="Horário inicial" name="time" type="time" value={String(form.time || "")} onChange={(value) => update("time", value)} />{config.kind === "event" ? <Field label="Horário final" name="endTime" type="time" value={String(form.endTime || "")} onChange={(value) => update("endTime", value)} /> : null}<Field label="Endereço" name="address" value={String(form.address || "")} maxLength={500} wide onChange={(value) => update("address", value)} /></> : null}
          {config.kind === "event" ? <><label className="field"><span>Local cadastrado</span><select value={String(form.locationId || "")} onChange={(event) => update("locationId", event.target.value)}><option value="">Endereço avulso</option>{locationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><Field label="Link de inscrição" name="registrationUrl" type="url" value={String(form.registrationUrl || "")} onChange={(value) => update("registrationUrl", value)} error={err("registrationUrl")} /></> : null}
          {config.kind === "initiative" || config.kind === "location" ? <><Field label="Endereço" name="address" value={String(form.address || "")} maxLength={500} wide onChange={(value) => update("address", value)} error={err("address")} /><WeekdaySelector value={(form.days as string[]) || []} onChange={(value) => update("days", value)} /><Field label="Descrição livre dos horários" name="schedule" value={String(form.schedule || "")} maxLength={300} wide onChange={(value) => update("schedule", value)} /><ScheduleEditor items={(form.scheduleItems as ScheduleItem[]) || []} onChange={(value) => update("scheduleItems", value)} /></> : null}
          {config.kind === "location" ? <Field label="Link do mapa" name="mapUrl" type="url" value={String(form.mapUrl || "")} wide onChange={(value) => update("mapUrl", value)} error={err("mapUrl")} /> : null}
          {config.kind === "initiative" ? <><label className="field"><span>Local cadastrado</span><select value={String(form.locationId || "")} onChange={(event) => update("locationId", event.target.value)}><option value="">Endereço avulso</option>{locationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label><label className="field wide"><span>Responsáveis</span><select multiple value={(form.teamIds as string[]) || []} onChange={(event) => update("teamIds", Array.from(event.target.selectedOptions).map((option) => option.value))}>{teamOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select><small>Use Ctrl/Cmd para selecionar mais de uma pessoa.</small></label><Field label="Título do aviso" name="noticeTitle" value={String(form.noticeTitle || "")} maxLength={160} onChange={(value) => update("noticeTitle", value)} /><Field label="Validade do aviso" name="noticeExpiresAt" type="date" value={String(form.noticeExpiresAt || "")} onChange={(value) => update("noticeExpiresAt", value)} /><Field label="Texto do aviso" name="noticeText" value={String(form.noticeText || "")} maxLength={2000} textarea wide onChange={(value) => update("noticeText", value)} /><Field label="Link de contato" name="contactUrl" type="url" value={String(form.contactUrl || "")} wide onChange={(value) => update("contactUrl", value)} error={err("contactUrl")} /></> : null}
          <label className="checkbox-field wide"><input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => update("featured", event.target.checked)} /> Destacar este conteúdo na página inicial</label>
          <Field label="Ordem manual" name="sortOrder" type="number" value={Number(form.sortOrder || 0)} onChange={(value) => update("sortOrder", value)} />
          {config.kind === "team" ? <MediaUploader collection="team" documentId={editing?.id || null} target="photo" media={photo ? [photo] : []} onChange={(value) => update("photo", value[0] || null)} /> : null}
          {!["team", "story"].includes(config.kind) ? <MediaUploader collection={config.collection} documentId={editing?.id || null} target="media" media={media} multiple accept={config.kind === "publication" ? "image/*,video/*" : "image/*"} onChange={(value) => update("media", value)} /> : null}
        </div>
        {message ? <p className={message.toLowerCase().includes("erro") || message.toLowerCase().includes("precisa") || message.toLowerCase().includes("informe") ? "form-message error" : "form-message"}>{message}</p> : null}
        <div className="editor-actions">{dirty ? <span className="unsaved-indicator">Alterações ainda não salvas</span> : null}{editing ? <button className="admin-button danger" type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={16} /> Excluir</button> : null}<button className="admin-button" type="button" disabled={busy} onClick={() => void save("draft")}><Save size={16} /> Salvar rascunho</button><button className="admin-button primary" type="button" disabled={busy} onClick={() => void save("published")}><Send size={16} /> Publicar</button></div>
      </section>
    </div>
  </>;
}
