
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    // Note: ListModels is not directly exposed in the high-level SDK helper sometimes,
    // but we can try to use the model to generate content or check docs.
    // Actually, the SDK has a verify method or we can just try known models.
    // Better yet, let's just make a simple script that tries to generate with a few candidates.

    const candidates = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro-latest',
        'gemini-1.5-pro',
        'gemini-1.5-pro-001',
        'gemini-1.5-pro-002',
        'gemini-pro',
        'gemini-3.0-pro-preview',
        'gemini-3.0-pro'
    ];

    console.log('Testing models...');

    for (const modelName of candidates) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent('Hello');
            console.log(`✅ ${modelName}: SUCCESS`);
        } catch (error: any) {
            if (error.message.includes('404') || error.message.includes('not found')) {
                console.log(`❌ ${modelName}: NOT FOUND`);
            } else {
                console.log(`⚠️ ${modelName}: Error ${error.message}`);
            }
        }
    }
}

listModels();
