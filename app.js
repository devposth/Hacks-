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
                this.showError('Error de network. Verifica tu conexión a internet.');
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

    // 🔥 MÉTODO ACTUALIZADO - MODELOS GROQ 2024
    async generateSummaryWithGroq(text) {
        const API_KEY = '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';
        
        console.log('🚀 CONECTANDO CON GROQ AI...');
        
        const limitedText = text.length > 4000 ? text.substring(0, 4000) + "..." : text;
        const topic = this.classTopicInput.value.trim();
        
        let prompt = `Como experto educativo, crea un resumen profesional EN ESPAÑOL del siguiente texto:\n\n"${limitedText}"\n\n`;
        if (topic) prompt += `ENFÓCATE específicamente en el tema: ${topic}\n\n`;
        prompt += `Estructura el resumen en:\n• Puntos clave (3-4 puntos principales)\n• Conceptos importantes \n• Aplicaciones prácticas\n• Recomendaciones de estudio\n\nUsa emojis relevantes y lenguaje claro para estudiantes.`;

        // 🔥 MODELOS ACTUALES DE GROQ (2024)
        const groqModels = [
            'llama-3.1-8b-instant',    // Modelo rápido y gratuito
            'llama-3.1-70b-versatile', // Modelo más potente
            'mixtral-8x7b-32768',      // Alternativa
            'gemma-7b-it'              // Modelo de Google
        ];

        for (let model of groqModels) {
            try {
                console.log(`🔧 Probando modelo: ${model}`);
                
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ 
                            role: 'user', 
                            content: prompt
                        }],
                        max_tokens: 1500,
                        temperature: 0.7,
                        top_p: 0.8
                    })
                });

                console.log('📥 Status de Groq:', response.status);
                
                if (response.status === 200) {
                    const data = await response.json();
                    console.log(`✅ ¡GROQ CONECTADO EXITOSAMENTE con ${model}!`);
                    
                    let summary = data.choices[0].message.content.trim();
                    
                    // Formatear el resumen
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    } else {
                        summary = `📚 **RESUMEN DE CLASE**\n\n${summary}`;
                    }
                    
                    console.log('✨ ¡RESUMEN CON IA GROQ GENERADO!');
                    return summary;
                    
                } else if (response.status === 429) {
                    console.log('🔄 Límite temporal, probando siguiente modelo...');
                    continue;
                } else {
                    const errorData = await response.json();
                    console.log(`❌ ${model} falló:`, errorData.error?.message);
                    continue;
                }
                
            } catch (error) {
                console.log(`❌ Error con ${model}:`, error.message);
                continue;
            }
        }
        
        throw new Error('Todos los modelos de Groq fallaron');
    }

    // 🔄 MÉTODO DE RESPALDO - GEMINI ACTUALIZADO
    async generateSummaryWithGemini(text) {
        const API_KEY = 'AIzaSyC4a3Dg7EaHN-DwbfWnCIj1FZL2KRzONHY';
        
        const limitedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;
        const topic = this.classTopicInput.value.trim();
        
        let prompt = `Como experto educativo, resume este texto en español con puntos clave y conceptos importantes: ${limitedText}`;
        if (topic) prompt += ` Enfócate específicamente en: ${topic}`;

        // 🔥 MODELOS ACTUALES DE GEMINI
        const geminiModels = [
            'gemini-2.0-flash-exp',    // Modelo experimental rápido
            'gemini-1.5-flash',        // Flash actual
            'gemini-1.5-pro'           // Pro actual
        ];

        for (const model of geminiModels) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { 
                            maxOutputTokens: 1000,
                            temperature: 0.7
                        }
                    })
                });

                if (response.status === 200) {
                    const data = await response.json();
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    if (topic) summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    return summary;
                } else if (response.status === 429) {
                    console.log('📊 Límite de Gemini alcanzado');
                    continue;
                }
            } catch (error) {
                console.log(`❌ Gemini ${model} error:`, error.message);
                continue;
            }
        }
        throw new Error('Gemini no disponible');
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
            // 🔥 PRIMERO INTENTA CON GROQ
            let summary = await this.generateSummaryWithGroq(this.transcription);
            this.displaySummary(summary);
            this.showSuccess('¡Resumen con Groq AI generado! 🚀');
            
        } catch (error) {
            console.error('❌ Groq falló:', error.message);
            
            // 🔄 INTENTA CON GEMINI COMO RESPALDO
            try {
                console.log('🔄 Intentando con Gemini como respaldo...');
                let summary = await this.generateSummaryWithGemini(this.transcription);
                this.displaySummary(summary);
                this.showInfo('Resumen con Gemini (Groq no disponible)');
                
            } catch (geminiError) {
                console.error('❌ Ambas APIs fallaron:', geminiError);
                
                // 🎯 FALLBACK INTELIGENTE PARA HACKATHON
                const demoSummary = this.generateDemoSummary(this.transcription);
                this.displaySummary(demoSummary);
                this.showInfo('Modo demo activado - Para IA real revisa la configuración');
            }
            
        } finally {
            this.summaryLoading.style.display = 'none';
            this.summarizeBtn.disabled = false;
        }
    }

    // 🎯 FALLBACK PARA DEMO EN HACKATHON
    generateDemoSummary(text, topic) {
        const sentences = text.split(/[.!?]+/).filter(s => s.length > 20);
        const keyPoints = sentences.slice(0, 4).map((sentence, index) => 
            `${index + 1}. ${sentence.trim()}`
        ).join('\n\n');

        const topicHeader = topic ? `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n` : '📚 **RESUMEN DE CLASE**\n\n';

        return `${topicHeader}🔍 **Puntos Clave Identificados:**\n\n${keyPoints}\n\n💡 *Para resúmenes con IA en tiempo real, verifica la configuración de las APIs*`;
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
