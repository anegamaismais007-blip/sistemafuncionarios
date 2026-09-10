-- ============================================================================
-- ESQUEMA DE BANCO DE DADOS: CONTROLE DE PONTO E FREQUÊNCIA
-- Plataforma: Supabase / PostgreSQL
-- ============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TIPOS ENUMERADOS
CREATE TYPE tipo_batida AS ENUM ('ENTRADA', 'SAIDA_ALMOCO', 'RETORNO_ALMOCO', 'SAIDA');
CREATE TYPE status_jornada AS ENUM ('NORMAL', 'ATRASO', 'SAIDA_ANTECIPADA', 'FALTA');

-- 3. TABELA DE FUNCIONÁRIOS
CREATE TABLE funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(20) UNIQUE NOT NULL,
    nome_completo VARCHAR(120) NOT NULL,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABELA DE JORNADAS CONTRATUAIS
CREATE TABLE jornadas_padrao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    hora_entrada TIME NOT NULL,
    hora_saida TIME NOT NULL,
    tolerancia_minutos INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE REGISTROS DE PONTO (BATIDAS)
CREATE TABLE registros_ponto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funcionario_id UUID REFERENCES funcionarios(id) ON DELETE CASCADE,
    data_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Data/hora sempre gerenciada pelo Servidor SQL
    tipo tipo_batida NOT NULL,
    foto_url TEXT NOT NULL,
    hash_comprovante VARCHAR(64) UNIQUE NOT NULL,
    alerta_fraude BOOLEAN DEFAULT FALSE,
    motivo_alerta TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDICES PARA PERFORMANCE DE CONSULTA
CREATE INDEX idx_funcionarios_matricula ON funcionarios(matricula);
CREATE INDEX idx_registros_funcionario_data ON registros_ponto(funcionario_id, data_hora);

-- 7. SEGURANÇA - ROW LEVEL SECURITY (RLS)
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE jornadas_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_ponto ENABLE ROW LEVEL SECURITY;

-- Políticas RLS Permissivas para Acesso via API Anônima do Totem
CREATE POLICY "Permitir leitura de funcionarios ativos"
    ON funcionarios FOR SELECT USING (ativo = true);

CREATE POLICY "Permitir leitura de jornadas"
    ON jornadas_padrao FOR SELECT USING (true);

CREATE POLICY "Permitir inserção de registros de ponto"
    ON registros_ponto FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de registros de ponto"
    ON registros_ponto FOR SELECT USING (true);