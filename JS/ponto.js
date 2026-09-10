// JS/ponto.js
// Regras de negócio do registro de ponto (Tolerância de horário, Sequência de batidas e Hash de comprovante)

// Calcula o hash de comprovante SHA-256 usando Web Crypto API
export async function generateProofHash(matricula, dataHoraISO, tipo, fotoUrl) {
    const rawData = `${matricula}_${dataHoraISO}_${tipo}_${fotoUrl.substring(0, 50)}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Avalia a tolerância de horário e determina o status da jornada (NORMAL, ATRASO, SAIDA_ANTECIPADA)
export function evaluateJornadaStatus(horaAtualStr, jornadaPadrao) {
    if (!jornadaPadrao || !jornadaPadrao.hora_entrada || !jornadaPadrao.hora_saida) {
        return { status: 'NORMAL', mensagem: 'Jornada não configurada' };
    }

    const tolerancia = jornadaPadrao.tolerancia_minutos || 10;

    // Converte string HH:MM para minutos desde a meia noite
    const parseMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    const atualMinutos = parseMinutes(horaAtualStr);
    const entradaMinutos = parseMinutes(jornadaPadrao.hora_entrada);
    const saidaMinutos = parseMinutes(jornadaPadrao.hora_saida);

    // Se a entrada ultrapassou a hora contratual + tolerância
    if (atualMinutos > (entradaMinutos + tolerancia) && atualMinutos < saidaMinutos) {
        return {
            status: 'ATRASO',
            mensagem: `Entrada com atraso de ${atualMinutos - entradaMinutos} minuto(s).`
        };
    }

    // Se a saída ocorreu antes da hora contratual - tolerância
    if (atualMinutos < (saidaMinutos - tolerancia) && atualMinutos >= entradaMinutos) {
        return {
            status: 'SAIDA_ANTECIPADA',
            mensagem: `Saída antecipada em ${saidaMinutos - atualMinutos} minuto(s).`
        };
    }

    return {
        status: 'NORMAL',
        mensagem: 'Dentro do horário de jornada contratual.'
    };
}

// Valida se a sequência do tipo de batida é coerente com o histórico recente
export function validateBatidaSequence(ultimoTipo, novoTipo) {
    const sequenceMap = {
        'ENTRADA': ['SAIDA_ALMOCO', 'SAIDA'],
        'SAIDA_ALMOCO': ['RETORNO_ALMOCO'],
        'RETORNO_ALMOCO': ['SAIDA'],
        'SAIDA': ['ENTRADA']
    };

    if (!ultimoTipo) {
        // Se for o primeiro registro do dia, preferencialmente deve ser ENTRADA
        return { valido: true };
    }

    const permitidos = sequenceMap[ultimoTipo] || [];
    if (permitidos.includes(novoTipo)) {
        return { valido: true };
    }

    return {
        valido: false,
        alerta: true,
        motivo: `Sequência atípica: A última batida foi "${ultimoTipo}" e a nova é "${novoTipo}".`
    };
}
