// Vercel Serverless Function - Gemini Vision pour OCR des images manuscrites
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
        const { images, subject, level } = req.body;

        // Validation des données
        if (!images || !Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ 
                error: 'Images manquantes',
                details: 'Au moins une image est requise pour l\'analyse OCR'
            });
        }

        if (!subject) {
            return res.status(400).json({ 
                error: 'Matière manquante',
                details: 'La matière est obligatoire pour contextualiser l\'analyse'
            });
        }

        // Construction du prompt OCR spécialisé pour Gemini Vision
        const prompt = `Tu es un expert académique spécialisé en ${subject}. 

Analyse ces images de notes manuscrites et extrais TOUTES les informations pertinentes.

CONSIGNES SPÉCIALES :
- Lis attentivement toute l'écriture manuscrite visible
- Identifie les formules mathématiques/scientifiques avec précision
- Repère les noms d'auteurs, dates, et références importantes
- Note les questions ou points d'interrogation du student
- Contextualise selon le niveau académique : ${level || 'Lycée/Université'}

Réponds UNIQUEMENT avec ce JSON structuré (aucun texte avant/après) :

{
  "extraction_ocr": {
    "titre_cours": "Titre ou sujet principal identifié",
    "date_cours": "Date si visible (format JJ/MM/AAAA)",
    "professeur": "Nom du professeur si mentionné",
    "mots_cles": ["concept1", "concept2", "théorie3", "..."],
    "formules": ["E=mc²", "F=ma", "autre formule identifiée", "..."],
    "auteurs_personnages": ["Newton (1643-1727)", "Einstein", "autre personnage", "..."],
    "dates_importantes": ["1687 - Principia Mathematica", "1905 - Relativité", "..."],
    "questions_doutes": ["Question identifiée ?", "Point peu clair ?", "..."],
    "texte_integral": "Transcription complète de tout le texte manuscrit visible dans l'image, en conservant la structure et l'organisation originale"
  },
  "analyse_contenu": {
    "niveau_detected": "Niveau académique détecté (collège/lycée/université/master)",
    "complexite": "Simple/Moyen/Avancé",
    "themes_principaux": ["thème 1", "thème 2", "..."],
    "qualite_ecriture": "Lisible/Difficile/Illisible par endroits",
    "completude_notes": "Notes complètes/partielles/fragmentaires"
  },
  "recommendations": {
    "elements_manquants": ["Qu'est-ce qui pourrait être ajouté"],
    "points_clarification": ["Points nécessitant plus d'explication"],
    "suggestions_organisation": "Comment mieux organiser ces notes"
  }
}`;

        // Préparation des images pour l'API Gemini Vision
        const imageParts = images.map(image => {
            // Suppression du préfixe data:image/...;base64, si présent
            const base64Data = image.includes(',') ? image.split(',')[1] : image;
            
            return {
                inline_data: {
                    mime_type: image.startsWith('data:image/png') ? 'image/png' : 
                               image.startsWith('data:image/jpg') ? 'image/jpeg' :
                               image.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png',
                    data: base64Data
                }
            };
        });

        // Construction du contenu pour Gemini
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
                        temperature: 0.3, // Précision élevée pour l'OCR
                        topK: 32,
                        topP: 0.9,
                        maxOutputTokens: 3000,
                    }
                })
            }
        );

        if (!geminiResponse.ok) {
            const errorData = await geminiResponse.text();
            console.error('Erreur Gemini Vision API:', geminiResponse.status, errorData);
            return res.status(geminiResponse.status).json({ 
                error: 'Erreur API Gemini Vision',
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
            
            // Retour de l'analyse OCR
            return res.status(200).json({
                success: true,
                ocr_result: parsedResponse,
                metadata: {
                    model: 'gemini-2.0-flash-exp-vision',
                    timestamp: new Date().toISOString(),
                    subject: subject,
                    images_count: images.length
                }
            });
            
        } catch (parseError) {
            console.error('Erreur parsing JSON OCR:', parseError, 'Texte reçu:', generatedText);
            
            // Fallback : extraction manuelle des informations si le JSON est invalide
            return res.status(200).json({
                success: true,
                ocr_result: {
                    extraction_ocr: {
                        titre_cours: `Cours de ${subject}`,
                        texte_integral: generatedText,
                        mots_cles: extractKeywords(generatedText, subject),
                        formulas: extractFormulas(generatedText),
                        questions_doutes: ["Analyser l'image pour identifier les questions"]
                    },
                    analyse_contenu: {
                        niveau_detected: level || 'À déterminer',
                        qualite_ecriture: 'Analyse en cours'
                    }
                },
                metadata: {
                    model: 'gemini-2.0-flash-exp-vision',
                    timestamp: new Date().toISOString(),
                    subject: subject,
                    images_count: images.length,
                    note: 'JSON parsing failed, extracted text returned'
                }
            });
        }

    } catch (error) {
        console.error('Erreur dans gemini-vision:', error);
        return res.status(500).json({ 
            error: 'Erreur interne du serveur',
            details: error.message
        });
    }
}

// Fonctions utilitaires pour le fallback
function extractKeywords(text, subject) {
    const commonKeywords = {
        'Physique': ['énergie', 'force', 'masse', 'vitesse', 'accélération'],
        'Mathématiques': ['équation', 'fonction', 'dérivée', 'intégrale', 'limite'],
        'Chimie': ['réaction', 'molécule', 'atome', 'liaison', 'élément'],
        'Histoire': ['date', 'événement', 'personnage', 'époque', 'siècle'],
        'Biologie': ['cellule', 'organisme', 'évolution', 'génétique', 'écosystème']
    };
    
    return commonKeywords[subject] || ['concept', 'théorie', 'principe'];
}

function extractFormulas(text) {
    const formulaPatterns = [
        /[A-Z][a-z]?\s*=\s*[^,\s]+/g, // E = mc²
        /\d+\s*[+\-×÷]\s*\d+/g,        // 2 + 2
        /[a-zA-Z]\([a-zA-Z]\)/g         // f(x)
    ];
    
    const formulas = [];
    formulaPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) formulas.push(...matches);
    });
    
    return formulas.slice(0, 5); // Limiter à 5 formules
}
