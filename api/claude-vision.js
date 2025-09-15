export default async function handler(req, res) {
  // Headers CORS
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
    console.log('🚀 Début analyse OCR');
    
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
    const prompt = `Analyse cette image de notes manuscrites et extrait les informations suivantes pour créer un document Cornell :

1. MATIÈRE : Identifie la matière/discipline (Physique, Maths, Chimie, etc.)
2. CHAPITRE/SUJET : Le titre du chapitre ou sujet principal
3. MOTS-CLÉS : Les termes importants, concepts clés
4. FORMULES : Toutes les équations, formules mathématiques/scientifiques
5. NOMS D'AUTEUR : Scientifiques, auteurs, personnages mentionnés
6. DATES : Dates importantes, périodes historiques
7. NOTES PRINCIPALES : Le contenu principal des notes
8. POINTS IMPORTANTS : Éléments soulignés, encadrés, importants

Réponds UNIQUEMENT avec ce JSON valide :
{
  "subject": "matière détectée",
  "chapter": "titre du chapitre/sujet",
  "professor": "",
  "mots_cles": "mots-clés séparés par virgules",
  "formules": "formules et équations",
  "noms_auteurs": "noms de scientifiques/auteurs",
  "dates_importantes": "dates importantes",
  "notes_principales": "contenu principal des notes manuscrites",
  "resume_personnel": "résumé des points essentiels",
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
      const errorText = await response.text();
      console.error('❌ Erreur API:', response.status, errorText);
      throw new Error(`Erreur API Anthropic: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    console.log('📝 Réponse brute:', responseText.substring(0, 200));
    
    // Nettoyer la réponse
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    try {
      const extractedData = JSON.parse(responseText);
      console.log('✅ Analyse réussie');
      return res.status(200).json(extractedData);
    } catch (parseError) {
      console.error('❌ Erreur parsing JSON:', parseError);
      // Fallback si le JSON n'est pas parfait
      return res.status(200).json({
        subject: "Non détecté",
        chapter: "Analyse en cours...",
        professor: "",
        mots_cles: "Extraction en cours",
        formules: "",
        noms_auteurs: "",
        dates_importantes: "",
        notes_principales: responseText.substring(0, 500),
        resume_personnel: "Analyse des notes manuscrites en cours",
        confidence: 50
      });
    }
    
  } catch (error) {
    console.error("❌ Erreur complète:", error);
    return res.status(500).json({ 
      error: "Erreur lors de l'analyse OCR", 
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}
