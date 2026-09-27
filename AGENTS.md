# Instruções para o projeto Capoeira

Este diretório é o submódulo do repositório GitHub Capoeira. Código, Dockerfile
e Compose próprios da aplicação pertencem aqui. Não mantenha uma cópia de
Nginx, Certbot ou outro serviço compartilhado dentro deste projeto.

Leia as regras do agregador em [`../../AGENTS.md`](../../AGENTS.md) e o mapa de
infraestrutura em [`../../resources/AGENTS.md`](../../resources/AGENTS.md) e
[`../../resources/app_needs.json`](../../resources/app_needs.json). O projeto usa
o Nginx central em `../../resources/nginx/`; rotas, TLS e certificados são
mantidos lá e em `../../resources/certbot/` (estado local ignorado pelo Git).

Se mudar Compose, alias de rede ou necessidades de recursos, atualize o mapa
`app_needs.json` e as rotas centrais no repositório agregador. Mantenha credenciais
Firebase e outros segredos fora do Git.

Para adicionar uma rota pública ou emitir o certificado do projeto, siga
[../../resources/nginx/AGENTS.md](../../resources/nginx/AGENTS.md).
