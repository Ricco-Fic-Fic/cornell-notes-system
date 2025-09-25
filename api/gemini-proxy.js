// Vercel Serverless Function - Proxy Gemini pour enrichissement Cornell
// Fichier: api/gemini-proxy.js

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

        // Extraction des données du formulaire Cornell
        const {
            courseDate,
            courseSubject,
            courseChapter,
            courseProfessor,
            keywords,
            formulas,
            authors,
            dates,
            doubts,
            mainNotes,
            currentSummary
        } = req.body;

        // Validation des données essentielles
        if (!courseSubject || !mainNotes) {
            return res.status(400).json({ 
                error: 'Données insuffisantes',
                details: 'La matière et les notes principales sont obligatoires'
            });
        }

        // Construction du prompt spécialisé pour Gemini
        const prompt = `Tu es un expert académique spécialisé en ${courseSubject}. 

CONTEXTE DU COURS :
- Date : ${courseDate}
- Matière : ${courseSubject}  
- Chapitre : ${courseChapter || 'Non précisé'}
- Professeur : ${courseProfessor || 'Non précisé'}

ÉLÉMENTS IDENTIFIÉS :
- Mots-clés : ${keywords || 'À identifier'}
- Formules : ${formulas || 'À identifier'}
- Auteurs/Personnages : ${authors || 'À identifier'}
- Dates importantes : ${dates || 'À identifier'}
- Questions/Doutes : ${doubts || 'Aucun'}

NOTES PRINCIPALES ACTUELLES :
${mainNotes}

RÉSUMÉ ACTUEL :
${currentSummary || 'À créer'}

Ta mission : Enrichir et améliorer ces notes selon la méthode Cornell en générant un JSON structuré.

Réponds UNIQUEMENT avec ce JSON (aucun texte avant/après) :

{
  "enrichissement": {
    "mots_cles_enrichis": ["liste", "des", "concepts", "clés", "améliorés"],
    "formules_identifiees": ["E=mc²", "autres formules trouvées"],
    "auteurs_personnages": ["Nom Auteur (époque)", "autre personnage important"],
    "dates_cles": ["1905 - Découverte relativité", "autre date importante"],
    "questions_reflexion": ["Pourquoi cette théorie ?", "Applications pratiques ?"]
  },
  "notes_principales_ameliorees": "Version enrichie et structurée des notes principales avec une meilleure organisation, des connections entre concepts, et des exemples concrets. Garde le niveau académique approprié.",
  "resume_synthetise": "Résumé personnel de 100-200 mots qui capture l'essence du cours, les points clés à retenir, et les implications importantes. Style personnel et mémorable.",
  "conseils_revision": "Conseils spécifiques pour réviser ce chapitre efficacement, points d'attention, et connections avec d'autres sujets du programme."
}`;

        // Appel à l'API Gemini
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${geminiApiKey}`,
            {
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
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 2048,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Erreur Gemini API:', geminiResponse.status, errorData);
            return res.status(geminiResponse.status).json({ 
                error: 'Erreur API Gemini',
                details: errorData
            });
        }

        const geminiData = await geminiResponse.json();
        
        // Extraction de la réponse Gemini
        let generatedText = geminiData.candidates[0].content.parts[0].text;
        
        // Nettoyage du JSON (suppression des balises markdown si présentes)
        generatedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        try {
            const parsedResponse = JSON.parse(generatedText);
            
            // Retour de la réponse enrichie
            return res.status(200).json({
                success: true,
                enrichment: parsedResponse,
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    timestamp: new Date().toISOString(),
                    subject: courseSubject
                }
            });
            
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError, 'Texte reçu:', generatedText);
            
            // Fallback : retourner le texte brut si le JSON est invalide
            return res.status(200).json({
                success: true,
                enrichment: {
                    notes_principales_ameliorees: generatedText,
                    resume_synthetise: "Résumé généré par IA - voir notes principales améliorées",
                    conseils_revision: "Relire les notes principales et identifier les concepts clés"
                },
                metadata: {
                    model: 'gemini-2.0-flash-exp',
                    timestamp: new Date().toISOString(),
                    subject: courseSubject,
                    note: 'JSON parsing failed, returned as text'
                }
            });
        }

    } catch (error) {
        console.error('Erreur dans gemini-proxy:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
}
