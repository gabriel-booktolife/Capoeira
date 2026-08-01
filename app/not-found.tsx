import Link from "next/link";
export default function NotFound() { return <main className="standalone-state dark-section"><p className="eyebrow">Erro 404</p><h1>Esta página saiu da roda.</h1><p>O endereço pode ter mudado ou o conteúdo ainda não foi publicado.</p><Link className="button primary" href="/">Voltar ao início</Link></main>; }
