# Auditoria adversarial das regras

Revisão posterior à implementação das regras v2.

| Tentativa | Resultado esperado | Evidência |
|---|---|---|
| Ler rascunho por ID sem autenticação | Negado | Teste do Emulator Suite |
| Listar conteúdo sem `status == published` | Negado | Teste do Emulator Suite |
| Listar com o filtro público | Apenas publicados | Teste do Emulator Suite |
| Usar claim `admin` para ler rascunho pelo SDK web | Negado | Teste do Emulator Suite |
| Criar/alterar documento com claim `admin` | Negado | Teste do Emulator Suite |
| Ler `settings/private` | Negado | Teste do Emulator Suite |
| Subir staging no UID de outro admin | Negado | Teste do Emulator Suite |
| Subir executável ou escrever em pasta definitiva | Negado | Teste do Emulator Suite |
| Ler staging anonimamente | Negado | Teste do Emulator Suite |
| Escalar papel editando `admins/{uid}` | Negado por fallback e write explícito | Inspeção das regras |
| Enumerar pastas definitivas de mídia | Negado (`list: false`) | Inspeção das regras |

O Admin SDK é a única fronteira de escrita do Firestore e de mídia definitiva. Por isso, os validators de domínio do servidor e as verificações de sessão são parte obrigatória do modelo de segurança; as regras do SDK web permanecem em deny-by-default.
