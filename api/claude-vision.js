export default async function handler(req, res) {
  // Autoriser toutes les origines pour éviter les erreurs CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Vérifier que c'est bien une requête POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  try {
    // Récupérer les données envoyées par le frontend
    const { imageData, imageType } = req.body;
    
    // Construire le prompt spécialisé pour analyse Cornell
    const prompt = `Analyse cette image de notes manuscrites françaises et structure le contenu selon la méthode Cornell.

INSTRUCTIONS :
1. Extrait le texte manuscrit (même approximatif)
2. Identifie et classe les éléments selon la structure Cornell
3. Propose un pré-remplissage des champs du formulaire

RÉPONDS UNIQUEMENT AVEC CE JSON - RIEN D'AUTRE :
{
  "courseConfig": {
    "subject": "[matière détectée ou 'Non détecté']",
    "chapter": "[nom du chapitre détecté ou 'Non détecté']",
    "chapterNumber": "[numéro si détecté ou '']",
    "professor": "[nom prof si détecté ou 'Non spécifié']"
  },
  "cornellData": {
    "mots_cles": "[mots-clés scientifiques identifiés, séparés par des virgules]",
    "formules": "[formules et équations détectées, une par ligne]", 
    "noms_auteurs": "[noms de scientifiques mentionnés, séparés par des virgules]",
    "dates_importantes": "[dates historiques si mentionnées, format: ANNÉE: événement]",
    "doutes_questions": "[éléments peu clairs ou questions détectées]",
    "notes_principales": "[contenu principal du cours, structuré avec des paragraphes]",
    "resume_personnel": "[synthèse automatique du contenu en 2-3 phrases]"
  },
  "confidence": "[pourcentage de confiance dans l'extraction, ex: 85%]"
}`;

    // Appel à l'API Claude Vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY, // La clé sera stockée dans Vercel
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: imageType,
                  data: imageData
                }
              },
              {
                type: "text",
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API Claude Vision: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    // Nettoyer la réponse JSON (enlever les balises markdown si présentes)
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsedData = JSON.parse(responseText);
    
    // Retourner la réponse structurée au frontend
    return res.status(200).json(parsedData);
    
  } catch (error) {
    console.error("Erreur dans la fonction OCR:", error);
    return res.status(500).json({ 
      error: "Erreur lors de l'analyse de l'image", 
      details: error.message 
    });
  }
}
