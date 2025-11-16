// 🔥 MÉTODO ACTUALIZADO - MODELOS CORRECTOS
async generateSummaryWithGemini(text) {
    const API_KEY = 'AIzaSyC4a3Dg7EaHN-DwbfWnCIj1FZL2KRzONHY';
    
    console.log('🚀 BUSCANDO MODELOS DISPONIBLES...');
    
    const limitedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;
    const topic = this.classTopicInput.value.trim();
    
    let prompt = `Como experto educativo, crea un resumen profesional en español:\n\n"${limitedText}"\n\n`;
    if (topic) prompt += `ENFÓCATE en: ${topic}\n\n`;
    prompt += `Estructura en: • Puntos clave • Conceptos importantes • Aplicaciones prácticas • Recomendaciones de estudio\n\nUsa emojis y lenguaje claro.`;

    // 🔥 MODELOS CORREGIDOS - NOMBRES ACTUALES
    const modelsToTry = [
        'gemini-1.5-flash-001',      // Modelo Flash actual
        'gemini-1.5-pro-001',        // Modelo Pro actual  
        'gemini-1.0-pro-001',        // Modelo Pro legacy
        'gemini-1.0-pro',            // Versión alternativa
        'gemini-pro',                // Nombre genérico
        'models/gemini-pro'          // Ruta completa
    ];

    for (let i = 0; i < modelsToTry.length; i++) {
        const model = modelsToTry[i];
        try {
            console.log(`🔧 [${i + 1}/${modelsToTry.length}] Probando: ${model}`);
            
            // 🔥 URL CORREGIDA - Sin /models/ duplicado
            const url = model.startsWith('models/') 
                ? `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${API_KEY}`
                : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
            
            const response = await fetch(url, {
                method: 'POST',
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

            console.log(`📥 Status para ${model}: ${response.status}`);
            
            if (response.status === 200) {
                const data = await response.json();
                console.log(`✅ ¡MODELO FUNCIONAL ENCONTRADO!: ${model}`);
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    } else {
                        summary = `📚 **RESUMEN DE CLASE**\n\n${summary}`;
                    }
                    
                    console.log('✨ ¡RESUMEN CON IA GENERADO EXITOSAMENTE!');
                    return summary;
                }
            } else {
                const errorText = await response.text();
                console.log(`❌ ${model} falló:`, errorText);
            }
            
        } catch (error) {
            console.log(`❌ Error con ${model}:`, error.message);
        }
    }
    
    // 🔥 VERIFICACIÓN DE API KEY
    console.log('🔍 Verificando API Key...');
    try {
        const testResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
        console.log('📡 Status verificación API:', testResponse.status);
        if (testResponse.status === 401) {
            throw new Error('API Key inválida o no autorizada');
        } else if (testResponse.status === 403) {
            throw new Error('API no habilitada o sin permisos');
        }
    } catch (error) {
        console.log('🔐 Error de autenticación:', error.message);
    }
    
    throw new Error('No se encontraron modelos funcionales. Verifica que Gemini API esté habilitada en Google Cloud Console.');
}
