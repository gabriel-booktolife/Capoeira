"use client";

import { useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase/client";
import type { AdminRecord } from "@/lib/content/types";

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
    <section className="admin-editor"><h2>Novo administrador</h2><form className="form-grid" onSubmit={create}><label className="field"><span>Nome</span><input value={form.displayName} maxLength={120} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label className="field"><span>E-mail</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field"><span>Senha temporária</span><input type="password" required minLength={12} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><small>Use ao menos 12 caracteres.</small></label><div className="field"><span>&nbsp;</span><button className="admin-button primary" disabled={busy}>Criar administrador</button></div></form></section>
    {message ? <p className="form-message" role="status">{message}</p> : null}
    <table className="admin-table"><thead><tr><th>Nome</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Ação</th></tr></thead><tbody>{admins.map((admin) => <tr key={admin.uid}><td>{admin.displayName}</td><td>{admin.email}</td><td>{admin.role === "superadmin" ? "Superadmin" : "Admin"}</td><td>{admin.active ? "Ativo" : "Inativo"}</td><td><button className={`admin-button${admin.active ? " danger" : ""}`} disabled={busy || admin.uid === currentUid || admin.role === "superadmin"} type="button" onClick={() => void toggle(admin)}>{admin.active ? "Desativar" : "Reativar"}</button></td></tr>)}</tbody></table>
  </>;
}
