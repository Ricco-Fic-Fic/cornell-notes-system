export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    console.log('🚀 Début analyse OCR réelle');
    
    const { imageData, fileName } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'Aucune image fournie' });
    }
    
    // Nettoyer les données base64
    const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
    
    // Déterminer le type MIME
    let mimeType = 'image/jpeg';
    if (imageData.includes('data:image/png')) mimeType = 'image/png';
    if (imageData.includes('data:image/webp')) mimeType = 'image/webp';
    
    console.log('📸 Image reçue:', fileName, 'Type:', mimeType);
    
    // Prompt pour analyse Cornell
    const prompt = `Analyse cette image de notes manuscrites et extrait les informations suivantes pour créer un document Cornell.

INSTRUCTIONS :
1. Lis attentivement tout le texte manuscrit visible
2. Identifie la matière/discipline (Physique, Maths, Chimie, etc.)
3. Trouve le sujet principal ou titre du chapitre
4. Extrais les mots-clés importants, termes techniques
5. Repère toutes les formules mathématiques/scientifiques
6. Note les noms de scientifiques, auteurs mentionnés
7. Identifie les dates importantes
8. Résume le contenu principal des notes

Réponds UNIQUEMENT avec ce JSON valide :
{
  "courseConfig": {
    "subject": "matière détectée",
    "chapter": "sujet/chapitre principal",
    "professor": "",
    "chapterNumber": ""
  },
  "cornellData": {
    "mots_cles": "mots-clés importants séparés par virgules",
    "formules": "toutes les formules et équations trouvées",
    "noms_auteurs": "noms de scientifiques/auteurs mentionnés",
    "dates_importantes": "dates et périodes importantes",
    "notes_principales": "contenu principal des notes manuscrites",
    "resume_personnel": "résumé synthétique du contenu"
  },
  "confidence": 85
}`;

    // Appel API Anthropic avec image
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mimeType,
                  data: base64Data
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

    console.log('📡 Réponse API status:', response.status);

    if (!response.ok) {
      console.error('❌ Erreur API:', response.status);
      // Fallback avec données par défaut
      return res.status(200).json({
        courseConfig: {
          subject: "Non détecté",
          chapter: "Analyse en cours...",
          professor: "",
          chapterNumber: ""
        },
        cornellData: {
          mots_cles: "analyse, en cours",
          formules: "",
          noms_auteurs: "",
          dates_importantes: "",
          notes_principales: "Erreur lors de l'analyse - veuillez saisir manuellement",
          resume_personnel: "Analyse OCR échouée"
        },
        confidence: 20
      });
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    console.log('📝 Réponse brute:', responseText.substring(0, 200));
    
    // Nettoyer la réponse
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const extractedData = JSON.parse(responseText);
      console.log('✅ Analyse OCR réussie');
      return res.status(200).json(extractedData);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      // Fallback si le JSON n'est pas parfait
      return res.status(200).json({
        courseConfig: {
          subject: "Analyse partielle",
          chapter: "Contenu détecté",
          professor: "",
          chapterNumber: ""
        },
        cornellData: {
          mots_cles: "analyse, partielle",
          formules: "",
          noms_auteurs: "",
          dates_importantes: "",
          notes_principales: responseText.substring(0, 500),
          resume_personnel: "Analyse partielle - vérifiez et complétez"
        },
        confidence: 50
      });
    }
    
  } catch (error) {
    console.error("❌ Erreur complète:", error);
    return res.status(500).json({ 
      error: "Erreur lors de l'analyse OCR", 
      details: error.message
    });
  }
}
