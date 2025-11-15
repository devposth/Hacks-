// Estado de la aplicación
class ApunteAI {
    constructor() {
        this.isRecording = false;
        this.recognition = null;
        this.transcription = '';
        this.interimTranscription = '';
        this.startTime = null;
        this.timerInterval = null;
        this.isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.lastTouchTime = 0;
        this.touchDelay = 300;
        
        this.initializeElements();
        this.setupEventListeners();
        this.checkBrowserCompatibility();
    }

    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.summarizeBtn = document.getElementById('summarizeBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportBtn = document.getElementById('exportBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.timer = document.getElementById('timer');
        this.status = document.getElementById('status');
        this.transcriptionBox = document.getElementById('transcriptionBox');
        this.transcriptionContent = document.getElementById('transcriptionContent');
        this.placeholder = document.getElementById('placeholder');
        this.summarySection = document.getElementById('summarySection');
        this.summaryBox = document.getElementById('summaryBox');
        this.summaryContent = document.getElementById('summaryContent');
        this.summaryLoading = document.getElementById('summaryLoading');
        this.wordCount = document.getElementById('wordCount');
        this.browserWarning = document.getElementById('browserWarning');
        this.classTopicInput = document.getElementById('classTopic'); // NUEVO ELEMENTO
    }

    setupEventListeners() {
        // SOLUCIÓN PARA MÓVIL: Usar solo click para todos los dispositivos
        this.recordBtn.addEventListener('click', (e) => this.handleRecordClick(e));
        this.summarizeBtn.addEventListener('click', () => this.generateSummary());
        this.clearBtn.addEventListener('click', () => this.clearTranscription());
        this.exportBtn.addEventListener('click', () => this.exportText());
        this.copyBtn.addEventListener('click', () => this.copyText());
        
        // Tecla espacio para grabar/pausar (solo desktop)
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !e.target.matches('button, input, textarea')) {
                    e.preventDefault();
                    this.toggleRecording();
                }
            });
        }

        // Manejar visibilidad de la página para detener grabación cuando no está visible
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
    }

    handleRecordClick(e) {
        // SOLUCIÓN SIMPLIFICADA: Solo prevención básica para el botón de grabación
        if (this.isMobile) {
            const currentTime = new Date().getTime();
            if (currentTime - this.lastTouchTime < this.touchDelay) {
                e.preventDefault();
                return;
            }
            this.lastTouchTime = currentTime;
        }
        this.toggleRecording();
    }

    checkBrowserCompatibility() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge para mejor compatibilidad.');
            this.recordBtn.disabled = true;
            this.browserWarning.style.display = 'block';
            this.browserWarning.textContent = '⚠️ Tu navegador no es compatible con el reconocimiento de voz. Por favor, usa Google Chrome.';
        }
        
        if (!this.isChrome) {
            this.showInfo('Para mejor experiencia, usa Google Chrome. Otros navegadores pueden tener funcionalidad limitada.');
            this.browserWarning.style.display = 'block';
            this.browserWarning.textContent = 'ℹ️ Para la mejor experiencia, recomendamos usar Google Chrome.';
        }

        if (this.isMobile) {
            this.showInfo('Modo móvil activado. Asegúrate de permitir el acceso al micrófono.');
        }
    }

    initializeSpeechRecognition() {
        this.recognition = new webkitSpeechRecognition();
        
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';
        
        if (this.isMobile) {
            this.recognition.interimResults = false;
        }

        this.recognition.onstart = () => {
            this.isRecording = true;
            this.updateUI();
            this.startTimer();
        };

        this.recognition.onresult = (event) => {
            this.interimTranscription = '';
            let finalTranscription = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscription += transcript + ' ';
                } else if (!this.isMobile) {
                    this.interimTranscription += transcript;
                }
            }

            if (finalTranscription) {
                this.transcription += finalTranscription;
                this.updateTranscriptionDisplay();
            } else if (this.interimTranscription && !this.isMobile) {
                this.updateTranscriptionDisplay();
            }
        };

        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            if (event.error === 'not-allowed') {
                this.showError('Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.');
            } else if (event.error === 'network') {
                this.showError('Error de red. Verifica tu conexión a internet.');
            } else if (event.error === 'audio-capture') {
                this.showError('No se detectó micrófono. Verifica tu dispositivo de audio.');
            }
            this.stopRecording();
        };

        this.recognition.onend = () => {
            if (this.isRecording) {
                setTimeout(() => {
                    if (this.isRecording) {
                        try {
                            this.recognition.start();
                        } catch (error) {
                            console.error('Error al reiniciar reconocimiento:', error);
                            this.stopRecording();
                        }
                    }
                }, 100);
            }
        };
    }

    toggleRecording() {
        if (!this.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        if (!this.recognition) {
            this.initializeSpeechRecognition();
        }

        this.hidePlaceholder();
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Error al iniciar grabación:', error);
            this.showError('Error al iniciar la grabación. Intenta nuevamente.');
        }
    }

    stopRecording() {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error al detener grabación:', error);
            }
        }
        
        this.isRecording = false;
        this.stopTimer();
        this.updateUI();
        
        if (this.transcription.trim().length > 50) {
            this.summarizeBtn.disabled = false;
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.stopTimer();
        
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            this.timer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    updateUI() {
        if (this.isRecording) {
            this.recordBtn.innerHTML = '<span class="btn-icon">🛑</span><span class="btn-text">Detener Grabación</span>';
            this.recordBtn.classList.add('recording');
            this.status.textContent = 'Grabando... Habla ahora';
            this.status.classList.add('recording');
        } else {
            this.recordBtn.innerHTML = '<span class="btn-icon">🎤</span><span class="btn-text">Comenzar Clase</span>';
            this.recordBtn.classList.remove('recording');
            this.status.textContent = 'Grabación detenida';
            this.status.classList.remove('recording');
        }

        this.summarizeBtn.disabled = this.transcription.trim().length < 50;
    }

    hidePlaceholder() {
        this.placeholder.style.display = 'none';
        this.transcriptionContent.style.display = 'block';
    }

    showPlaceholder() {
        this.placeholder.style.display = 'block';
        this.transcriptionContent.style.display = 'none';
    }

    updateTranscriptionDisplay() {
        let displayText = this.transcription;
        
        if (this.interimTranscription && !this.isMobile) {
            displayText += '<span class="interim"> ' + this.interimTranscription + '</span>';
        }
        
        this.transcriptionContent.innerHTML = displayText;
        
        const wordCount = this.transcription.split(/\s+/).filter(word => word.length > 0).length;
        this.wordCount.textContent = `${wordCount} palabras`;
        
        this.transcriptionBox.scrollTop = this.transcriptionBox.scrollHeight;
    }

    // MÉTODO MEJORADO PARA MÓVIL
    clearTranscription() {
        console.log('Botón limpiar presionado en móvil');
        
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.transcription = '';
        this.interimTranscription = '';
        this.timer.textContent = '00:00';
        this.classTopicInput.value = ''; // LIMPIAR EL TEMA TAMBIÉN
        
        this.updateTranscriptionDisplay();
        this.showPlaceholder();
        this.summarySection.style.display = 'none';
        this.summarizeBtn.disabled = true;
        this.wordCount.textContent = '0 palabras';
        
        this.updateUI();
        
        this.showSuccess('Transcripción limpiada correctamente');
    }

    // NUEVO MÉTODO: Generar resumen con Gemini IA REAL
    async generateSummaryWithGemini(text) {
        // 🔑 REEMPLAZA ESTA KEY con la tuya de Google AI Studio
        const API_KEY = 'TU_API_KEY_DE_GOOGLE_AQUI';
        
        // Limitar texto para no exceder límites (opcional)
        const limitedText = text.length > 10000 ? text.substring(0, 10000) + "..." : text;
        const topic = this.classTopicInput.value.trim();
        
        // PROMPT MEJORADO con el tema
        const prompt = topic ? 
            `Eres un experto en ${topic}. Crea un resumen especializado de esta clase.

TEMA PRINCIPAL: ${topic}
TEXTO DE LA CLASE:
${limitedText}

INSTRUCCIONES:
1. Usa terminología específica de ${topic}
2. Identifica conceptos clave del área
3. Destaca aplicaciones prácticas
4. Sugiere recursos de estudio relevantes
5. Estructura en: Puntos Clave, Conceptos Técnicos, Aplicaciones Prácticas
6. Usa emojis relacionados con ${topic}` 
            :
            `Eres un asistente educativo experto en crear resúmenes estructurados de clases.

TEXTO DE LA CLASE:
${limitedText}

INSTRUCCIONES:
1. Crea un resumen claro y organizado en español
2. Identifica el tema principal automáticamente
3. Estructura en: Puntos Clave, Conceptos Principales, Recomendaciones
4. Usa emojis para hacerlo más visual`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1200,
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                let summary = data.candidates[0].content.parts[0].text;
                
                // Agregar header con el tema si existe
                if (topic) {
                    summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n` + summary;
                }
                
                return summary;
            } else {
                throw new Error('Respuesta inesperada de la API');
            }
            
        } catch (error) {
            console.error('Error con Gemini:', error);
            throw error;
        }
    }

    async generateSummary() {
        if (this.transcription.trim().length < 50) {
            this.showError('Se necesita más texto para generar un resumen (mínimo 50 caracteres)');
            return;
        }

        this.summarySection.style.display = 'block';
        this.summaryLoading.style.display = 'block';
        this.summaryContent.style.display = 'none';
        this.summarizeBtn.disabled = true;

        try {
            // ✅ USAR IA REAL en lugar de simulación
            const summary = await this.generateSummaryWithGemini(this.transcription);
            this.displaySummary(summary);
            
        } catch (error) {
            console.error('Error generando resumen con IA:', error);
            
            // ✅ FALLBACK: Si falla la IA, usar simulación
            this.showError('No se pudo conectar con el servicio de IA. Usando modo simulado...');
            const simulatedSummary = this.createSimulatedSummary();
            this.displaySummary("⚠️ **MODO SIMULADO** (sin conexión a IA):\n\n" + simulatedSummary);
            
        } finally {
            this.summaryLoading.style.display = 'none';
            this.summarizeBtn.disabled = false;
        }
    }

    async simulateAISummary() {
        const delay = this.isMobile ? 3000 : 2000;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        const simulatedSummary = this.createSimulatedSummary();
        this.displaySummary(simulatedSummary);
    }

    createSimulatedSummary() {
        const lines = this.transcription.split('. ').filter(line => line.length > 10);
        const keyPoints = lines.slice(0, 5).map((line, index) => 
            `${index + 1}. ${line.trim()}`
        ).join('\n\n');

        const topic = this.classTopicInput.value.trim();
        const topicHeader = topic ? `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n` : '';

        return `${topicHeader}📚 **RESUMEN DE LA CLASE** (Simulado con IA)

🔍 **Puntos Clave Identificados:**

${keyPoints}

🎯 **Conceptos Principales:**
• Transcripción automática de voz a texto
• Procesamiento de lenguaje natural
• Análisis de contenido educativo

💡 **Recomendaciones de Estudio:**
1. Revisar los conceptos de reconocimiento de voz
2. Practicar con diferentes acentos y velocidades
3. Explorar aplicaciones en educación

⚠️ **Nota:** Este es un resumen simulado. Para resúmenes con IA real, configura tu API Key de Google Gemini.`;
    }

    displaySummary(summary) {
        this.summaryLoading.style.display = 'none';
        this.summaryContent.style.display = 'block';
        this.summaryContent.innerHTML = summary.replace(/\n/g, '<br>');
        
        setTimeout(() => {
            this.summarySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
    }

    exportText() {
        if (!this.transcription.trim()) {
            this.showError('No hay texto para exportar');
            return;
        }

        const blob = new Blob([this.transcription], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcripcion-clase-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showSuccess('Texto exportado correctamente');
    }

    copyText() {
        if (!this.transcription.trim()) {
            this.showError('No hay texto para copiar');
            return;
        }

        navigator.clipboard.writeText(this.transcription).then(() => {
            this.showSuccess('Texto copiado al portapapeles');
        }).catch(() => {
            this.showError('Error al copiar el texto');
        });
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type === 'error' ? 'notification-error' : type === 'success' ? 'notification-success' : ''}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        `;
        
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? '#ff6b6b' : type === 'success' ? '#51cf66' : '#4dabf7',
            color: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: '1000',
            maxWidth: '400px',
            animation: 'slideIn 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new ApunteAI();
});

// Agregar estilos para animaciones de notificación
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification-error {
        background: #ff6b6b !important;
    }
    
    .notification-success {
        background: #51cf66 !important;
    }
`;
document.head.appendChild(style);
