# Backlog do Projeto - Sistema de Ponto Facial

## Status das Tarefas
- [ ] **Pendente**
- [/] **Em Progresso**
- [x] **Concluído**

---

## 1. Arquitetura e Organização
- [x] Copiar arquivos de especificação (`PROJECT_SPEC.md` e `schema.sql`) para a raiz do repositório.
- [x] Criar e manter atualizado o `backlog.md`.

## 2. Configuração do Supabase
- [x] Criar `JS/SUPABASE.js` para inicializar o cliente Supabase usando CDN e credenciais (URL e Publishable Key).
- [x] Validar conexão e RLS (Row Level Security) para consultas e inserções.

## 3. Interface do Usuário (Totem UI)
- [x] Criar `index.html` com estrutura semântica HTML5 para Totem de Ponto (matrícula, botões de tipo de batida, visualizador de câmera, indicador de status online/offline e modal de comprovante).
- [x] Criar `CSS/style.css` com Custom Properties, CSS Grid e Flexbox para layout moderno e otimizado para Totens.

## 4. Funcionalidades do Front-End (JavaScript)
- [x] Criar `JS/camera.js` para controle da câmera via MediaDevices API, com suporte a captura de imagem e fallback.
- [x] Criar `JS/ponto.js` com regras de negócio:
  - Validar tolerância de horários.
  - Verificar a sequência das batidas (ENTRADA -> SAIDA_ALMOCO -> RETORNO_ALMOCO -> SAIDA).
  - Gerar Hash SHA-256 de comprovante de ponto.
- [x] Criar `JS/offline.js` para armazenamento em LocalStorage das batidas efetuadas sem internet e sincronização automática quando reestabelecida a conexão.
- [x] Criar `JS/app.js` integrando interface, câmera, regras de ponto, armazenamento offline e Supabase.

## 5. Testes e Validações
- [x] Testar fluxo de registro online (funcionário ativo, jornada e inserção no banco).
- [x] Testar fluxo de registro offline (salvamento local e sincronização automática ao voltar a ficar online).
- [x] Testar captura da foto da câmera.
