export default async function handler(req, res) {
  // Configuration CORS
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
    // Extraction de l'image base64
    const { imageData } = req.body;
    
    if (!imageData) {
      throw new Error('Aucune image fournie');
    }
    
    // Nettoyage des données base64
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Prompt OCR universel pour toutes matières académiques
    const prompt = `Tu es un expert en analyse OCR de notes manuscrites académiques françaises, spécialisé dans TOUTES les matières scolaires et universitaires.

MISSION : Analyser cette image de notes manuscrites et extraire les informations pour créer un document Cornell.

INSTRUCTIONS UNIVERSELLES :
1. Lis attentivement TOUT le texte manuscrit visible
2. Identifie automatiquement la matière (Physique, Maths, Français, Droit, Comptabilité, Histoire, Philosophie, etc.)
3. Adapte l'extraction selon le type de contenu détecté
4. Extrais les éléments pertinents selon la matière :
   - SCIENCES : formules, équations, unités, lois
   - DROIT : articles, jurisprudence, définitions juridiques
   - COMPTABILITÉ : comptes, écritures, ratios
   - FRANÇAIS/LITTÉRATURE : citations, auteurs, figures de style
   - HISTOIRE : dates, personnages, événements
   - PHILOSOPHIE : concepts, arguments, philosophes
   - LANGUES : vocabulaire, grammaire, expressions

FORMAT DE RÉPONSE OBLIGATOIRE - JSON STRICT :
{
  "confidence": [score de 0 à 100 sur la qualité de lecture],
  "courseConfig": {
    "subject": "[matière détectée ou 'Non détecté']",
    "chapter": "[chapitre/sujet principal ou 'Analyse du contenu manuscrit']",
    "chapterNumber": "[numéro si visible ou '']",
    "professor": "[nom professeur si visible ou 'Non spécifié']"
  },
  "cornellData": {
    "mots_cles": "[mots-clés scientifiques séparés par des virgules]",
    "formules": "[toutes les formules mathématiques/chimiques/physiques visibles]",
    "noms_auteurs": "[noms de scientifiques ou auteurs mentionnés]",
    "dates_importantes": "[dates historiques ou chronologie]",
    "doutes_questions": "[questions ou points d'interrogation dans les notes]",
    "notes_principales": "[résumé structuré de TOUT le contenu des notes manuscrites]",
    "resume_personnel": "[synthèse du sujet principal en 2-3 phrases]"
  },
  "analysis_details": {
    "detected_language": "français",
    "content_type": "[type de contenu: cours, exercices, définitions, etc.]",
    "handwriting_quality": "[qualité écriture: excellente/bonne/moyenne/difficile]",
    "extraction_notes": "[observations sur la lecture des notes]"
  }
}

RÈGLES UNIVERSELLES :
- Si tu ne peux pas lire une partie, indique "Illisible" plutôt que d'inventer
- Privilégie la précision à la quantité  
- Adapte l'extraction selon la matière détectée :
  * SCIENCES : formules, unités, lois, expériences
  * DROIT : articles, jurisprudence, procédures
  * COMPTABILITÉ : comptes, écritures, bilans
  * LITTÉRATURE : citations, auteurs, mouvements
  * HISTOIRE : dates, personnages, contextes
  * LANGUES : vocabulaire, grammaire, conjugaisons
  * PHILOSOPHIE : concepts, arguments, penseurs
- Garde le niveau de confiance réaliste (50-80% pour manuscrit)
- Extrais les éléments les plus importants pour révisions

ANALYSE L'IMAGE MAINTENANT :`;

    // Appel à Claude Vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorDetails = await response.text();
      console.error("Erreur API Claude Vision:", response.status, errorDetails);
      throw new Error(`Erreur API Claude Vision: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    // Nettoyage de la réponse JSON
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const ocrResult = JSON.parse(responseText);
      
      // Validation des données essentielles
      if (!ocrResult.confidence) ocrResult.confidence = 30;
      if (!ocrResult.courseConfig) ocrResult.courseConfig = {};
      if (!ocrResult.cornellData) ocrResult.cornellData = {};
      
      // Valeurs par défaut si extraction échoue
      if (!ocrResult.courseConfig.subject) ocrResult.courseConfig.subject = "Non détecté";
      if (!ocrResult.courseConfig.chapter) ocrResult.courseConfig.chapter = "Analyse du contenu manuscrit";
      if (!ocrResult.courseConfig.professor) ocrResult.courseConfig.professor = "Non spécifié";
      
      return res.status(200).json(ocrResult);
      
    } catch (parseError) {
      console.error("Erreur parsing JSON OCR:", parseError);
      
      // Fallback si le JSON est malformé
      return res.status(200).json({
        confidence: 25,
        courseConfig: {
          subject: "Analyse en cours",
          chapter: "Contenu détecté mais extraction partielle",
          chapterNumber: "",
          professor: "Non spécifié"
        },
        cornellData: {
          mots_cles: "analyse, contenu manuscrit",
          formules: "Formules détectées mais illisibles",
          noms_auteurs: "",
          dates_importantes: "",
          doutes_questions: "Vérifier qualité de l'image pour améliorer extraction",
          notes_principales: "Contenu manuscrit détecté. Qualité d'image ou écriture rend l'extraction difficile. Recommandation : saisie manuelle ou image plus nette.",
          resume_personnel: "Document manuscrit analysé avec extraction partielle des informations."
        },
        analysis_details: {
          detected_language: "français",
          content_type: "notes manuscrites",
          handwriting_quality: "difficile à lire",
          extraction_notes: "Image analysée mais extraction limitée - essayer avec image plus nette"
        }
      });
    }
    
  } catch (error) {
    console.error("Erreur dans claude-vision:", error);
    
    return res.status(200).json({
      confidence: 10,
      courseConfig: {
        subject: "Erreur d'analyse",
        chapter: "Erreur lors de l'analyse - veuillez saisir manuellement",
        chapterNumber: "",
        professor: "Non disponible"
      },
      cornellData: {
        mots_cles: "erreur, analyse",
        formules: "",
        noms_auteurs: "",
        dates_importantes: "",
        doutes_questions: "Problème technique lors de l'analyse OCR",
        notes_principales: "Erreur lors de l'analyse automatique. Veuillez utiliser la saisie manuelle ou réessayer avec une image différente.",
        resume_personnel: "Analyse OCR échouée - saisie manuelle recommandée."
      },
      analysis_details: {
        detected_language: "français",
        content_type: "erreur",
        handwriting_quality: "non analysable",
        extraction_notes: "Erreur technique : " + error.message
      }
    });
  }
}
