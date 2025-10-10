# 🎓 Cornell Notes System

![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-v21%20(stable)-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)

> **Transformez vos notes manuscrites GoodNotes en documents Cornell structurés, enrichis par l'IA Gemini**

🌐 **Démo en ligne :** [cornell-notes-system.vercel.app](https://cornell-notes-system.vercel.app)

---

## 📖 Description

**Cornell Notes System** est une application web qui automatise la transformation de notes manuscrites (depuis GoodNotes) en documents PDF structurés selon la méthode Cornell. L'application utilise l'intelligence artificielle Gemini Vision pour :

- 🔍 **Extraire le texte** des images de notes manuscrites (OCR)
- 🧠 **Enrichir automatiquement** la structure Cornell (mots-clés, formules, questions, résumé)
- 📊 **Analyser et décrire** les schémas et graphiques
- 📄 **Générer des PDF** professionnels et structurés

**Résultat :** Des notes Cornell complètes, prêtes à être classées et révisées efficacement.

---

## ✨ Fonctionnalités principales

### 🎯 Upload & Configuration
- Upload d'images (PNG, JPG, JPEG)
- Configuration des métadonnées (Professeur, Date, Chapitre, Matière)
- Prévisualisation des images uploadées

### 🤖 Intelligence Artificielle Gemini
- **OCR avancé** : Extraction précise du texte manuscrit
- **Enrichissement Cornell** : Génération automatique de mots-clés, formules, auteurs, dates, questions et conseils
- **Analyse visuelle** : Descriptions détaillées des schémas, graphiques et tableaux

### 📊 Structure Cornell complète
- **En-tête** : Métadonnées du cours (Prof, Date, Chapitre, Matière)
- **Sidebar gauche** : Mots-clés, Formules, Auteurs, Dates, Questions, Conseils
- **Notes principales** : Contenu structuré avec sous-titres
- **Schémas & Graphiques** : Images intégrées avec descriptions IA
- **Résumé** : Synthèse des points clés

### 🎨 Interface personnalisée
- Design moderne avec onglets (Upload, Structure, Export)
- Bandeau "by Mic Mic Company" 🐕
- Prévisualisation en temps réel
- Export PDF professionnel

---

## 🛠️ Technologies utilisées

- **Frontend** : HTML, CSS (Tailwind-like), JavaScript
- **IA** : Google Gemini Vision API (gemini-1.5-flash)
- **Génération PDF** : PDF-lib
- **Déploiement** : Vercel
- **Proxy API** : Vercel Serverless Functions

---

## 🚀 Utilisation

### **Méthode simple** : Utiliser la version en ligne

1. Rendez-vous sur [cornell-notes-system.vercel.app](https://cornell-notes-system.vercel.app)
2. Suivez le [Mode d'emploi complet](./mode-emploi.html)
3. Uploadez vos images de notes GoodNotes
4. Configurez les métadonnées
5. Générez votre PDF Cornell !

### **Pour développeurs** : Installation locale

```bash
# Cloner le repository
git clone https://github.com/Ricco-Fic-Fic/cornell-notes-system.git
cd cornell-notes-system

# Ouvrir index.html dans un navigateur
# Aucune installation npm nécessaire (HTML/JS/CSS pur)
```

**Note :** Pour utiliser l'API Gemini en local, vous aurez besoin d'une clé API Gemini configurée.

---

## 📚 Documentation

- 📘 **[Mode d'emploi utilisateur](./mode-emploi.html)** : Guide complet d'utilisation (v22)
- 📗 **[Rapport technique complet](./docs/Rapport-Cornell-Notes-v22.md)** : Documentation développeur, historique du projet, phases de développement
- 📙 **[README archive](./docs/README-v22.md)** : Version antérieure du README

---

## 📊 Statistiques du projet

| Métrique | Valeur |
|----------|--------|
| **Durée de développement** | 11h15 (réparties sur 2 jours) |
| **Versions créées** | v14 → v22 (9 versions majeures) |
| **Commits GitHub** | 135+ commits |
| **Lignes de code** | ~1500 lignes |
| **Date de finalisation** | 7 octobre 2025 |

---

## 🎯 État du projet

### ✅ Phases terminées (v21 + v22)

- **Phase 1-3** : Développement système de base (OCR + Enrichissement Cornell)
- **Phase 4** : Ajout descriptions IA des schémas/graphiques
- **Phase 5** : Tests et validation complète
- **Phase 6** : Documentation utilisateur (Mode d'emploi v22)

### 📋 Prochaine phase

- **Phase 7** : Surveillance et maintenance (à démarrer après 2-3 semaines d'usage)
  - Collecte de retours utilisateurs
  - Optimisations basées sur l'usage réel
  - Corrections mineures si nécessaire

---

## 🐕 Crédits

**Développé par Mic Mic Company**

- 🎨 Design & Interface : Mic Mic Company
- 💻 Développement : Ricco
- 🤖 IA & Automatisation : Google Gemini Vision
- 📝 Méthodologie : Méthode Cornell (Walter Pauk, Cornell University)

---

## 🔗 Liens utiles

- 🌐 **Application** : [cornell-notes-system.vercel.app](https://cornell-notes-system.vercel.app)
- 📂 **GitHub** : [github.com/Ricco-Fic-Fic/cornell-notes-system](https://github.com/Ricco-Fic-Fic/cornell-notes-system)
- 📖 **Documentation complète** : [Rapport v22](./docs/Rapport-Cornell-Notes-v22.md)
- 📘 **Mode d'emploi** : [mode-emploi.html](./mode-emploi.html)

---

## 📄 License

**Projet privé** - Tous droits réservés © 2025 Mic Mic Company

---

## 🎓 À propos de la méthode Cornell

La méthode Cornell est une technique de prise de notes développée par Walter Pauk à l'Université Cornell dans les années 1950. Elle structure les notes en trois sections :

1. **Notes principales** : Contenu du cours
2. **Colonne de rappel** : Mots-clés, questions, formules
3. **Résumé** : Synthèse en bas de page

Cette méthode facilite la révision et améliore la rétention d'information.

---

<div align="center">

**✨ Fait avec ❤️ par Mic Mic Company 🐕 ✨**

*Transformez vos notes manuscrites en documents professionnels en quelques clics !*

</div>
