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
    // Vérifier que la clé API existe
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY manquante dans les variables d\'environnement');
      return res.status(500).json({ error: 'Configuration API manquante' });
    }
    
    // Récupérer les données envoyées par le frontend
    const { courseConfig, cornellData, uploadedImages } = req.body;
    
    // Vérifier que les données requises sont présentes
    if (!courseConfig || !cornellData) {
      return res.status(400).json({ error: 'Données manquantes dans la requête' });
    }
    
    // Construire le prompt
    const prompt = `Tu es un assistant expert en méthode Cornell et synthèse académique.

INFORMATIONS DU COURS :
- Matière : ${courseConfig.subject}
- Chapitre ${courseConfig.chapterNumber} : ${courseConfig.chapter}
- Date : ${courseConfig.date}
- Professeur : ${courseConfig.professor}

NOTES CORNELL À ANALYSER :

📝 NOTES PRINCIPALES :
${cornellData.notes_principales}

🔑 MOTS-CLÉS :
${cornellData.mots_cles}

🧮 FORMULES :
${cornellData.formules}

👨‍🏫 NOMS D'AUTEUR/SCIENTIFIQUES :
${cornellData.noms_auteurs}

📅 DATES IMPORTANTES :
${cornellData.dates_importantes}

❓ DOUTES ET QUESTIONNEMENTS :
${cornellData.doutes_questions}

📄 RÉSUMÉ PERSONNEL :
${cornellData.resume_personnel}

🖼️ IMAGES DISPONIBLES : ${uploadedImages ? uploadedImages.length : 0} image(s) uploadée(s)

MISSION : Génère un résumé structuré optimisé pour révisions, respectant la méthode Cornell.

RÉPONDS UNIQUEMENT AVEC LE JSON VALIDE - RIEN D'AUTRE :
{
  "resume_executif": "Synthèse globale du chapitre en 3-4 phrases claires",
  "concepts_cles": ["concept1", "concept2", "concept3"],
  "definitions": [
    {"terme": "terme1", "definition": "définition claire et précise"},
    {"terme": "terme2", "definition": "définition claire et précise"}
  ],
  "formules_lois": [
    {"nom": "Nom de la formule/loi", "expression": "Expression mathématique", "description": "Utilisation"}
  ],
  "personnages_dates": [
    {"nom": "Nom du scientifique/auteur", "contribution": "Ce qu'il a apporté", "date": "Époque/date"}
  ],
  "chronologie": [
    {"periode": "Époque/Date", "evenement": "Événement important"}
  ],
  "exemples_applications": [
    {"contexte": "Situation d'application", "explication": "Comment ça marche"}
  ],
  "questions_revision": [
    {"niveau": "facile", "question": "Question de base", "indice": "Aide pour répondre"},
    {"niveau": "moyen", "question": "Question intermédiaire", "indice": "Aide"},
    {"niveau": "difficile", "question": "Question complexe", "indice": "Aide"}
  ],
  "points_attention": [
    "Erreur courante à éviter",
    "Piège fréquent en exercice"
  ],
  "liens_conceptuels": [
    "Relation entre concept A et concept B",
    "Lien avec chapitre précédent/suivant"
  ],
  "schemas_detectes": [
    {"sujet": "exemple", "description": "Description du schéma"}
  ]
}`;

    console.log('Début de l\'appel API Anthropic...');
    
    // Appel à l'API Anthropic
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    console.log('Réponse API reçue, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erreur API Anthropic:', response.status, errorText);
      throw new Error(`Erreur API Anthropic: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    console.log('Texte de réponse brut:', responseText.substring(0, 200) + '...');
    
    // Nettoyer la réponse
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    // Parser le JSON
    const parsedSummary = JSON.parse(responseText);
    
    console.log('JSON parsé avec succès');
    
    // Retourner la réponse au frontend
    return res.status(200).json(parsedSummary);
    
  } catch (error) {
    console.error("Erreur dans la fonction proxy:", error.message);
    console.error("Stack trace:", error.stack);
    return res.status(500).json({ 
      error: "Erreur lors du traitement", 
      details: error.message 
    });
  }
}
