// JS/offline.js
// Gerenciamento de Armazenamento Offline e Sincronização Automática com Supabase

const OFFLINE_STORAGE_KEY = "ponto_registros_pendentes";

export function getPendingOfflineRecords() {
    try {
        const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Erro ao ler registros offline:", e);
        return [];
    }
}

export function saveOfflineRecord(record) {
    try {
        const pending = getPendingOfflineRecords();
        pending.push({
            ...record,
            saved_offline_at: new Date().toISOString()
        });
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(pending));
        return pending.length;
    } catch (e) {
        console.error("Erro ao salvar registro offline:", e);
        throw e;
    }
}

export function clearPendingOfflineRecords() {
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
}

export async function syncOfflineRecords(supabaseClient) {
    const pending = getPendingOfflineRecords();
    if (pending.length === 0) {
        return { success: true, count: 0 };
    }

    const remaining = [];
    let syncedCount = 0;

    for (const record of pending) {
        try {
            // Remove metadados exclusivos da fila offline antes de enviar ao Supabase
            const { saved_offline_at, ...payload } = record;

            const { error } = await supabaseClient
                .from('registros_ponto')
                .insert([payload]);

            if (error) {
                console.error("Erro ao sincronizar registro:", error, record);
                remaining.push(record);
            } else {
                syncedCount++;
            }
        } catch (e) {
            console.error("Exceção ao sincronizar registro:", e);
            remaining.push(record);
        }
    }

    // Atualiza o localStorage apenas com os registros que ainda não puderam ser sincronizados
    if (remaining.length > 0) {
        localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(remaining));
    } else {
        clearPendingOfflineRecords();
    }

    return {
        success: remaining.length === 0,
        count: syncedCount,
        remainingCount: remaining.length
    };
}
