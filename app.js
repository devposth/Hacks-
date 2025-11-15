// MÉTODO DE EMERGENCIA - Probemos diferentes modelos
async generateSummaryWithGemini(text) {
    const API_KEY = 'AIzaSyA83ZOpHjI665CwvORRgPInWHHBj-j83h8';
    
    console.log('🚀 PROBANDO DIFERENTES MODELOS...');
    
    const limitedText = text.length > 3000 ? text.substring(0, 3000) + "..." : text;
    const topic = this.classTopicInput.value.trim();
    
    let prompt = `Crea un resumen educativo en español:\n\n"${limitedText}"\n\n`;
    if (topic) prompt += `Tema: ${topic}\n\n`;
    prompt += `Organiza en puntos clave, conceptos y recomendaciones. Usa emojis.`;

    // Lista de modelos a probar
    const modelsToTry = [
        'gemini-1.0-pro',
        'gemini-pro', 
        'models/gemini-pro',
        'gemini-1.0-pro-001'
    ];

    for (let model of modelsToTry) {
        try {
            console.log(`🔧 Probando modelo: ${model}`);
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`, {
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
                        maxOutputTokens: 800,
                    }
                })
            });

            console.log(`📥 Status para ${model}:`, response.status);

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ÉXITO con modelo: ${model}`);
                
                if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                    let summary = data.candidates[0].content.parts[0].text.trim();
                    
                    if (topic) {
                        summary = `🎯 **CLASE SOBRE: ${topic.toUpperCase()}**\n\n${summary}`;
                    }
                    
                    console.log('✨ Resumen generado con IA REAL!');
                    return summary;
                }
            } else {
                console.log(`❌ ${model} falló:`, response.status);
            }
            
        } catch (error) {
            console.log(`❌ Error con ${model}:`, error.message);
        }
    }
    
    // Si todos los modelos fallan
    throw new Error('Todos los modelos fallaron. Por favor, habilita "Generative Language API" en Google Cloud Console.');
}
