// JS/camera.js
// Gerenciamento da Câmera (Web MediaDevices API)

let currentStream = null;

export async function startCamera(videoElement) {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("API MediaDevices não suportada neste navegador.");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: "user"
            },
            audio: false
        });

        currentStream = stream;
        videoElement.srcObject = stream;
        await videoElement.play();
        return true;
    } catch (err) {
        console.warn("Não foi possível acessar a câmera do dispositivo:", err);
        return false;
    }
}

export function stopCamera(videoElement) {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    if (videoElement) {
        videoElement.srcObject = null;
    }
}

export function capturePhoto(videoElement, canvasElement) {
    const context = canvasElement.getContext('2d');

    // Se o vídeo tiver dimensões ativas da câmera
    if (videoElement && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
        return canvasElement.toDataURL('image/jpeg', 0.85);
    } else {
        // Fallback para ambientes sem webcam ativa (simulação de foto facial)
        canvasElement.width = 300;
        canvasElement.height = 300;
        context.fillStyle = '#1e293b';
        context.fillRect(0, 0, 300, 300);

        context.fillStyle = '#38bdf8';
        context.font = '16px sans-serif';
        context.textAlign = 'center';
        context.fillText('Foto Simulada de Ponto', 150, 140);
        context.fillText(new Date().toLocaleTimeString(), 150, 170);

        return canvasElement.toDataURL('image/jpeg', 0.85);
    }
}
