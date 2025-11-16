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
        this.classTopicInput = document.getElementById('classTopic');
    }

    setupEventListeners() {
        this.recordBtn.addEventListener('click', (e) => this.handleRecordClick(e));
        this.summarizeBtn.addEventListener('click', () => this.generateSummary());
        this.clearBtn.addEventListener('click', () => this.clearTranscription());
        this.exportBtn.addEventListener('click', () => this.exportText());
        this.copyBtn.addEventListener('click', () => this.copyText());
        
        if (!this.isMobile) {
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && !e.target.matches('button, input, textarea')) {
                    e.preventDefault();
                    this.toggleRecording();
                }
            });
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
    }

    handleRecordClick(e) {
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
            console.log('🎤 Grabación iniciada');
        } catch (error) {
            console.error('Error al iniciar grabación:', error);
            this.showError('Error al iniciar la grabación. Intenta nuevamente.');
        }
    }

    stopRecording() {
        console.log('🛑 Grabación detenida');
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

    clearTranscription() {
        console.log('🗑️ Limpiando transcripción');
        if (this.isRecording) {
            this.stopRecording();
        }
        
        this.transcription = '';
        this.interimTranscription = '';
        this.timer.textContent = '00:00';
        this.classTopicInput.value = '';
        
        this.updateTranscriptionDisplay();
        this.showPlaceholder();
        this.summarySection.style.display = 'none';
        this.summarizeBtn.disabled = true;
        this.wordCount.textContent = '0 palabras';
        
        this.updateUI();
        
        this.showSuccess('Transcripción limpiada correctamente');
    }

    // 🔥 **SOLUCIÓN CON PROXY PARA CORS**
    async generateSummaryWithGemini(text) {
        const API_KEY = 'AIzaSyC4a3Dg7EaHN-DwbfWnCIj1FZL2KRzONHY';
        
        console.log('🚀 SOLUCIÓN CON PROXY CORS...');
        
        const limitedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;
        const topic = this.classTopicInput.value.trim();
        
        let prompt = `Como experto educativo, crea un resumen profesional en español:\n\n"${limitedText}"\n\n`;
        if (topic) prompt += `ENFÓCATE en: ${topic}\n\n`;
        prompt += `Estructura en: • Puntos clave • Conceptos importantes • Aplicaciones prácticas • Recomendaciones de estudio\n\nUsa emojis y lenguaje claro.`;

        // 🔥 **USAR PROXY PARA EVITAR CORS**
        const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
        
        try {
            console.log('🔧 Usando proxy CORS...');
            
            const response = await fetch(proxyUrl + apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
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
                        topP: 0.8,
                        topK: 40
                    }
                })
            });

            console.log('📥 Status:', response.status);
            
            if (response.status === 200) {
                const data = await response.json();
                console.log('✅ ¡CONEXIÓN EXITOSA CON GEMINI!');
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    } else {
                        summary = `📚 **RESUMEN DE CLASE**\n\n${summary}`;
                    }
                    
                    return summary;
                }
            } else {
                console.log('❌ Error con proxy, intentando método directo...');
                return await this.tryDirectMethod(API_KEY, prompt, topic);
            }
            
        } catch (error) {
            console.log('❌ Error con proxy:', error.message);
            return await this.tryDirectMethod(API_KEY, prompt, topic);
        }
    }

    // 🔥 **MÉTODO DIRECTO COMO FALLBACK**
    async tryDirectMethod(apiKey, prompt, topic) {
        console.log('🔄 Intentando método directo...');
        
        const models = [
            'gemini-1.5-flash',
            'gemini-1.5-pro', 
            'gemini-1.0-pro'
        ];

        for (const model of models) {
            try {
                console.log(`🔧 Probando: ${model}`);
                
                const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: { 
                        'Content-Type': 'application/json',
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
                            topP: 0.8,
                            topK: 40
                        }
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    } else {
                        summary = `📚 **RESUMEN DE CLASE**\n\n${summary}`;
                    }
                    
                    console.log('✅ ¡CONEXIÓN DIRECTA EXITOSA!');
                    return summary;
                }
            } catch (error) {
                console.log(`❌ Error con ${model}:`, error.message);
            }
        }
        
        throw new Error('No se pudo conectar con Gemini. Verifica tu conexión o intenta más tarde.');
    }

    async generateSummary() {
        if (this.transcription.trim().length < 50) {
            this.showError('Se necesita más texto para generar un resumen (mínimo 50 caracteres)');
            return;
        }

        console.log('🔄 === INICIANDO GENERACIÓN CON IA ===');
        
        this.summarySection.style.display = 'block';
        this.summaryLoading.style.display = 'block';
        this.summaryContent.style.display = 'none';
        this.summarizeBtn.disabled = true;

        try {
            const summary = await this.generateSummaryWithGemini(this.transcription);
            this.displaySummary(summary);
            this.showSuccess('¡Resumen generado con éxito!');
            
        } catch (error) {
            console.error('❌ Error en generateSummary:', error);
            
            // 🔥 **FALLBACK MEJORADO - RESUMEN INTELIGENTE LOCAL**
            const smartSummary = this.generateSmartSummary();
            this.displaySummary(smartSummary);
            this.showInfo('Usando modo local - Para IA real, verifica la conexión');
            
        } finally {
            this.summaryLoading.style.display = 'none';
            this.summarizeBtn.disabled = false;
        }
    }

    // 🔥 **FALLBACK INTELIGENTE MEJORADO**
    generateSmartSummary() {
        const sentences = this.transcription.split(/[.!?]+/).filter(s => s.length > 10);
        const words = this.transcription.toLowerCase().split(/\s+/);
        
        // Contar palabras clave
        const wordCount = {};
        words.forEach(word => {
            if (word.length > 4) {
                wordCount[word] = (wordCount[word] || 0) + 1;
            }
        });
        
        // Obtener palabras más frecuentes
        const topWords = Object.entries(wordCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        
        const topic = this.classTopicInput.value.trim();
        const topicHeader = topic ? `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n` : '';
        
        const keyPoints = sentences.slice(0, 4).map((sentence, index) => 
            `• ${sentence.trim()}`
        ).join('\n\n');

        return `${topicHeader}📚 **RESUMEN INTELIGENTE**

🔍 **Puntos Clave Identificados:**

${keyPoints}

🏷️ **Temas Principales:** ${topWords.join(', ')}

📊 **Estadísticas:**
• ${sentences.length} ideas principales
• ${words.length} palabras transcritas
• ${Math.round(words.length / sentences.length)} palabras por idea

💡 **Sugerencia:** Para resúmenes con IA en tiempo real, verifica tu conexión a internet y que la API Key esté configurada correctamente en Google AI Studio.`;
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
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

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

// Estilos para notificaciones
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
