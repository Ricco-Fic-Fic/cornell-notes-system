export default async function handler(req, res) {
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

🖼️ IMAGES DISPONIBLES : ${uploadedImages.length} image(s) uploadée(s)

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
    {"sujet": "fission nucléaire", "description": "Schéma de la réaction en chaîne"}
  ]
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2500,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Erreur API Anthropic: ${response.status}`);
    }

    const data = await response.json();
    let responseText = data.content[0].text;
    
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    
    const parsedSummary = JSON.parse(responseText);
    
    return res.status(200).json(parsedSummary);
    
  } catch (error) {
    console.error("Erreur dans la fonction proxy:", error);
    return res.status(500).json({ 
      error: "Erreur lors du traitement", 
      details: error.message 
    });
  }
}
