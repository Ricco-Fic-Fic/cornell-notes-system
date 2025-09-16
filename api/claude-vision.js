// api/claude-vision.js - OCR Super-Intelligent
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
        const { images, mode, prompt } = req.body;
        
        if (!images || images.length === 0) {
            return res.status(400).json({ error: 'Aucune image fournie' });
        }
        
        // Configuration API Anthropic
        const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'Clé API Anthropic manquante' });
        }
        
        // Préparer les images pour Claude Vision
        const imageContents = images.map(img => ({
            type: "image",
            source: {
                type: "base64",
                media_type: img.type || "image/jpeg",
                data: img.data.split(',')[1] // Enlever le préfixe data:image/...
            }
        }));
        
        // Messages pour Claude Vision avec prompt OCR expert
        const messages = [
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: prompt || `
Tu es un expert académique spécialisé dans l'analyse de notes manuscrites. 
Analyse ces images avec une précision maximale et extrais TOUS les éléments suivants :

## EXTRACTION OBLIGATOIRE :

### 1. CONFIGURATION DU COURS :
- **Matière** : Identifie le domaine (Physique, Histoire, Littérature, etc.)
- **Chapitre/Titre** : Le sujet principal traité
- **Professeur** : Nom mentionné ou déduit du contexte
- **Date** : Date des notes ou du cours (format JJ/MM/AAAA)

### 2. MOTS-CLÉS CONCEPTUELS :
- Termes techniques et scientifiques principaux
- Concepts fondamentaux à retenir
- Vocabulaire spécialisé important
- Notions centrales du chapitre

### 3. FORMULES ET ÉQUATIONS :
- Toutes les formules mathématiques/scientifiques
- Équations chimiques ou physiques
- Expressions algébriques
- Lois et théorèmes avec leur notation

### 4. NOMS D'AUTEURS ET PERSONNAGES :
- Scientifiques, chercheurs, inventeurs
- Auteurs littéraires, philosophes
- Personnages historiques
- Toute personne mentionnée avec son rôle

### 5. DATES IMPORTANTES :
- Découvertes scientifiques
- Événements historiques
- Publications importantes
- Chronologie des événements

### 6. DOUTES ET QUESTIONS :
- Points d'interrogation ou de confusion
- Questions posées dans les notes
- Éléments à clarifier ou approfondir
- Difficultés identifiées

### 7. NOTES PRINCIPALES :
- Contenu principal détaillé
- Explications et développements
- Exemples concrets
- Liens entre concepts

### 8. RÉSUMÉ PERSONNEL :
- Synthèses présentes dans les notes
- Conclusions personnelles
- Points de vue de l'étudiant
- Réflexions et analyses

## FORMAT DE RÉPONSE OBLIGATOIRE :

Réponds UNIQUEMENT en JSON structuré :

{
  "courseConfig": {
    "subject": "Matière identifiée",
    "chapter": "Titre du chapitre",
    "professor": "Nom du professeur",
    "date": "Date au format AAAA-MM-JJ"
  },
  "cornellData": {
    "mots_cles": "Liste des mots-clés séparés par des virgules",
    "formules": "Toutes les formules identifiées, une par ligne",
    "noms_auteurs": "Noms et rôles, un par ligne",
    "dates_importantes": "Dates avec événements, une par ligne",
    "doutes_questions": "Questions et doutes identifiés",
    "notes_principales": "Contenu principal complet et détaillé",
    "resume_personnel": "Synthèse et résumé personnel si présent"
  },
  "confidence": 95,
  "analysis_quality": "excellent",
  "extracted_elements": {
    "formulas_count": 3,
    "keywords_count": 15,
    "authors_count": 2,
    "dates_count": 4
  }
}

## INSTRUCTIONS CRITIQUES :
- EXTRAIS TOUT, même les détails qui semblent mineurs
- CONSERVE la notation exacte des formules
- IDENTIFIE le contexte académique précis
- STRUCTURE les informations logiquement
- PRIORISE la précision sur la brièveté
- N'OMETS aucun élément visible dans l'image

Analyse maintenant ces notes manuscrites avec une précision d'expert académique.
                        `
                    },
                    ...imageContents
                ]
            }
        ];
        
        // Appel API Claude Vision
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
            return res.status(500).json({ error: 'Réponse vide de Claude Vision' });
        }
        
        // Parser la réponse JSON de Claude
        let ocrResult;
        try {
            // Nettoyer le texte pour extraire le JSON
            const cleanedContent = content
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            
            ocrResult = JSON.parse(cleanedContent);
            
            // Validation et nettoyage des données
            if (!ocrResult.courseConfig) ocrResult.courseConfig = {};
            if (!ocrResult.cornellData) ocrResult.cornellData = {};
            if (!ocrResult.confidence) ocrResult.confidence = 85;
            if (!ocrResult.analysis_quality) ocrResult.analysis_quality = "good";
            if (!ocrResult.extracted_elements) ocrResult.extracted_elements = {};
            
        } catch (parseError) {
            console.error('Erreur parsing JSON:', parseError);
            console.log('Contenu reçu:', content);
            
            // Fallback: extraction basique si le JSON est malformé
            ocrResult = {
                courseConfig: {
                    subject: "Matière non identifiée",
                    chapter: "Chapitre à définir",
                    professor: "Professeur à renseigner",
                    date: new Date().toISOString().split('T')[0]
                },
                cornellData: {
                    notes_principales: content.substring(0, 500) + "...",
                    mots_cles: "Extraction manuelle requise",
                    formules: "Formules à identifier manuellement",
                    noms_auteurs: "Auteurs à identifier manuellement",
                    dates_importantes: "Dates à identifier manuellement",
                    doutes_questions: "Questions à identifier manuellement",
                    resume_personnel: "Résumé à rédiger manuellement"
                },
                confidence: 60,
                analysis_quality: "limited",
                extracted_elements: {
                    formulas_count: 0,
                    keywords_count: 0,
                    authors_count: 0,
                    dates_count: 0
                },
                fallback_used: true,
                raw_content: content
            };
        }
        
        // Log pour debugging
        console.log('OCR Result:', {
            confidence: ocrResult.confidence,
            quality: ocrResult.analysis_quality,
            extracted: ocrResult.extracted_elements
        });
        
        return res.status(200).json(ocrResult);
        
    } catch (error) {
        console.error('Erreur serveur OCR:', error);
        return res.status(500).json({ 
            error: 'Erreur serveur lors de l\'analyse OCR',
            details: error.message
        });
    }
}
