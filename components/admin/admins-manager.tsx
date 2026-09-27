"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
import type { AdminRecord } from "@/lib/content/types";
import { FieldInfo } from "./field-info";

export function AdminsManager({ initial, currentUid }: { initial: AdminRecord[]; currentUid: string }) {
  const [admins, setAdmins] = useState(initial);
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  async function create(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const result = await httpsCallable<typeof form, { uid: string; email: string }>(functions, "createAdminUser")(form); setAdmins((current) => [...current, { uid: result.data.uid, email: result.data.email, displayName: form.displayName || form.email, active: true, role: "admin" }]); setForm({ displayName: "", email: "", password: "" }); setMessage("Administrador criado com sucesso."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível criar a conta."); }
    finally { setBusy(false); }
  }
  async function toggle(admin: AdminRecord) {
    if (admin.uid === currentUid || admin.role === "superadmin") return;
    setBusy(true); setMessage("");
    try { await httpsCallable(functions, "setAdminActive")({ uid: admin.uid, active: !admin.active }); setAdmins((current) => current.map((item) => item.uid === admin.uid ? { ...item, active: !item.active } : item)); setMessage(admin.active ? "Administrador desativado." : "Administrador reativado."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a conta."); }
    finally { setBusy(false); }
  }
  return <><header className="admin-page-header"><div><h1>Administradores</h1><p>Controle quem pode editar e publicar conteúdo.</p></div></header>
    <section className="admin-editor"><h2>Novo administrador</h2><form className="form-grid" onSubmit={create}><label className="field"><span className="field-label-content">Nome<FieldInfo label="Nome">É o nome de identificação exibido na lista de administradores.</FieldInfo></span><input value={form.displayName} maxLength={120} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label className="field"><span className="field-label-content">E-mail<FieldInfo label="E-mail">Será usado pelo administrador para acessar a área administrativa.</FieldInfo></span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field"><span className="field-label-content">Senha temporária<FieldInfo label="Senha temporária">É a senha inicial da nova conta. Use ao menos 12 caracteres e compartilhe-a de forma segura.</FieldInfo></span><input type="password" required minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>Use ao menos 12 caracteres.</small></label><div className="field"><span>&nbsp;</span><button className="admin-button primary" disabled={busy}>Criar administrador</button></div></form></section>
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <section className="admins-list"><header className="admins-list-heading"><div><h2>Administradores cadastrados</h2><p>{admins.length === 1 ? "1 pessoa com acesso à administração." : `${admins.length} pessoas com acesso à administração.`}</p></div></header>{admins.length ? <table className="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ação</th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.uid}><td data-label="Nome"><span className="admin-table-text" title={admin.displayName}>{admin.displayName}</span></td><td data-label="E-mail"><span className="admin-table-text" title={admin.email}>{admin.email}</span></td><td data-label="Papel"><span className="admin-role">{admin.role === "superadmin" ? "Superadmin" : "Admin"}</span></td><td data-label="Status"><span className={`admin-status ${admin.active ? "active" : "inactive"}`}>{admin.active ? "Ativo" : "Inativo"}</span></td><td data-label="Ação"><button className={`admin-button${admin.active ? " danger" : ""}`} disabled={busy || admin.uid === currentUid || admin.role === "superadmin"} type="button" onClick={() => void toggle(admin)}>{admin.active ? "Desativar" : "Reativar"}</button></td></tr>)}</tbody></table> : <p className="admin-empty-list">Nenhum administrador cadastrado.</p>}</section>
  </>;
}
