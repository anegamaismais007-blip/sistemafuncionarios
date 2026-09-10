// JS/app.js
// Script principal do Totem de Ponto Facial

import { getSupabaseClient } from './SUPABASE.js';
import { startCamera, stopCamera, capturePhoto } from './camera.js';
import { generateProofHash, evaluateJornadaStatus, validateBatidaSequence } from './ponto.js';
import { saveOfflineRecord, getPendingOfflineRecords, syncOfflineRecords } from './offline.js';

// Estado da Aplicação
const state = {
    isOnline: navigator.onLine,
    cameraActive: false,
    capturedPhotoBase64: null,
    funcionarioAtual: null,
    jornadaAtual: null,
    ultimoRegistro: null,
    tipoBatidaSelecionado: null
};

// Elementos do DOM
let videoEl, canvasEl, btnToggleCamera, btnCapturePhoto, photoPreviewContainer, photoPreview;
let inputMatricula, btnBuscarFuncionario, funcionarioInfoCard, funcionarioNomeEl, funcionarioStatusEl, funcionarioJornadaEl;
let batidaButtons, btnConfirmarRegistro, messageBox, networkStatusBadge, networkStatusText, clockDisplay;
let syncContainer, pendingCountText, btnSyncNow;
let receiptModal, btnCloseModal, btnModalOk, receiptNome, receiptMatricula, receiptDataHora, receiptTipo, receiptStatusJornada, receiptModo, receiptHash;

document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initClock();
    initNetworkMonitoring();
    initEventListeners();
    updatePendingSyncUI();
});

function initDOMElements() {
    videoEl = document.getElementById('webcam-video');
    canvasEl = document.getElementById('snapshot-canvas');
    btnToggleCamera = document.getElementById('btn-toggle-camera');
    btnCapturePhoto = document.getElementById('btn-capture-photo');
    photoPreviewContainer = document.getElementById('photo-preview-container');
    photoPreview = document.getElementById('photo-preview');

    inputMatricula = document.getElementById('input-matricula');
    btnBuscarFuncionario = document.getElementById('btn-buscar-funcionario');
    funcionarioInfoCard = document.getElementById('funcionario-info');
    funcionarioNomeEl = document.getElementById('funcionario-nome');
    funcionarioStatusEl = document.getElementById('funcionario-status');
    funcionarioJornadaEl = document.getElementById('funcionario-jornada');

    batidaButtons = document.querySelectorAll('.btn-batida');
    btnConfirmarRegistro = document.getElementById('btn-confirmar-registro');
    messageBox = document.getElementById('message-box');

    networkStatusBadge = document.getElementById('network-status');
    networkStatusText = document.getElementById('network-status-text');
    clockDisplay = document.getElementById('clock-display');

    syncContainer = document.getElementById('sync-container');
    pendingCountText = document.getElementById('pending-count-text');
    btnSyncNow = document.getElementById('btn-sync-now');

    receiptModal = document.getElementById('receipt-modal');
    btnCloseModal = document.getElementById('btn-close-modal');
    btnModalOk = document.getElementById('btn-modal-ok');
    receiptNome = document.getElementById('receipt-nome');
    receiptMatricula = document.getElementById('receipt-matricula');
    receiptDataHora = document.getElementById('receipt-datahora');
    receiptTipo = document.getElementById('receipt-tipo');
    receiptStatusJornada = document.getElementById('receipt-status-jornada');
    receiptModo = document.getElementById('receipt-modo');
    receiptHash = document.getElementById('receipt-hash');
}

function initClock() {
    const updateTime = () => {
        const now = new Date();
        clockDisplay.textContent = now.toLocaleTimeString('pt-BR');
    };
    updateTime();
    setInterval(updateTime, 1000);
}

function initNetworkMonitoring() {
    const updateNetworkStatus = async () => {
        state.isOnline = navigator.onLine;
        if (state.isOnline) {
            networkStatusBadge.className = 'status-badge status-online';
            networkStatusText.textContent = 'Online';
            // Sincroniza batidas em fila quando voltar a ficar online
            const pending = getPendingOfflineRecords();
            if (pending.length > 0) {
                await handleSyncOfflineRecords();
            }
        } else {
            networkStatusBadge.className = 'status-badge status-offline';
            networkStatusText.textContent = 'Modo Offline';
        }
        updatePendingSyncUI();
    };

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);
    updateNetworkStatus();
}

function initEventListeners() {
    // Câmera
    btnToggleCamera.addEventListener('click', async () => {
        if (!state.cameraActive) {
            const started = await startCamera(videoEl);
            if (started) {
                state.cameraActive = true;
                btnToggleCamera.textContent = 'Desativar Câmera';
                btnCapturePhoto.disabled = false;
                showMessage('Câmera ativada com sucesso.', 'info');
            } else {
                showMessage('Modo de simulação ativado para foto.', 'warning');
                btnCapturePhoto.disabled = false;
            }
        } else {
            stopCamera(videoEl);
            state.cameraActive = false;
            btnToggleCamera.textContent = 'Iniciar Câmera';
            btnCapturePhoto.disabled = true;
        }
    });

    btnCapturePhoto.addEventListener('click', () => {
        const photoData = capturePhoto(videoEl, canvasEl);
        state.capturedPhotoBase64 = photoData;
        photoPreview.src = photoData;
        photoPreviewContainer.style.display = 'block';
        showMessage('Foto facial capturada com sucesso!', 'success');
        checkFormValidity();
    });

    // Busca de Funcionário
    btnBuscarFuncionario.addEventListener('click', buscarFuncionario);

    inputMatricula.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            buscarFuncionario();
        }
    });

    // Seleção do tipo de batida
    batidaButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            batidaButtons.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.tipoBatidaSelecionado = btn.getAttribute('data-tipo');
            document.getElementById('tipo-batida-selecionado').value = state.tipoBatidaSelecionado;
            checkFormValidity();
        });
    });

    // Submissão do Registro de Ponto
    btnConfirmarRegistro.addEventListener('click', registrarPonto);

    // Botões do Modal
    btnCloseModal.addEventListener('click', closeModal);
    btnModalOk.addEventListener('click', closeModal);

    // Sincronização manual
    btnSyncNow.addEventListener('click', handleSyncOfflineRecords);
}

function showMessage(msg, type = 'info') {
    messageBox.textContent = msg;
    messageBox.className = `message-box ${type}`;
    messageBox.style.display = 'block';
}

function clearMessage() {
    messageBox.style.display = 'none';
    messageBox.textContent = '';
}

function checkFormValidity() {
    const matriculaValid = state.funcionarioAtual !== null;
    const tipoValid = state.tipoBatidaSelecionado !== null;
    const photoValid = state.capturedPhotoBase64 !== null;

    btnConfirmarRegistro.disabled = !(matriculaValid && tipoValid && photoValid);
}

async function buscarFuncionario() {
    const matricula = inputMatricula.value.trim();
    if (!matricula) {
        showMessage('Por favor, informe a matrícula.', 'warning');
        return;
    }

    clearMessage();

    if (!state.isOnline) {
        // Fallback local se estiver offline
        state.funcionarioAtual = {
            id: 'offline-uuid-' + matricula,
            matricula: matricula,
            nome_completo: `Funcionário (${matricula})`
        };
        state.jornadaAtual = { hora_entrada: '08:00', hora_saida: '17:00', tolerancia_minutos: 10 };

        funcionarioNomeEl.textContent = state.funcionarioAtual.nome_completo;
        funcionarioStatusEl.textContent = 'Modo Offline (Validação Padrão)';
        funcionarioJornadaEl.textContent = '08:00 - 17:00 (Tolerância 10m)';
        funcionarioInfoCard.style.display = 'block';
        showMessage('Funcionário carregado no modo offline.', 'info');
        checkFormValidity();
        return;
    }

    try {
        const supabase = getSupabaseClient();

        // Busca funcionário ativo
        const { data: funcData, error: funcError } = await supabase
            .from('funcionarios')
            .select('*')
            .eq('matricula', matricula)
            .eq('ativo', true)
            .single();

        if (funcError || !funcData) {
            showMessage('Funcionário não encontrado ou inativo.', 'error');
            funcionarioInfoCard.style.display = 'none';
            state.funcionarioAtual = null;
            checkFormValidity();
            return;
        }

        state.funcionarioAtual = funcData;
        funcionarioNomeEl.textContent = funcData.nome_completo;
        funcionarioStatusEl.textContent = 'Ativo';

        // Busca jornada contratual
        const { data: jornadaData } = await supabase
            .from('jornadas_padrao')
            .select('*')
            .eq('funcionario_id', funcData.id)
            .maybeSingle();

        if (jornadaData) {
            state.jornadaAtual = jornadaData;
            funcionarioJornadaEl.textContent = `${jornadaData.hora_entrada} às ${jornadaData.hora_saida} (Tol: ${jornadaData.tolerancia_minutos} min)`;
        } else {
            state.jornadaAtual = { hora_entrada: '08:00', hora_saida: '17:00', tolerancia_minutos: 10 };
            funcionarioJornadaEl.textContent = 'Jornada Padrão (08:00 às 17:00)';
        }

        // Busca último registro para validação da sequência
        const { data: ultimoReg } = await supabase
            .from('registros_ponto')
            .select('tipo, data_hora')
            .eq('funcionario_id', funcData.id)
            .order('data_hora', { ascending: false })
            .limit(1)
            .maybeSingle();

        state.ultimoRegistro = ultimoReg;

        funcionarioInfoCard.style.display = 'block';
        showMessage('Funcionário identificado com sucesso!', 'success');
        checkFormValidity();

    } catch (err) {
        console.error("Erro na busca de funcionário:", err);
        showMessage('Erro ao consultar banco de dados. Tente novamente.', 'error');
    }
}

async function registrarPonto() {
    if (!state.funcionarioAtual || !state.tipoBatidaSelecionado || !state.capturedPhotoBase64) {
        showMessage('Preencha a matrícula, selecione o tipo de batida e capture a foto.', 'warning');
        return;
    }

    btnConfirmarRegistro.disabled = true;
    const nowISO = new Date().toISOString();
    const horaAtualStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // 1. Validação de tolerância de horário
    const jornadaEval = evaluateJornadaStatus(horaAtualStr, state.jornadaAtual);

    // 2. Validação da sequência de batidas
    const ultimoTipo = state.ultimoRegistro ? state.ultimoRegistro.tipo : null;
    const seqEval = validateBatidaSequence(ultimoTipo, state.tipoBatidaSelecionado);

    let alertaFraude = false;
    let motivoAlerta = null;

    if (!seqEval.valido) {
        alertaFraude = true;
        motivoAlerta = seqEval.motivo;
    }

    // 3. Geração de Hash de comprovante
    const hashComprovante = await generateProofHash(
        state.funcionarioAtual.matricula,
        nowISO,
        state.tipoBatidaSelecionado,
        state.capturedPhotoBase64
    );

    const payload = {
        funcionario_id: state.funcionarioAtual.id,
        data_hora: nowISO,
        tipo: state.tipoBatidaSelecionado,
        foto_url: state.capturedPhotoBase64,
        hash_comprovante: hashComprovante,
        alerta_fraude: alertaFraude,
        motivo_alerta: motivoAlerta
    };

    let registradoModo = 'Online';

    if (state.isOnline) {
        try {
            const supabase = getSupabaseClient();
            const { error } = await supabase
                .from('registros_ponto')
                .insert([payload]);

            if (error) {
                console.warn("Falha no salvamento online, salvando offline:", error);
                saveOfflineRecord(payload);
                registradoModo = 'Offline (Fallback)';
            }
        } catch (e) {
            console.warn("Exceção online, salvando offline:", e);
            saveOfflineRecord(payload);
            registradoModo = 'Offline (Fallback)';
        }
    } else {
        saveOfflineRecord(payload);
        registradoModo = 'Offline';
    }

    // Exibir Modal de Comprovante
    showReceiptModal({
        nome: state.funcionarioAtual.nome_completo,
        matricula: state.funcionarioAtual.matricula,
        dataHora: new Date().toLocaleString('pt-BR'),
        tipo: state.tipoBatidaSelecionado,
        statusJornada: jornadaEval.status + (jornadaEval.mensagem ? ` (${jornadaEval.mensagem})` : ''),
        modo: registradoModo,
        hash: hashComprovante
    });

    updatePendingSyncUI();
    resetForm();
}

function showReceiptModal(data) {
    receiptNome.textContent = data.nome;
    receiptMatricula.textContent = data.matricula;
    receiptDataHora.textContent = data.dataHora;
    receiptTipo.textContent = data.tipo;
    receiptStatusJornada.textContent = data.statusJornada;
    receiptModo.textContent = data.modo;
    receiptHash.textContent = data.hash;

    receiptModal.style.display = 'flex';
}

function closeModal() {
    receiptModal.style.display = 'none';
}

function resetForm() {
    inputMatricula.value = '';
    funcionarioInfoCard.style.display = 'none';
    state.funcionarioAtual = null;
    state.jornadaAtual = null;
    state.ultimoRegistro = null;
    state.tipoBatidaSelecionado = null;
    state.capturedPhotoBase64 = null;

    batidaButtons.forEach(b => b.classList.remove('selected'));
    photoPreviewContainer.style.display = 'none';
    photoPreview.src = '';
    clearMessage();
    btnConfirmarRegistro.disabled = true;
}

function updatePendingSyncUI() {
    const pending = getPendingOfflineRecords();
    if (pending.length > 0) {
        syncContainer.style.display = 'flex';
        pendingCountText.textContent = `${pending.length} registro(s) pendente(s) de sincronização.`;
    } else {
        syncContainer.style.display = 'none';
    }
}

async function handleSyncOfflineRecords() {
    if (!state.isOnline) {
        showMessage('Sem conexão com a internet para sincronizar.', 'warning');
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const result = await syncOfflineRecords(supabase);
        if (result.success) {
            showMessage(`${result.count} registro(s) sincronizado(s) com sucesso!`, 'success');
        } else {
            showMessage(`Sincronizados ${result.count} registro(s). Restam ${result.remainingCount}.`, 'warning');
        }
        updatePendingSyncUI();
    } catch (e) {
        console.error("Erro na sincronização:", e);
        showMessage('Erro durante a sincronização.', 'error');
    }
}
