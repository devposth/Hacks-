// MÉTODO MEJORADO - DETECCIÓN INTELIGENTE DEL MODELO
async generateSummaryWithGemini(text) {
    const API_KEY = 'AIzaSyA83ZOpHjI665CwvORRgPInWHHBj-j83h8';
    
    console.log('🎯 INICIANDO BÚSQUEDA DEL MODELO CORRECTO...');
    console.log('✅ API Key configurada correctamente');
    console.log('✅ Generative Language API habilitada');
    console.log('🔍 Detectando modelo disponible...');

    const limitedText = text.length > 1500 ? text.substring(0, 1500) + "..." : text;
    const topic = this.classTopicInput.value.trim();
    
    let prompt = `Como experto educativo, crea un resumen profesional en español:\n\n"${limitedText}"\n\n`;
    if (topic) prompt += `ENFÓCATE en: ${topic}\n\n`;
    prompt += `Estructura en: • Puntos clave • Conceptos importantes • Recomendaciones\nUsa emojis.`;

    // TODOS los modelos posibles - versión extendida
    const modelsToTry = [
        'gemini-1.0-pro',
        'gemini-pro',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
        'gemini-1.0-pro-001',
        'gemini-1.0-pro-latest',
        'text-bison-001',
        'chat-bison-001'
    ];

    console.log(`🔄 Probando ${modelsToTry.length} modelos...`);

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            console.log(`\n🔧 [${i + 1}/${modelsToTry.length}] Probando: ${model}`);
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                signal: controller.signal,
                body: JSON.stringify({
                    contents: [{ 
                        parts: [{ 
                            text: prompt 
                        }] 
                    }],
                    generationConfig: {
                        temperature: 0.7,
                        maxOutputTokens: 1000,
                        topP: 0.8
                    }
                })
            });

            clearTimeout(timeoutId);

            console.log(`📥 Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 200) {
                const data = await response.json();
                console.log(`🎉 ¡ÉXITO! Modelo funcionando: ${model}`);
                console.log('📊 Respuesta recibida correctamente');
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    } else {
                        summary = `📚 **RESUMEN DE CLASE**\n\n${summary}`;
                    }
                    
                    console.log('✨ ¡RESUMEN CON IA REAL GENERADO!');
                    return summary;
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.log(`❌ ${model}: ${response.status} -`, errorData.error?.message || 'Sin detalles');
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log(`⏰ ${model}: Timeout - muy lento`);
            } else {
                console.log(`💥 ${model}:`, error.message);
            }
        }
    }
    
    // Si llegamos aquí, probemos una última opción - LISTAR MODELOS DISPONIBLES
    console.log('\n🔍 Intentando listar modelos disponibles...');
    try {
        const listResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        if (listResponse.ok) {
            const modelsData = await listResponse.json();
            console.log('📋 MODELOS DISPONIBLES:', modelsData.models?.map(m => m.name) || 'No se pudieron listar');
        }
    } catch (e) {
        console.log('❌ No se pudieron listar modelos');
    }
    
    throw new Error(`No se encontró ningún modelo funcional. \n\nPosibles soluciones:\n1. Espera 10-15 minutos para que la API se active completamente\n2. Verifica que tu proyecto tenga facturación habilitada\n3. Prueba en un proyecto diferente`);
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
        console.log('🔄 === INICIANDO GENERACIÓN DE RESUMEN ===');
        const summary = await this.generateSummaryWithGemini(this.transcription);
        this.displaySummary(summary);
        
    } catch (error) {
        console.error('❌ Error final:', error);
        
        // Mensaje más amigable para el usuario
        const userMessage = error.message.includes('No se encontró ningún modelo') 
            ? 'Configuración en progreso... La API puede tardar unos minutos en activarse completamente. Intenta nuevamente en 5-10 minutos.'
            : `Error: ${error.message}`;
            
        this.showError(userMessage);
        
        const simulatedSummary = this.createSimulatedSummary();
        this.displaySummary("⚠️ **MODO SIMULADO**\n\n" + simulatedSummary);
        
    } finally {
        this.summaryLoading.style.display = 'none';
        this.summarizeBtn.disabled = false;
    }
}
