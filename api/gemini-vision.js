// Vercel Serverless Function - Gemini Vision OCR pour Cornell Notes
// Fichier: api/gemini-vision.js

export default async function handler(req, res) {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        // Récupération de la clé API depuis les variables d'environnement
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            console.error('Clé API Gemini manquante dans les variables d\'environnement');
            return res.status(500).json({ 
                error: 'Configuration API manquante',
                details: 'GEMINI_API_KEY non configurée dans Vercel'
            });
        }

        // Extraction des données de la requête
        const { images, courseContext } = req.body;

        // Validation des données
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                error: 'Données d\'images manquantes',
                details: 'Le champ images est requis et doit contenir au moins une image'
            });
        }

        if (images.length > 5) {
            return res.status(400).json({ 
                error: 'Trop d\'images',
                details: 'Maximum 5 images autorisées'
            });
        }

        // Construction du prompt OCR pour Gemini Vision
        const contextInfo = courseContext ? `
CONTEXTE DU COURS :
- Matière : ${courseContext.subject || 'Non précisée'}
- Chapitre : ${courseContext.chapter || 'Non précisé'}
- Professeur : ${courseContext.professor || 'Non précisé'}
- Date : ${courseContext.date || 'Non précisée'}
` : '';

        const prompt = `Tu es un expert en OCR spécialisé dans l'extraction de notes manuscrites académiques selon la méthode Cornell.

${contextInfo}

MISSION : Analyser cette/ces image(s) de notes manuscrites et extraire le contenu selon la structure Cornell.

Réponds UNIQUEMENT avec ce JSON (aucun texte avant/après) :

{
  "success": true,
  "analysis": {
    "keywords": "mots-clés extraits séparés par des virgules",
    "formulas": "formules mathématiques ou scientifiques identifiées",
    "authors": "noms d'auteurs, personnages ou figures mentionnés",
    "dates": "dates importantes ou événements historiques",
    "doubts": "questions ou points d'interrogation identifiés",
    "mainNotes": "contenu principal des notes, transcription complète du texte manuscrit avec structure et organisation",
    "summary": "résumé concis des points clés en 2-3 phrases"
  },
  "metadata": {
    "confidence": 0.95,
    "language": "fr",
    "total_text_length": 500
  }
}

IMPORTANT : 
- Transcris fidèlement le texte manuscrit
- Identifie et catégorise les éléments selon Cornell
- Préserve la structure et l'organisation
- Si certaines sections sont vides, utilise des chaînes vides ""`;

        // Préparation des images pour l'API Gemini
        const imageParts = images.map(base64Image => ({
            inlineData: {
                mimeType: "image/jpeg", // Supposons JPEG par défaut
                data: base64Image
            }
        }));

        // Construction du contenu pour l'API
        const contents = [{
            parts: [
                { text: prompt },
                ...imageParts
            ]
        }];

        // Appel à l'API Gemini Vision
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: contents,
                    generationConfig: {
                        temperature: 0.4,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 4096,
                    },
                    safetySettings: [
                        {
                            category: "HARM_CATEGORY_HARASSMENT",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        },
                        {
                            category: "HARM_CATEGORY_HATE_SPEECH",
                            threshold: "BLOCK_MEDIUM_AND_ABOVE"
                        }
                    ]
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Erreur Gemini Vision API:', geminiResponse.status, errorData);
            return res.status(geminiResponse.status).json({ 
                error: 'Erreur API Gemini Vision',
                details: `HTTP ${geminiResponse.status}: ${errorData}`,
                suggestion: 'Vérifiez la clé API et le format des images'
            });
        }

        const geminiData = await geminiResponse.json();
        
        // Vérification de la structure de réponse
        if (!geminiData.candidates || !geminiData.candidates[0] || !geminiData.candidates[0].content) {
            console.error('Structure de réponse Gemini inattendue:', geminiData);
            return res.status(500).json({
                error: 'Réponse API Gemini invalide',
                details: 'Structure de réponse inattendue'
            });
        }

        // Extraction de la réponse Gemini
        let generatedText = geminiData.candidates[0].content.parts[0].text;
        
        // Nettoyage du JSON (suppression des balises markdown si présentes)
        generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
            const parsedResponse = JSON.parse(generatedText);
            
            // Validation que la réponse contient les champs attendus
            if (!parsedResponse.analysis) {
                throw new Error('Champ analysis manquant dans la réponse');
            }

            // Retour de l'analyse OCR
            return res.status(200).json({
                success: true,
                analysis: parsedResponse.analysis,
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    timestamp: new Date().toISOString(),
                    images_processed: images.length,
                    context: courseContext || null,
                    ...parsedResponse.metadata
                }
            });
            
        } catch (parseError) {
            console.error('Erreur parsing JSON OCR:', parseError, 'Texte reçu:', generatedText);
            
            // Fallback : extraction basique si le JSON est invalide
            return res.status(200).json({
                success: true,
                analysis: {
                    keywords: "",
                    formulas: "",
                    authors: "",
                    dates: "",
                    doubts: "",
                    mainNotes: generatedText,
                    summary: "Analyse OCR effectuée - voir notes principales"
                },
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    timestamp: new Date().toISOString(),
                    images_processed: images.length,
                    note: 'JSON parsing failed, returned raw text',
                    context: courseContext || null
                }
            });
        }

    } catch (error) {
        console.error('Erreur dans gemini-vision:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
