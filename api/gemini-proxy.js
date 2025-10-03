export default async function handler(req, res) {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const geminiApiKey = process.env.GEMINI_API_KEY;
        
        if (!geminiApiKey) {
            return res.status(500).json({ 
                error: 'Configuration serveur manquante',
                details: 'GEMINI_API_KEY non configurée'
            });
        }

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

        if (!courseSubject || !mainNotes) {
            return res.status(400).json({ 
                error: 'Données manquantes',
                details: 'courseSubject et mainNotes sont requis'
            });
        }

        // Construction du prompt spécialisé pour Gemini
        const prompt = `Tu es un assistant IA spécialisé dans l'enrichissement de notes académiques selon la méthode Cornell.

Contexte du cours:
- Matière: ${courseSubject}
- Chapitre: ${courseChapter}
- Date: ${courseDate}
- Professeur: ${courseProfessor}

Mots-clés actuels: ${keywords}
Formules: ${formulas}
Auteurs: ${authors}
Dates importantes: ${dates}
Questions/doutes: ${doubts}

Notes principales:
${mainNotes}

Résumé actuel:
${currentSummary}

INSTRUCTIONS IMPORTANTES:

1. **Mots-clés**: Réduis à 5-7 mots-clés MAXIMUM, les plus importants uniquement
2. **Questions**: Génère 2-4 questions de réflexion pertinentes et ciblées (pas de questions génériques)
3. **Notes structurées**: Réorganise les notes principales avec:
   - Des paragraphes courts (3-4 lignes max)
   - Des sous-titres clairs (préfixe "### ")
   - Une hiérarchie logique
   - Des transitions fluides

Réponds UNIQUEMENT avec ce JSON (aucun texte avant/après):

{
  "enrichissement": {
    "mots_cles_enrichis": ["5-7 concepts clés uniquement"],
    "formules_identifiees": ["formules importantes"],
    "auteurs_personnages": ["Nom Auteur (contexte)"],
    "dates_cles": ["Date - Événement"],
    "questions_reflexion": ["Question 1 pertinente?", "Question 2 ciblée?", "Question 3 analytique?"]
  },
  "notes_principales_ameliorees": "### Introduction\nPremier paragraphe clair et concis.\n\n### Point clé 1\nExplication structurée...\n\n### Point clé 2\nSuite logique...",
  "resume_synthetise": "Résumé personnel de 100-200 mots, style académique mais mémorable.",
  "conseils_revision": "Conseils spécifiques pour réviser ce chapitre."
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
