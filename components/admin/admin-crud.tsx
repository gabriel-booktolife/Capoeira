"use client";

import Link from "next/link";
import { ArrowDown, ArrowLeft, ArrowUp, CalendarDays, Clock3, Eye, FilePenLine, ImagePlus, MapPinned, Plus, RotateCcw, Save, Search, Send, Sparkles, Trash2, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

function Field({ label, name, value, onChange, type = "text", wide = false, textarea = false, placeholder, maxLength, error, hint, min }: {
  label: string; name: string; value: string | number; onChange: (value: string) => void; type?: string; wide?: boolean; textarea?: boolean; placeholder?: string; maxLength?: number; error?: string; hint?: string; min?: string;
}) {
  return <label className={wide ? "field wide" : "field"}><span>{label}</span>{textarea ? <textarea name={name} value={String(value)} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /> : <input name={name} type={type} value={value} min={min} maxLength={maxLength} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />}{hint ? <small>{hint}</small> : null}{maxLength ? <small className="character-count">{String(value).length} / {maxLength}</small> : null}{error ? <p className="field-error">{error}</p> : null}</label>;
}

function FormSection({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return <section className="form-section wide"><header className="form-section-heading"><span className="form-section-icon">{icon}</span><div><h3>{title}</h3><p>{description}</p></div></header><div className="form-grid">{children}</div></section>;
}

function isoDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(date);
}

function readableDate(value: string) {
  if (!value) return "Nenhuma data selecionada";
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "Data inválida";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "UTC" }).format(date);
}

function DateField({ label, name, value, onChange, error, optional = false }: { label: string; name: string; value: string; onChange: (value: string) => void; error?: string; optional?: boolean }) {
  const [selectedYear = "", selectedMonth = "", selectedDay = ""] = value ? value.split("-") : [];
  const today = isoDate().split("-");
  const currentYear = Number(today[0]);
  const daysInMonth = selectedYear && selectedMonth
    ? new Date(Number(selectedYear), Number(selectedMonth), 0).getDate()
    : 31;
  const years = Array.from(new Set([
    ...Array.from({ length: 26 }, (_, index) => String(currentYear - 10 + index)),
    ...(selectedYear ? [selectedYear] : []),
  ])).sort();
  const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  function updatePart(part: "day" | "month" | "year", nextValue: string) {
    if (!nextValue) {
      onChange("");
      return;
    }
    const next = value ? [selectedYear, selectedMonth, selectedDay] : [...today];
    const index = part === "year" ? 0 : part === "month" ? 1 : 2;
    next[index] = nextValue;
    const maxDay = new Date(Number(next[0]), Number(next[1]), 0).getDate();
    if (Number(next[2]) > maxDay) next[2] = String(maxDay).padStart(2, "0");
    onChange(next.join("-"));
  }

  return <div className="field date-field"><span>{label}{optional ? " (opcional)" : ""}</span><div className="date-select-grid"><label><small>Dia</small><select aria-label={`${label}: dia`} name={`${name}Day`} value={selectedDay} onChange={(event) => updatePart("day", event.target.value)}><option value="">Dia</option>{Array.from({ length: daysInMonth }, (_, index) => String(index + 1).padStart(2, "0")).map((day) => <option key={day} value={day}>{day}</option>)}</select></label><label><small>Mês</small><select aria-label={`${label}: mês`} name={`${name}Month`} value={selectedMonth} onChange={(event) => updatePart("month", event.target.value)}><option value="">Mês</option>{months.map((month, index) => { const number = String(index + 1).padStart(2, "0"); return <option key={month} value={number}>{month}</option>; })}</select></label><label><small>Ano</small><select aria-label={`${label}: ano`} name={`${name}Year`} value={selectedYear} onChange={(event) => updatePart("year", event.target.value)}><option value="">Ano</option>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><p className="date-readable"><CalendarDays size={16} aria-hidden="true" />{readableDate(value)}</p><div className="date-shortcuts" aria-label="Escolhas rápidas de calendário"><button type="button" onClick={() => onChange(isoDate())}>Hoje</button><button type="button" onClick={() => onChange(isoDate(1))}>Amanhã</button><button type="button" onClick={() => onChange(isoDate(7))}>Em 1 semana</button>{value ? <button type="button" onClick={() => onChange("")}>Limpar</button> : null}</div>{error ? <p className="field-error">{error}</p> : null}</div>;
}

function WeekdaySelector({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  return <div className="field wide"><span className="field-label">Em quais dias acontece?</span><div className="weekday-grid">{weekDays.map((day) => <label className={value.includes(day) ? "selected" : ""} key={day}><input type="checkbox" checked={value.includes(day)} onChange={(event) => onChange(event.target.checked ? [...value, day] : value.filter((item) => item !== day))} />{day}</label>)}</div></div>;
}

function ScheduleEditor({ items, onChange }: { items: ScheduleItem[]; onChange: (items: ScheduleItem[]) => void }) {
  const add = () => onChange([...items, { id: crypto.randomUUID(), day: "Seg", startTime: "", endTime: "", label: "" }]);
  return <div className="schedule-editor wide"><div className="schedule-editor-heading"><div><h4>Horários detalhados</h4><p>Adicione uma linha para cada turma ou faixa de horário.</p></div><button className="admin-button" type="button" onClick={add}><Plus size={16} /> Adicionar horário</button></div>{items.length ? <div className="schedule-rows">{items.map((item) => <div className="schedule-row" key={item.id}><label className="field"><span>Dia</span><select value={item.day} onChange={(event) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, day: event.target.value as WeekDay } : entry))}>{weekDays.map((day) => <option key={day}>{day}</option>)}</select></label><Field label="Começa" name="startTime" type="time" value={item.startTime || ""} onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, startTime: value } : entry))} /><Field label="Termina" name="endTime" type="time" min={item.startTime || undefined} value={item.endTime || ""} onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, endTime: value } : entry))} /><Field label="Turma ou observação" name="label" value={item.label || ""} placeholder="Ex.: Adultos" onChange={(value) => onChange(items.map((entry) => entry.id === item.id ? { ...entry, label: value } : entry))} /><button className="icon-button danger" type="button" onClick={() => onChange(items.filter((entry) => entry.id !== item.id))} aria-label="Remover horário"><Trash2 size={17} /></button></div>)}</div> : <div className="schedule-empty"><Clock3 size={22} /><span>Nenhum horário detalhado. Use o botão acima para começar.</span></div>}</div>;
}

function TeamSelector({ options, value, onChange }: { options: Option[]; value: string[]; onChange: (value: string[]) => void }) {
  return <div className="field wide" role="group" aria-labelledby="responsible-team-label"><span className="field-label" id="responsible-team-label">Responsáveis</span>{options.length ? <div className="option-chip-grid">{options.map((option) => { const selected = value.includes(option.id); return <label className={selected ? "selected" : ""} key={option.id}><input type="checkbox" checked={selected} onChange={(event) => onChange(event.target.checked ? [...value, option.id] : value.filter((id) => id !== option.id))} /><Users size={15} aria-hidden="true" />{option.label}</label>; })}</div> : <p className="inline-empty">Cadastre e publique integrantes da equipe para selecioná-los aqui.</p>}</div>;
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
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const editorRef = useRef<HTMLElement>(null);

  useEffect(() => { const listener = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", listener); return () => window.removeEventListener("beforeunload", listener); }, [dirty]);

  const filtered = useMemo(() => items.filter((item) => {
    const title = contentTitle(config.kind, item).toLowerCase();
    return title.includes(query.toLowerCase()) && (statusFilter === "all" || item.status === statusFilter);
  }), [config.kind, items, query, statusFilter]);

  const update = (key: string, value: unknown) => { setForm((current) => ({ ...current, [key]: value })); setDirty(true); setErrors((current) => ({ ...current, [key]: [] })); };
  const showEditor = () => { setMobileEditorOpen(true); requestAnimationFrame(() => editorRef.current?.scrollIntoView({ block: "start" })); };
  const select = (item: AnyContent) => { if (dirty && !window.confirm("Descartar alterações não salvas?")) return; setEditing(item); setForm({ ...emptyContent(config.kind), ...item }); setDirty(false); setMessage(""); setErrors({}); showEditor(); };
  const createNew = () => { if (dirty && !window.confirm("Descartar alterações não salvas?")) return; setEditing(null); setForm(emptyContent(config.kind)); setDirty(false); setMessage(""); setErrors({}); showEditor(); };

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
    if (result.ok) { setItems((current) => current.filter((item) => item.id !== target.id)); setEditing(null); setForm(emptyContent(config.kind)); setDirty(false); setErrors({}); setMessage(result.message || "Excluído."); setMobileEditorOpen(false); }
    else { setMessage(`${result.error} A exclusão ficou pendente e pode ser tentada novamente.`); setItems((current) => current.map((item) => item.id === target.id ? { ...item, status: "deleting" } : item)); }
    setBusy(false);
  }

  const err = (key: string) => errors[key]?.[0];
  const media = (form.media as MediaItem[]) || [];
  const photo = form.photo as MediaItem | null | undefined;
  const blocks = (form.blocks as StoryBlock[]) || [];
  const newArticle = config.kind === "publication" || config.kind === "initiative" ? "Nova" : "Novo";

  return <>
    <header className="admin-page-header"><div><span className="admin-eyebrow">Conteúdo</span><h1>{config.label}</h1><p>Crie rascunhos, revise os detalhes e publique quando estiver pronto.</p></div><button className="admin-button primary" type="button" onClick={createNew}><Plus size={18} /> {newArticle} {config.singular.toLowerCase()}</button></header>
    <div className="admin-toolbar">
      <label className="field admin-search"><span className="field-label">Buscar</span><span className="search-input-shell"><Search size={17} /><input className="admin-input" value={query} placeholder={`Buscar em ${config.label.toLowerCase()}…`} onChange={(event) => setQuery(event.target.value)} /></span></label>
      <label className="field admin-filter"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="draft">Rascunhos</option><option value="published">Publicados</option><option value="deleting">Exclusão pendente</option></select></label>
    </div>
    <div className={`admin-crud${mobileEditorOpen ? " editor-is-open" : ""}`}>
      <aside className="admin-list-panel"><div className="admin-list-summary"><strong>{filtered.length}</strong><span>{filtered.length === 1 ? "item encontrado" : "itens encontrados"}</span></div><div className="admin-list">{filtered.length ? filtered.map((item) => <div key={item.id} className={editing?.id === item.id ? "admin-list-item active" : "admin-list-item"}><button type="button" onClick={() => select(item)}><strong>{contentTitle(config.kind, item)}</strong><span className={`status-badge ${item.status}`}>{item.status === "published" ? "Publicado" : item.status === "deleting" ? "Exclusão pendente" : "Rascunho"}</span><span>{adminDate(item.updatedAt)}</span></button>{item.status === "deleting" ? <button className="icon-button danger" type="button" aria-label="Tentar exclusão novamente" onClick={() => void remove(item)}><RotateCcw size={15} /></button> : null}</div>) : <div className="admin-empty-state"><Search size={22} /><p>Nenhum conteúdo encontrado.</p><span>Tente outro termo ou filtro.</span></div>}</div></aside>
      <section ref={editorRef} className={`admin-editor${mobileEditorOpen ? " is-mobile-open" : ""}`}>
        <button className="admin-editor-mobile-close" type="button" onClick={() => setMobileEditorOpen(false)}><ArrowLeft size={17} /> Voltar para a lista</button>
        <div className="editor-heading"><div><span>{editing ? "Editando" : "Novo conteúdo"}</span><h2>{editing ? contentTitle(config.kind, editing) : `${newArticle} ${config.singular.toLowerCase()}`}</h2></div>{editing?.slug ? <Link className="admin-button" href={`/admin/preview/${config.collection}/${editing.id}`} target="_blank"><Eye size={16} /> Abrir prévia</Link> : null}</div>
        <div className="editor-form">
          <FormSection icon={<FilePenLine size={19} />} title="Informações principais" description="Comece pelo conteúdo que identifica esta página.">
            {config.kind === "team" || config.kind === "location" ? <Field label="Nome" name="name" value={String(form.name || "")} maxLength={config.kind === "team" ? 120 : 160} onChange={(value) => update("name", value)} error={err("name")} /> : <Field label="Título" name="title" value={String(form.title || "")} maxLength={160} onChange={(value) => update("title", value)} error={err("title")} />}
            <Field label="URL amigável (slug)" name="slug" value={String(form.slug || "")} maxLength={96} placeholder="Gerada automaticamente a partir do título" hint="Você pode deixar vazio para gerar automaticamente." onChange={(value) => update("slug", value)} error={err("slug")} />
            {["publication", "event", "initiative", "location"].includes(config.kind) ? <Field label="Descrição" name="description" value={String(form.description || "")} maxLength={config.kind === "location" ? 3000 : 6000} textarea wide placeholder="Conte o que as pessoas precisam saber…" onChange={(value) => update("description", value)} error={err("description")} /> : null}
            {config.kind === "story" ? <Field label="Resumo" name="summary" value={String(form.summary || "")} maxLength={600} textarea wide placeholder="Uma introdução breve para este capítulo…" onChange={(value) => update("summary", value)} /> : null}
          </FormSection>

          {config.kind === "team" ? <FormSection icon={<Users size={19} />} title="Perfil no grupo" description="Apresente a trajetória e o papel desta pessoa."><Field label="Graduação" name="graduation" value={String(form.graduation || "")} maxLength={120} onChange={(value) => update("graduation", value)} /><Field label="Papel no grupo" name="role" value={String(form.role || "")} maxLength={120} onChange={(value) => update("role", value)} /><Field label="Idade (opcional)" name="age" type="number" value={String(form.age ?? "")} onChange={(value) => update("age", value)} /><Field label="História" name="history" value={String(form.history || "")} maxLength={6000} textarea wide placeholder="Conte a história desta pessoa com a capoeira…" onChange={(value) => update("history", value)} error={err("history")} /></FormSection> : null}

          {config.kind === "story" ? <FormSection icon={<FilePenLine size={19} />} title="Capítulo" description="Organize a narrativa em blocos de texto e imagem."><StoryEditor blocks={blocks} collectionId={editing?.id || null} onChange={(value) => update("blocks", value)} /></FormSection> : null}

          {config.kind === "publication" || config.kind === "event" ? <FormSection icon={<CalendarDays size={19} />} title={config.kind === "event" ? "Data e horário do evento" : "Data da publicação"} description={config.kind === "event" ? "Escolha a data primeiro e depois informe o intervalo de horário." : "A data organiza a publicação no site; o horário é opcional."}><DateField label="Data" name="date" value={String(form.date || "")} onChange={(value) => update("date", value)} error={err("date")} optional={config.kind === "publication"} /><div className="time-fields"><Field label="Horário inicial" name="time" type="time" value={String(form.time || "")} onChange={(value) => update("time", value)} />{config.kind === "event" ? <Field label="Horário final" name="endTime" type="time" min={String(form.time || "") || undefined} value={String(form.endTime || "")} onChange={(value) => update("endTime", value)} /> : null}</div></FormSection> : null}

          {config.kind === "event" || config.kind === "publication" ? <FormSection icon={<MapPinned size={19} />} title="Local e acesso" description={config.kind === "event" ? "Use um local cadastrado ou informe um endereço específico." : "Informe onde aconteceu, quando fizer sentido."}>{config.kind === "event" ? <label className="field"><span>Local cadastrado</span><select value={String(form.locationId || "")} onChange={(event) => update("locationId", event.target.value)}><option value="">Usar endereço avulso</option>{locationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}<Field label="Endereço" name="address" value={String(form.address || "")} maxLength={500} wide={config.kind === "publication"} placeholder="Rua, número, bairro e cidade" onChange={(value) => update("address", value)} />{config.kind === "event" ? <Field label="Link de inscrição" name="registrationUrl" type="url" value={String(form.registrationUrl || "")} placeholder="https://…" onChange={(value) => update("registrationUrl", value)} error={err("registrationUrl")} /> : null}</FormSection> : null}

          {config.kind === "initiative" || config.kind === "location" ? <FormSection icon={<Clock3 size={19} />} title="Local e horários" description="Defina o endereço, os dias recorrentes e os horários de cada turma.">{config.kind === "initiative" ? <label className="field"><span>Local cadastrado</span><select value={String(form.locationId || "")} onChange={(event) => update("locationId", event.target.value)}><option value="">Usar endereço avulso</option>{locationOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}</select></label> : null}<Field label="Endereço" name="address" value={String(form.address || "")} maxLength={500} wide={config.kind === "location"} placeholder="Rua, número, bairro e cidade" onChange={(value) => update("address", value)} error={err("address")} />{config.kind === "location" ? <Field label="Link do mapa" name="mapUrl" type="url" value={String(form.mapUrl || "")} placeholder="https://maps.google.com/…" onChange={(value) => update("mapUrl", value)} error={err("mapUrl")} /> : null}<WeekdaySelector value={(form.days as string[]) || []} onChange={(value) => update("days", value)} /><ScheduleEditor items={(form.scheduleItems as ScheduleItem[]) || []} onChange={(value) => update("scheduleItems", value)} /><Field label="Observação geral sobre horários (opcional)" name="schedule" value={String(form.schedule || "")} maxLength={300} wide placeholder="Ex.: Chegue 15 minutos antes para o aquecimento." onChange={(value) => update("schedule", value)} /></FormSection> : null}

          {config.kind === "initiative" ? <FormSection icon={<Users size={19} />} title="Equipe responsável" description="Selecione uma ou mais pessoas com um toque."><TeamSelector options={teamOptions} value={(form.teamIds as string[]) || []} onChange={(value) => update("teamIds", value)} /><Field label="Link de contato" name="contactUrl" type="url" value={String(form.contactUrl || "")} wide placeholder="https://…" onChange={(value) => update("contactUrl", value)} error={err("contactUrl")} /></FormSection> : null}

          {config.kind === "initiative" ? <FormSection icon={<Sparkles size={19} />} title="Aviso temporário" description="Use esta área apenas para uma informação que deve expirar automaticamente."><Field label="Título do aviso" name="noticeTitle" value={String(form.noticeTitle || "")} maxLength={160} onChange={(value) => update("noticeTitle", value)} /><DateField label="Visível até" name="noticeExpiresAt" value={String(form.noticeExpiresAt || "")} optional onChange={(value) => update("noticeExpiresAt", value)} /><Field label="Texto do aviso" name="noticeText" value={String(form.noticeText || "")} maxLength={2000} textarea wide onChange={(value) => update("noticeText", value)} /></FormSection> : null}

          <FormSection icon={<Sparkles size={19} />} title="Exibição" description="Controle o destaque e a posição deste conteúdo."><label className="feature-toggle"><input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => update("featured", event.target.checked)} /><span><strong>Destacar na página inicial</strong><small>O conteúdo ganha mais visibilidade quando estiver publicado.</small></span></label><Field label="Ordem manual" name="sortOrder" type="number" value={Number(form.sortOrder || 0)} hint="Números menores aparecem primeiro." onChange={(value) => update("sortOrder", value)} /></FormSection>

          {config.kind === "team" ? <FormSection icon={<ImagePlus size={19} />} title="Foto" description="Salve o primeiro rascunho antes de enviar a imagem."><MediaUploader collection="team" documentId={editing?.id || null} target="photo" media={photo ? [photo] : []} onChange={(value) => update("photo", value[0] || null)} /></FormSection> : null}
          {!["team", "story"].includes(config.kind) ? <FormSection icon={<ImagePlus size={19} />} title="Mídias" description="Salve o primeiro rascunho antes de enviar arquivos."><MediaUploader collection={config.collection} documentId={editing?.id || null} target="media" media={media} multiple accept={config.kind === "publication" ? "image/*,video/*" : "image/*"} onChange={(value) => update("media", value)} /></FormSection> : null}
        </div>
        {message ? <p className={message.toLowerCase().includes("erro") || message.toLowerCase().includes("precisa") || message.toLowerCase().includes("informe") ? "form-message error" : "form-message"} role="status">{message}</p> : null}
        <div className="editor-actions">{dirty ? <span className="unsaved-indicator">Alterações ainda não salvas</span> : <span className="saved-indicator">Tudo salvo</span>}{editing ? <button className="admin-button danger" type="button" disabled={busy} onClick={() => void remove()}><Trash2 size={16} /> Excluir</button> : null}<button className="admin-button" type="button" disabled={busy} onClick={() => void save("draft")}><Save size={16} /> Salvar rascunho</button><button className="admin-button primary" type="button" disabled={busy} onClick={() => void save("published")}><Send size={16} /> Publicar</button></div>
      </section>
    </div>
  </>;
}
