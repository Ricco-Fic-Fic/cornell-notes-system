// api/claude-proxy.js - Génération Cornell IA
export default async function handler(req, res) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }
    
    try {
        const { courseConfig, cornellData, uploadedImages } = req.body;
        
        // Configuration API Anthropic
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'Clé API Anthropic manquante' });
        }
        
        // Construction du prompt pour génération Cornell
        const cornellPrompt = `
Tu es un assistant pédagogique expert qui génère des résumés Cornell Notes de qualité académique.

## DONNÉES DU COURS :
**Matière :** ${courseConfig.subject}
**Chapitre :** ${courseConfig.chapter}
**Professeur :** ${courseConfig.professor}
**Date :** ${courseConfig.date}

## NOTES FOURNIES :
**Mots-clés :** ${cornellData.mots_cles}
**Formules :** ${cornellData.formules}
**Noms d'auteurs :** ${cornellData.noms_auteurs}
**Dates importantes :** ${cornellData.dates_importantes}
**Doutes/Questions :** ${cornellData.doutes_questions}
**Notes principales :** ${cornellData.notes_principales}
**Résumé personnel :** ${cornellData.resume_personnel}

## MISSION :
Génère un résumé Cornell Notes complet et structuré qui reprend TOUS les éléments fournis et les organise de façon pédagogique optimale.

## FORMAT DE RÉPONSE OBLIGATOIRE :
Réponds UNIQUEMENT en JSON structuré comme suit :

{
  "resume_executif": "Une synthèse globale du chapitre en 2-3 phrases percutantes qui capture l'essence du sujet",
  "concepts_cles": [
    "concept1",
    "concept2",
    "concept3"
  ],
  "definitions": [
    {
      "terme": "Terme technique 1",
      "definition": "Définition claire et précise"
    },
    {
      "terme": "Terme technique 2", 
      "definition": "Définition claire et précise"
    }
  ],
  "formules_lois": [
    {
      "nom": "Nom de la formule/loi",
      "expression": "Expression mathématique exacte",
      "description": "Usage et signification"
    }
  ],
  "personnages_dates": [
    {
      "nom": "Nom de la personne",
      "contribution": "Apport/découverte principale",
      "date": "Période ou date exacte"
    }
  ],
  "chronologie": [
    {
      "periode": "Date/Époque",
      "evenement": "Événement marquant"
    }
  ],
  "questions_revision": [
    {
      "niveau": "facile",
      "question": "Question de révision de niveau facile",
      "indice": "Aide pour répondre"
    },
    {
      "niveau": "moyen",
      "question": "Question de révision de niveau moyen",
      "indice": "Aide pour répondre"
    },
    {
      "niveau": "difficile",
      "question": "Question de révision de niveau difficile",
      "indice": "Aide pour répondre"
    }
  ],
  "points_attention": [
    "Erreur courante à éviter",
    "Point de vigilance important",
    "Piège classique"
  ],
  "liens_conceptuels": [
    "Lien entre concept A et concept B",
    "Relation avec chapitre précédent",
    "Application pratique"
  ]
}

## INSTRUCTIONS CRITIQUES :
- UTILISE tous les éléments fournis dans les notes
- STRUCTURE l'information de façon logique et pédagogique
- CRÉE des questions de révision de différents niveaux
- IDENTIFIE les points d'attention et erreurs courantes
- ÉTABLIS des liens conceptuels pertinents
- CONSERVE la précision scientifique/académique
- ADAPTE le vocabulaire au niveau d'études approprié

Génère maintenant le résumé Cornell Notes complet.
        `;
        
        // Messages pour Claude
        const messages = [
            {
                role: "user",
                content: cornellPrompt
            }
        ];
        
        // Appel API Claude
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: "claude-3-5-sonnet-20241022",
                max_tokens: 4000,
                messages: messages
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Erreur API Anthropic:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `Erreur API Anthropic: ${response.status}`,
                details: errorText
            });
        }
        
        const data = await response.json();
        const content = data.content[0]?.text;
        
        if (!content) {
            return res.status(500).json({ error: 'Réponse vide de Claude' });
        }
        
        // Parser la réponse JSON de Claude
        let cornellResult;
        try {
            // Nettoyer le texte pour extraire le JSON
            const cleanedContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            
            cornellResult = JSON.parse(cleanedContent);
            
            // Validation des données obligatoires
            if (!cornellResult.resume_executif) {
                cornellResult.resume_executif = `Résumé du chapitre ${courseConfig.chapter} en ${courseConfig.subject}`;
            }
            
            if (!cornellResult.concepts_cles) cornellResult.concepts_cles = [];
            if (!cornellResult.definitions) cornellResult.definitions = [];
            if (!cornellResult.formules_lois) cornellResult.formules_lois = [];
            if (!cornellResult.personnages_dates) cornellResult.personnages_dates = [];
            if (!cornellResult.chronologie) cornellResult.chronologie = [];
            if (!cornellResult.questions_revision) cornellResult.questions_revision = [];
            if (!cornellResult.points_attention) cornellResult.points_attention = [];
            if (!cornellResult.liens_conceptuels) cornellResult.liens_conceptuels = [];
            
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError);
            console.log('Contenu reçu:', content);
            
            // Fallback: structure minimale
            cornellResult = {
                resume_executif: `Résumé du chapitre ${courseConfig.chapter} en ${courseConfig.subject} généré à partir des notes fournies.`,
                concepts_cles: cornellData.mots_cles ? cornellData.mots_cles.split(',').map(k => k.trim()) : [],
                definitions: [],
                formules_lois: cornellData.formules ? [
                    {
                        nom: "Formules identifiées",
                        expression: cornellData.formules,
                        description: "Formules extraites des notes"
                    }
                ] : [],
                personnages_dates: cornellData.noms_auteurs ? [
                    {
                        nom: cornellData.noms_auteurs,
                        contribution: "Contribution mentionnée dans les notes",
                        date: cornellData.dates_importantes || "Date à préciser"
                    }
                ] : [],
                chronologie: [],
                questions_revision: [
                    {
                        niveau: "moyen",
                        question: `Quels sont les concepts clés du chapitre ${courseConfig.chapter} ?`,
                        indice: "Référez-vous aux mots-clés identifiés"
                    }
                ],
                points_attention: cornellData.doutes_questions ? [cornellData.doutes_questions] : [],
                liens_conceptuels: [`Relations entre les concepts du chapitre ${courseConfig.chapter}`],
                fallback_used: true,
                raw_content: content
            };
        }
        
        // Ajout de métadonnées utiles
        cornellResult.generated_at = new Date().toISOString();
        cornellResult.course_info = {
            subject: courseConfig.subject,
            chapter: courseConfig.chapter,
            professor: courseConfig.professor,
            date: courseConfig.date
        };
        
        // Log pour debugging
        console.log('Cornell Result Generated:', {
            resume_length: cornellResult.resume_executif?.length || 0,
            concepts_count: cornellResult.concepts_cles?.length || 0,
            definitions_count: cornellResult.definitions?.length || 0,
            questions_count: cornellResult.questions_revision?.length || 0
        });
        
        return res.status(200).json(cornellResult);
        
    } catch (error) {
        console.error('Erreur serveur Cornell:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la génération Cornell',
            details: error.message
        });
    }
}
