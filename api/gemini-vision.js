// Vercel Serverless Function - Gemini Vision OCR pour Cornell Notes
export default async function handler(req, res) {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false,
            error: 'Méthode non autorisée' 
        });
    }

    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            console.error('GEMINI_API_KEY manquante');
            return res.status(500).json({ 
                success: false,
                error: 'Configuration API manquante'
            });
        }

        const { images } = req.body;

        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: 'Aucune image fournie'
            });
        }

        // Construction du prompt OCR optimisé pour Cornell
        const prompt = `Analyse ces notes manuscrites et extrais le contenu selon la méthode Cornell.

IMPORTANT: Ta réponse doit être UNIQUEMENT un objet JSON valide, sans texte avant ou après.

Structure JSON attendue:
{
  "extractedData": {
    "matiere": "nom de la matière si visible",
    "chapitre": "titre du chapitre si visible",
    "professeur": "nom du professeur si visible",
    "mots_cles": ["mot1", "mot2", "mot3"],
    "formules": ["formule1", "formule2"],
    "auteurs": ["auteur1", "auteur2"],
    "dates": ["date1", "date2"],
    "contenu_principal": "texte principal des notes"
  }
}

Extrais le maximum d'informations visibles dans les notes manuscrites.`;

        // Préparation des images pour l'API Gemini
        const imageParts = images.map(img => ({
            inlineData: {
                mimeType: img.data.includes('image/png') ? 'image/png' : 
                          img.data.includes('image/webp') ? 'image/webp' : 'image/jpeg',
                data: img.data.split(',')[1] // Enlever le préfixe data:image/...;base64,
            }
        }));

        // Appel API Gemini Vision
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            ...imageParts
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        topK: 32,
                        topP: 1,
                        maxOutputTokens: 4096,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error('Erreur Gemini API:', geminiResponse.status, errorText);
            return res.status(500).json({
                success: false,
                error: `Erreur API Gemini: ${geminiResponse.status}`,
                details: errorText
            });
        }

        const geminiData = await geminiResponse.json();
        
        if (!geminiData.candidates || !geminiData.candidates[0]) {
            console.error('Réponse Gemini invalide:', geminiData);
            return res.status(500).json({
                success: false,
                error: 'Réponse API invalide'
            });
        }

        let responseText = geminiData.candidates[0].content.parts[0].text;
        
        // Nettoyage du texte (enlever markdown si présent)
        responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
            const parsedResponse = JSON.parse(responseText);
            
            return res.status(200).json({
                success: true,
                extractedData: parsedResponse.extractedData || parsedResponse,
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    images_processed: images.length,
                    timestamp: new Date().toISOString()
                }
            });
            
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError, 'Texte:', responseText);
            
            // Fallback: retourner le texte brut dans contenu_principal
            return res.status(200).json({
                success: true,
                extractedData: {
                    matiere: "",
                    chapitre: "",
                    professeur: "",
                    mots_cles: [],
                    formules: [],
                    auteurs: [],
                    dates: [],
                    contenu_principal: responseText
                },
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    images_processed: images.length,
                    timestamp: new Date().toISOString(),
                    note: 'JSON parsing failed, returned raw text'
                }
            });
        }

    } catch (error) {
        console.error('Erreur serveur:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
}
