# Chão Batido

Site institucional e CMS do Chão Batido, construído com Next.js App Router, TypeScript e Firebase.

## Desenvolvimento

Requer Node.js 22 e Java 21 para os emuladores.

```bash
npm install
npm --prefix functions install
npm run dev
```

O site público é renderizado no servidor. O painel fica exclusivamente em `/admin`; não há link para ele na navegação pública.

## Verificação

```bash
npm run lint
npm run typecheck
npm run test
npm run test:rules
npm run test:e2e
npm run build:functions
npm run build
```

Os E2E iniciam Auth, Firestore, Storage e Functions em emuladores e cobrem login, CRUD, publicação, prévia, upload em duas fases e exclusão definitiva.

## Migração v2

O dry-run é obrigatório e não altera recursos remotos:

```bash
npm run migration:dry-run
```

Ele grava um backup e o manifesto ignorados pelo Git em `.migration-backups/`. A aplicação exige a confirmação do ID do projeto e mantém os órfãos:

```bash
npm run migration:apply
```

Uma limpeza futura só remove os caminhos exatos de um manifesto e exige confirmação adicional:

```bash
node scripts/clean-orphan-media.mjs \
  --manifest=.migration-backups/<execucao>/migration-manifest.json \
  --apply --confirm=delete-listed-orphans
```

## Produção

- Projeto Firebase: `capoeira-17aee`
- Firestore Standard `(default)`: `nam5`
- App Hosting: backend `chao-batido`, região `us-central1`
- URL principal: `https://chao-batido--capoeira-17aee.us-central1.hosted.app`
- Functions: `us-central1`

`apphosting.yaml` controla recursos de execução. O CI executa lint, tipos, testes, regras, Functions, Next e E2E; após todos os gates, um push em `main` envia um arquivo imutável do commit e aguarda o build e o rollout do App Hosting chegarem a `SUCCEEDED`.

A conta de CI possui somente administração do App Hosting, criação de objetos no bucket privado de fontes e `Service Account User` sobre a conta de runtime do backend. O Hosting clássico `capoeira-17aee.web.app` usa redirecionamento temporário 302, preserva os caminhos e mantém versões anteriores disponíveis para rollback. A troca para 301 deve ocorrer apenas depois do período de estabilização.
