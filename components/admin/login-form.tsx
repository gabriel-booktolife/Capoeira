"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

const authMessages: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/user-disabled": "Esta conta administrativa está desativada.",
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage(""); setIsError(false);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const idToken = await credential.user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Não foi possível iniciar a sessão.");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      setMessage(authMessages[code] || (error instanceof Error ? error.message : "Não foi possível entrar."));
      setIsError(true);
      await signOut(auth).catch(() => undefined);
    } finally { setBusy(false); }
  }

  async function resetPassword() {
    if (!email.trim()) { setMessage("Informe seu e-mail para receber a recuperação."); setIsError(true); return; }
    setBusy(true); setMessage("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Enviamos as instruções de recuperação para o seu e-mail."); setIsError(false);
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      setMessage(authMessages[code] || "Não foi possível enviar a recuperação."); setIsError(true);
    } finally { setBusy(false); }
  }

  return <div className="auth-panel">
    <div className="auth-visual"><h1>Cultura que se<br />cuida por dentro.</h1></div>
    <div className="auth-form-wrap">
      <Image src="/media/logo.webp" alt="Chão Batido" width={58} height={75} priority />
      <h2>Painel do grupo</h2>
      <p>Entre para organizar conteúdos, agenda, equipe e informações públicas.</p>
      <form className="form-stack" onSubmit={login}>
        <label className="field"><span>E-mail</span><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="field"><span>Senha</span><input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} /></label>
        {message ? <p className={`form-message${isError ? " error" : ""}`} role="status">{message}</p> : null}
        <button className="admin-button primary" disabled={busy} type="submit">{busy ? "Entrando…" : "Entrar no painel"}</button>
        <button className="text-button" disabled={busy} type="button" onClick={() => void resetPassword()}>Esqueci minha senha</button>
      </form>
    </div>
  </div>;
}
