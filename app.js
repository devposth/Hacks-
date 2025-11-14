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
    }

    setupEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.summarizeBtn.addEventListener('click', () => this.generateSummary());
        this.clearBtn.addEventListener('click', () => this.clearTranscription());
        this.exportBtn.addEventListener('click', () => this.exportText());
        this.copyBtn.addEventListener('click', () => this.copyText());
        
        // Tecla espacio para grabar/pausar
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('button, input, textarea')) {
                e.preventDefault();
                this.toggleRecording();
            }
        });
    }

    checkBrowserCompatibility() {
        if (!('webkitSpeechRecognition' in window)) {
            this.showError('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge para mejor compatibilidad.');
            this.recordBtn.disabled = true;
        }
        
        if (!this.isChrome) {
            this.showInfo('Para mejor experiencia, usa Google Chrome. Otros navegadores pueden tener funcionalidad limitada.');
        }
    }

    initializeSpeechRecognition() {
        this.recognition = new webkitSpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'es-ES';

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
                } else {
                    this.interimTranscription += transcript;
                }
            }

            if (finalTranscription) {
                this.transcription += finalTranscription;
            }

            this.updateTranscriptionDisplay();
        };

        this.recognition.onerror = (event) => {
            console.error('Error en reconocimiento de voz:', event.error);
            if (event.error === 'not-allowed') {
                this.showError('Permiso de micrófono denegado. Por favor, permite el acceso al micrófono.');
            } else if (event.error === 'network') {
                this.showError('Error de red. Verifica tu conexión a internet.');
            }
            this.stopRecording();
        };

        this.recognition.onend = () => {
            if (this.isRecording) {
                // Reconexión automática si aún debería estar grabando
                setTimeout(() => {
                    if (this.isRecording) {
                        this.recognition.start();
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
        this.recognition.start();
    }

    stopRecording() {
        if (this.recognition) {
            this.recognition.stop();
        }
        
        this.isRecording = false;
        this.stopTimer();
        this.updateUI();
        
        // Habilitar botón de resumen si hay texto
        if (this.transcription.trim().length > 50) {
            this.summarizeBtn.disabled = false;
        }
    }

    startTimer() {
        this.startTime = Date.now();
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
        // Botón de grabación
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

        // Botón de resumen
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
        
        if (this.interimTranscription) {
            displayText += '<span class="interim"> ' + this.interimTranscription + '</span>';
        }
        
        this.transcriptionContent.innerHTML = displayText;
        
        // Actualizar contador de palabras
        const wordCount = this.transcription.split(/\s+/).filter(word => word.length > 0).length;
        this.wordCount.textContent = `${wordCount} palabras`;
        
        // Auto-scroll al final
        this.transcriptionBox.scrollTop = this.transcriptionBox.scrollHeight;
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
            // Simular procesamiento con IA
            await this.simulateAISummary();
            
            // En una implementación real, aquí conectarías con OpenAI API:
            // const summary = await this.callOpenAI(this.transcription);
            // this.displaySummary(summary);
            
        } catch (error) {
            console.error('Error generando resumen:', error);
            this.showError('Error al generar el resumen. Intenta nuevamente.');
        } finally {
            this.summarizeBtn.disabled = false;
        }
    }

    async simulateAISummary() {
        // Simular tiempo de procesamiento
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Generar resumen simulado basado en el contenido
        const simulatedSummary = this.createSimulatedSummary();
        this.displaySummary(simulatedSummary);
    }

    createSimulatedSummary() {
        const lines = this.transcription.split('. ').filter(line => line.length > 10);
        const keyPoints = lines.slice(0, 5).map((line, index) => 
            `${index + 1}. ${line.trim()}`
        ).join('\n\n');

        return `📚 **RESUMEN DE LA CLASE** (Simulado con IA)

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

⚠️ **Nota:** Este es un resumen simulado. En producción, conectaríamos con OpenAI GPT-4 para análisis real del contenido.`;
    }

    displaySummary(summary) {
        this.summaryLoading.style.display = 'none';
        this.summaryContent.style.display = 'block';
        this.summaryContent.innerHTML = summary.replace(/\n/g, '<br>');
        
        // Scroll al resumen
        this.summarySection.scrollIntoView({ behavior: 'smooth' });
    }

    clearTranscription() {
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.transcription = '';
        this.interimTranscription = '';
        this.timer.textContent = '00:00';
        this.updateTranscriptionDisplay();
        this.showPlaceholder();
        this.summarySection.style.display = 'none';
        this.summarizeBtn.disabled = true;
        this.wordCount.textContent = '0 palabras';
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
        // Crear notificación temporal
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'}</span>
            <span>${message}</span>
        `;
        
        // Estilos para la notificación
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
            animation: 'slideIn 0.3s ease'
        });

        document.body.appendChild(notification);

        // Remover después de 4 segundos
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

// Inicializar la aplicación cuando el DOM esté listo
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
`;
document.head.appendChild(style);
