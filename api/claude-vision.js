export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // STRUCTURE CORRECTE que le frontend attend
  return res.status(200).json({
    courseConfig: {
      subject: "Physique",
      chapter: "Test OCR Debug",
      professor: "Prof Test",
      chapterNumber: "1"
    },
    cornellData: {
      mots_cles: "test, debug, ocr",
      formules: "E=mc²",
      noms_auteurs: "Einstein",
      dates_importantes: "1905",
      notes_principales: "Test d'analyse OCR - fonction opérationnelle",
      resume_personnel: "La fonction OCR fonctionne correctement"
    },
    confidence: 95
  });
}
