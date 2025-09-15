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
    console.log('🚀 [DEBUG] Début fonction claude-vision');
    
    // Vérifier la clé API
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('❌ [DEBUG] Pas de clé API');
      return res.status(500).json({ error: 'Clé API manquante' });
    }
    
    console.log('✅ [DEBUG] Clé API présente');
    
    // Vérifier le body
    if (!req.body) {
      console.log('❌ [DEBUG] Pas de body');
      return res.status(400).json({ error: 'Pas de données' });
    }
    
    console.log('✅ [DEBUG] Body reçu');
    
    const { imageData, fileName } = req.body;
    
    if (!imageData) {
      console.log('❌ [DEBUG] Pas d\'imageData');
      return res.status(400).json({ error: 'Pas d\'image' });
    }
    
    console.log('✅ [DEBUG] Image data présente, taille:', imageData.length);
    
    // TEST SIMPLE - juste retourner des données factices pour voir si ça marche
    console.log('✅ [DEBUG] Test réussi - retour données factices');
    
    return res.status(200).json({
      subject: "Physique",
      chapter: "Test OCR Debug",
      professor: "Prof Test",
      mots_cles: "test, debug, ocr",
      formules: "E=mc²",
      noms_auteurs: "Einstein",
      dates_importantes: "1905",
      notes_principales: "Test d'analyse OCR - fonction opérationnelle",
      resume_personnel: "La fonction OCR fonctionne correctement",
      confidence: 95
    });
    
  } catch (error) {
    console.log('❌ [DEBUG] Erreur:', error.message);
    console.log('❌ [DEBUG] Stack:', error.stack);
    return res.status(500).json({ 
      error: "Erreur debug", 
      details: error.message,
      stack: error.stack
    });
  }
}
