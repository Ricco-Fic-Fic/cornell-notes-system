export default async function handler(req, res) {
  console.log("🚀 === DÉBUT FONCTION PROXY DEBUG ===");
  console.log("🔍 Méthode de requête:", req.method);
  
  // Autoriser toutes les origines pour éviter les erreurs CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gérer les requêtes OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    console.log("✅ Requête OPTIONS - Retour 200");
    return res.status(200).end();
  }
  
  // Vérifier que c'est bien une requête POST
  if (req.method !== 'POST') {
    console.log("❌ Méthode non POST:", req.method);
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }
  
  console.log("✅ Requête POST confirmée");
  
  try {
    // === ÉTAPE 1 : VÉRIFICATION DONNÉES REÇUES ===
    console.log("📥 ÉTAPE 1 : Vérification des données reçues");
    console.log("🔍 Type de req.body:", typeof req.body);
    console.log("🔍 Contenu req.body:", JSON.stringify(req.body, null, 2));
    
    if (!req.body) {
      console.log("❌ ERREUR : req.body est vide ou undefined");
      return res.status(400).json({ error: 'Corps de requête manquant' });
    }
    
    // Récupérer les données envoyées par le frontend
    const { courseConfig, cornellData, uploadedImages } = req.body;
    
    console.log("🔍 courseConfig:", courseConfig);
    console.log("🔍 cornellData keys:", cornellData ? Object.keys(cornellData) : 'undefined');
    console.log("🔍 uploadedImages length:", uploadedImages ? uploadedImages.length : 'undefined');
    
    // === ÉTAPE 2 : VÉRIFICATION VARIABLE D'ENVIRONNEMENT ===
    console.log("🔑 ÉTAPE 2 : Vérification clé API");
    const apiKey = process.env.ANTHROPIC_API_KEY;
    console.log("🔍 Clé API présente:", apiKey ? "✅ OUI (longueur: " + apiKey.length + ")" : "❌ NON");
    console.log("🔍 Clé API commence par:", apiKey ? apiKey.substring(0, 15) + "..." : "N/A");
    
    if (!apiKey) {
      console.log("❌ ERREUR : Clé API manquante");
      return res.status(500).json({ error: 'Configuration serveur - clé API manquante' });
    }
    
    // === ÉTAPE 3 : CONSTRUCTION DU PROMPT ===
    console.log("📝 ÉTAPE 3 : Construction du prompt");
    
    let prompt;
    try {
      prompt = `Tu es un assistant expert en méthode Cornell et synthèse académique.

INFORMATIONS DU COURS :
- Matière : ${courseConfig?.subject || 'Non spécifié'}
- Chapitre ${courseConfig?.chapterNumber || 'N/A'} : ${courseConfig?.chapter || 'Non spécifié'}
- Date : ${courseConfig?.date || 'Non spécifié'}
- Professeur : ${courseConfig?.professor || 'Non spécifié'}

NOTES CORNELL À ANALYSER :

📝 NOTES PRINCIPALES :
${cornellData?.notes_principales || 'Non spécifié'}

🔑 MOTS-CLÉS :
${cornellData?.mots_cles || 'Non spécifié'}

🧮 FORMULES :
${cornellData?.formules || 'Non spécifié'}

👨‍🏫 NOMS D'AUTEUR/SCIENTIFIQUES :
${cornellData?.noms_auteurs || 'Non spécifié'}

📅 DATES IMPORTANTES :
${cornellData?.dates_importantes || 'Non spécifié'}

❓ DOUTES ET QUESTIONNEMENTS :
${cornellData?.doutes_questions || 'Non spécifié'}

📄 RÉSUMÉ PERSONNEL :
${cornellData?.resume_personnel || 'Non spécifié'}

🖼️ IMAGES DISPONIBLES : ${uploadedImages?.length || 0} image(s) uploadée(s)

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

      console.log("✅ Prompt construit avec succès");
      console.log("🔍 Longueur du prompt:", prompt.length, "caractères");
      
    } catch (promptError) {
      console.log("❌ ERREUR lors de la construction du prompt:", promptError.message);
      return res.status(500).json({ error: 'Erreur construction prompt', details: promptError.message });
    }

    // === ÉTAPE 4 : PRÉPARATION REQUÊTE API ===
    console.log("⚙️ ÉTAPE 4 : Préparation de la requête API");
    
    const requestBody = {
      model: "claude-3-sonnet-20240229",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    };
    
    console.log("🔍 Modèle utilisé:", requestBody.model);
    console.log("🔍 Max tokens:", requestBody.max_tokens);
    console.log("🔍 Nombre de messages:", requestBody.messages.length);
    
    const requestHeaders = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };
    
    console.log("🔍 Headers préparés:", Object.keys(requestHeaders));

    // === ÉTAPE 5 : APPEL API ANTHROPIC ===
    console.log("🌐 ÉTAPE 5 : Début de l'appel API Anthropic");
    
    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(requestBody)
      });
      
      console.log("✅ Appel fetch terminé");
      console.log("🔍 Status de la réponse:", response.status);
      console.log("🔍 Status text:", response.statusText);
      console.log("🔍 Headers de réponse:", [...response.headers.entries()]);
      
    } catch (fetchError) {
      console.log("❌ ERREUR lors du fetch:", fetchError.message);
      console.log("❌ Stack trace:", fetchError.stack);
      return res.status(500).json({ error: 'Erreur réseau', details: fetchError.message });
    }

    // === ÉTAPE 6 : VÉRIFICATION STATUS RÉPONSE ===
    console.log("📊 ÉTAPE 6 : Vérification du status de réponse");
    
    if (!response.ok) {
      console.log("❌ Status NON OK:", response.status);
      
      let errorDetails;
      try {
        errorDetails = await response.text();
        console.log("🔍 Détails de l'erreur:", errorDetails);
      } catch (textError) {
        console.log("❌ Impossible de lire les détails de l'erreur:", textError.message);
        errorDetails = "Impossible de lire les détails";
      }
      
      return res.status(500).json({ 
        error: `Erreur API Anthropic: ${response.status}`, 
        details: errorDetails 
      });
    }

    // === ÉTAPE 7 : PARSING RÉPONSE JSON ===
    console.log("📋 ÉTAPE 7 : Parsing de la réponse JSON");
    
    let data;
    try {
      data = await response.json();
      console.log("✅ Parsing JSON réussi");
      console.log("🔍 Clés de la réponse:", Object.keys(data));
      console.log("🔍 Type de content:", data.content ? typeof data.content : 'undefined');
      console.log("🔍 Longueur content:", data.content ? data.content.length : 'N/A');
      
    } catch (jsonError) {
      console.log("❌ ERREUR lors du parsing JSON:", jsonError.message);
      return res.status(500).json({ error: 'Erreur parsing réponse', details: jsonError.message });
    }

    // === ÉTAPE 8 : EXTRACTION DU TEXTE ===
    console.log("🔤 ÉTAPE 8 : Extraction du texte de réponse");
    
    let responseText;
    try {
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.log("❌ Structure de réponse inattendue");
        console.log("🔍 Structure complète:", JSON.stringify(data, null, 2));
        return res.status(500).json({ error: 'Structure de réponse invalide', details: 'content[0].text manquant' });
      }
      
      responseText = data.content[0].text;
      console.log("✅ Texte extrait avec succès");
      console.log("🔍 Longueur du texte:", responseText.length);
      console.log("🔍 Début du texte:", responseText.substring(0, 200) + "...");
      
    } catch (extractError) {
      console.log("❌ ERREUR lors de l'extraction:", extractError.message);
      return res.status(500).json({ error: 'Erreur extraction texte', details: extractError.message });
    }

    // === ÉTAPE 9 : NETTOYAGE DU TEXTE ===
    console.log("🧹 ÉTAPE 9 : Nettoyage du texte");
    
    try {
      // Nettoyer la réponse
      const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      console.log("✅ Nettoyage terminé");
      console.log("🔍 Longueur après nettoyage:", cleanedText.length);
      console.log("🔍 Texte nettoyé début:", cleanedText.substring(0, 100) + "...");
      
      responseText = cleanedText;
      
    } catch (cleanError) {
      console.log("❌ ERREUR lors du nettoyage:", cleanError.message);
      return res.status(500).json({ error: 'Erreur nettoyage texte', details: cleanError.message });
    }

    // === ÉTAPE 10 : PARSING JSON FINAL ===
    console.log("🎯 ÉTAPE 10 : Parsing JSON final");
    
    let parsedSummary;
    try {
      parsedSummary = JSON.parse(responseText);
      console.log("✅ JSON final parsé avec succès");
      console.log("🔍 Clés du résumé:", Object.keys(parsedSummary));
      
    } catch (parseError) {
      console.log("❌ ERREUR lors du parsing JSON final:", parseError.message);
      console.log("🔍 Texte qui a causé l'erreur:", responseText);
      return res.status(500).json({ 
        error: 'Erreur parsing JSON final', 
        details: parseError.message,
        rawText: responseText.substring(0, 500) 
      });
    }

    // === ÉTAPE 11 : RETOUR RÉPONSE ===
    console.log("🎉 ÉTAPE 11 : Retour de la réponse finale");
    console.log("✅ === SUCCÈS COMPLET ===");
    
    return res.status(200).json(parsedSummary);
    
  } catch (globalError) {
    console.log("💥 ===== ERREUR GLOBALE CAPTURÉE =====");
    console.log("❌ Type:", globalError.name);
    console.log("❌ Message:", globalError.message);
    console.log("❌ Stack:", globalError.stack);
    console.log("💥 =====================================");
    
    return res.status(500).json({ 
      error: "Erreur globale dans la fonction proxy", 
      details: globalError.message,
      stack: globalError.stack
    });
  }
}
