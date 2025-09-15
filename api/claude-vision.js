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
    const { imageData } = req.body;
    
    if (!imageData) {
      throw new Error('Aucune image fournie');
    }
    
    // Nettoyage des données base64
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // PROMPT ULTRA-SIMPLE pour test
    const prompt = `Regarde cette image et dis-moi ce que tu vois.
    
Réponds seulement avec ce JSON simple:
{
  "confidence": 85,
  "what_i_see": "description de ce que tu vois dans l'image",
  "text_found": "le texte que tu arrives à lire",
  "subject_guess": "matière supposée"
}`;

    console.log("Début appel Claude Vision...");

    // Appel à Claude Vision avec paramètres simplifiés
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022", // Test avec Haiku plus simple
        max_tokens: 1000,
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

    console.log("Statut réponse Claude:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur API Claude:", errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("Réponse Claude reçue:", data);
    
    let responseText = data.content[0].text;
    console.log("Texte brut:", responseText);
    
    // Nettoyage JSON
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const result = JSON.parse(responseText);
      console.log("JSON parsé:", result);
      
      // Conversion vers format Cornell pour compatibilité
      return res.status(200).json({
        confidence: result.confidence || 75,
        courseConfig: {
          subject: result.subject_guess || "Test Diagnostic",
          chapter: "Test OCR - " + (result.what_i_see || "Analyse"),
          chapterNumber: "",
          professor: "Test"
        },
        cornellData: {
          mots_cles: "test, diagnostic, ocr",
          formules: "",
          noms_auteurs: "",
          dates_importantes: "",
          doutes_questions: "",
          notes_principales: result.text_found || result.what_i_see || "Test diagnostic OCR",
          resume_personnel: "Test de diagnostic OCR avec prompt simplifié"
        },
        analysis_details: {
          detected_language: "français",
          content_type: "test diagnostic",
          handwriting_quality: "test",
          extraction_notes: "Version test pour diagnostic - Claude Vision " + (result.confidence || 75) + "% confiance"
        }
      });
      
    } catch (parseError) {
      console.error("Erreur parsing:", parseError);
      
      // Retourner la réponse brute pour debug
      return res.status(200).json({
        confidence: 50,
        courseConfig: {
          subject: "Debug Mode",
          chapter: "Réponse brute Claude",
          chapterNumber: "",
          professor: "Debug"
        },
        cornellData: {
          mots_cles: "debug, test",
          formules: "",
          noms_auteurs: "",
          dates_importantes: "",
          doutes_questions: "",
          notes_principales: "RÉPONSE BRUTE CLAUDE: " + responseText,
          resume_personnel: "Mode debug - voir réponse brute"
        },
        debug_info: {
          raw_response: responseText,
          parse_error: parseError.message
        }
      });
    }
    
  } catch (error) {
    console.error("Erreur globale:", error);
    
    return res.status(200).json({
      confidence: 5,
      courseConfig: {
        subject: "Erreur Système",
        chapter: "Erreur: " + error.message,
        chapterNumber: "",
        professor: "Debug"
      },
      cornellData: {
        mots_cles: "erreur, debug",
        formules: "",
        noms_auteurs: "",
        dates_importantes: "",
        doutes_questions: "",
        notes_principales: "ERREUR SYSTÈME: " + error.message + " | Stack: " + error.stack,
        resume_personnel: "Erreur système détectée"
      }
    });
  }
}
