
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Hardcoded key from .env since we can't easily load dotenv without install if not present (though it likely is)
// Actually, I'll read it from process.env if run with --env-file or just hardcode it for this test script as I know it.
const API_KEY = 'AIzaSyCyVAyWjISwoqKJfsKNhAHFwNzjxBQyngw';

async function listModels() {
    const genAI = new GoogleGenerativeAI(API_KEY);

    const candidates = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-1.5-pro-001',
        'gemini-1.5-pro-002',
        'gemini-3.0-pro',
        'gemini-1.5-flash-latest'
    ];

    console.log('Testing models...');

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            console.log(`✅ ${modelName}: SUCCESS`);
        } catch (error) {
            if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
                console.log(`❌ ${modelName}: NOT FOUND`);
            } else {
                console.log(`⚠️ ${modelName}: Error ${error.message}`);
            }
        }
    }
}

listModels();
