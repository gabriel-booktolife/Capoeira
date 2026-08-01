# Chão Batido

Site institucional e CMS do Chão Batido, construído com Next.js App Router, TypeScript e Firebase.

## Desenvolvimento

Requer Node.js 22 e Java 21 para os emuladores.

```bash
npm install
npm --prefix functions install
npm run dev
```

O desenvolvimento usa diretamente o projeto Firebase `capoeira-17aee`. Antes
da primeira execução, configure as Application Default Credentials:

```bash
gcloud auth application-default login
```

O login da CLI do Firebase e as Application Default Credentials são mecanismos
diferentes. Nunca adicione uma chave de conta de serviço ao repositório.

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

## Recuperação do superadministrador

Se as custom claims e o registro `admins` ficarem dessincronizados, restaure a
conta existente com ADC configurada e confirmação explícita do projeto:

```bash
npm run admin:bootstrap -- \
  --email=<email-do-superadministrador> \
  --confirm=capoeira-17aee
```

O comando não cria usuários nem altera senhas. Ele restaura as permissões
somente da conta informada, preserva claims existentes e sincroniza Auth e Firestore.

## Executar com Docker Compose

O Compose executa a aplicação Next.js contra o Firebase real. Auth, Firestore,
Storage e Functions continuam sendo os serviços gerenciados do projeto; nenhum
emulador é iniciado.

1. Crie a pasta `secrets` e coloque nela a chave de uma conta de serviço como
   `firebase-service-account.json`.
2. Copie `.env.docker.example` para `.env.docker` e ajuste a URL pública e, se
   necessário, o caminho da credencial.
3. Crie uma vez a rede compartilhada pelos dois projetos Compose:

```bash
docker network inspect chao-proxy >/dev/null 2>&1 || docker network create chao-proxy
```

4. Inicie a aplicação:

```bash
docker compose --env-file .env.docker up -d --build
```

5. Inicie o load balancer separadamente:

```bash
docker compose -f docker-compose.load-balancer.yml up -d
```

O load balancer não lê arquivos de ambiente nem depende de variáveis. O domínio
`capoeira.booktolife.com.br`, a porta HTTP `80`, a rede `chao-proxy` e o backend
`capoeira-web:3000` ficam definidos diretamente nos arquivos do Nginx e do
Compose. Hosts desconhecidos são recusados.

A porta `3000` do Next não é publicada no host. Os containers usam
`restart: unless-stopped`, reiniciando após falhas e quando o Docker voltar a
iniciar, exceto se forem parados manualmente.

Para acompanhar o estado e os logs:

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs -f web
docker compose -f docker-compose.load-balancer.yml ps
docker compose -f docker-compose.load-balancer.yml logs -f nginx
```

O DNS utilizado é `capoeira.booktolife.com.br`. O Nginx escuta HTTP e acessa o
Next diretamente pela rede privada compartilhada. A terminação TLS pode ser
adicionada posteriormente com o certificado do domínio.

Para verificar o proxy:

```bash
curl -H "Host: capoeira.booktolife.com.br" http://127.0.0.1/
```

Em uma máquina Linux, habilite também o Docker no boot do sistema:

```bash
sudo systemctl enable --now docker
```

## Produção

- Projeto Firebase: `capoeira-17aee`
- Firestore Standard `(default)`: `nam5`
- App Hosting: backend `chao-batido`, região `us-central1`
- URL principal: `https://chao-batido--capoeira-17aee.us-central1.hosted.app`
- Functions: `us-central1`

`apphosting.yaml` controla recursos de execução. O CI executa lint, tipos, testes, regras, Functions, Next e E2E; após todos os gates, um push em `main` envia um arquivo imutável do commit e aguarda o build e o rollout do App Hosting chegarem a `SUCCEEDED`.

A conta de CI possui somente administração do App Hosting, criação de objetos no bucket privado de fontes e `Service Account User` sobre a conta de runtime do backend. O Hosting clássico `capoeira-17aee.web.app` usa redirecionamento temporário 302, preserva os caminhos e mantém versões anteriores disponíveis para rollback. A troca para 301 deve ocorrer apenas depois do período de estabilização.
