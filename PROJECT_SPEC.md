# 📋 SPEC: Sistema de Controle de Ponto e Frequência

## 1. Diretrizes de Arquitetura & Stack W3C (No-Build)
- **Stack Front-end:** HTML5 Semântico, CSS3 Moderno (Custom Properties & Grid) e JavaScript ES6+ Nativo (ES Modules).
- **Zero Node/NPM/Composer:** Proibido o uso de gerenciadores de pacotes ou bundlers (Vite, Webpack).
- **Backend & Database:** Supabase via API REST / Realtime com Banco PostgreSQL.
- **Bibliotecas via CDN W3C:**
  - `@supabase/supabase-js@2` (Comunicação com Supabase)
  - `Alpine.js` (Reatividade leve no DOM)
  - `Html5-Qrcode` / Web MediaDevices API (Captura e controle de Câmera)

---

## 2. Banco de Dados SQL (Supabase / PostgreSQL)

```sql
-- Tipos Enumerados
CREATE TYPE tipo_batida AS ENUM ('ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA');

-- Tabela de Funcionários
CREATE TABLE funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome_completo VARCHAR(100) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Jornadas Contratuais
CREATE TABLE jornadas_padrao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    hora_entrada TIME NOT NULL,
    hora_saida TIME NOT NULL,
    tolerancia_minutos INT DEFAULT 10
);

-- Tabela de Registros de Ponto (Batidas)
CREATE TABLE registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tipo tipo_batida NOT NULL,
    foto_url TEXT NOT NULL,
    hash_comprovante TEXT UNIQUE NOT NULL,
    alerta_fraude BOOLEAN DEFAULT FALSE,
    motivo_alerta TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segurança RLS (Row Level Security)
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Busca de Funcionário Ativo" ON funcionarios FOR SELECT USING (ativo = true);
CREATE POLICY "Inserção de Batida de Ponto" ON registros_ponto FOR INSERT WITH CHECK (true);