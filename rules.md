# Règles de Développement et Déploiement

## Règles de Code
1. **Composants React :** Garder les composants petits et réutilisables. Séparer la logique de l'UI.
2. **Contrôleurs Laravel :** Ne jamais mettre de logique métier complexe directement dans les contrôleurs. Utiliser des "Services" ou des "Actions" pour garder les contrôleurs propres.
3. **Sécurité :** Ne jamais faire confiance aux données envoyées par l'utilisateur. Valider systématiquement toutes les requêtes côté backend via les `FormRequests` de Laravel.
4. **Langue :** Nommer les variables, fonctions et tables de base de données en anglais pour respecter les standards de développement.

## Protocole de Déploiement (Spécifique Hostinger)
Étant donné l'absence d'environnement Node.js sur l'hébergement mutualisé, chaque mise en production doit suivre ces étapes strictes :

1. **Préparation Locale :**
   - S'assurer que le fichier `.env` local est configuré pour la production (`APP_ENV=production`, `APP_DEBUG=false`).
   - Exécuter `npm run build` localement pour générer les assets compilés dans `public/build`.
2. **Transfert de Fichiers :**
   - Uploader les fichiers via FTP ou déployer via Git sur Hostinger.
   - Ne **jamais** uploader le dossier `/node_modules`.
3. **Sécurité du Serveur (CRITIQUE) :**
   - Configurer le domaine principal dans hPanel pour qu'il pointe **exclusivement vers le dossier `/public`** de l'application Laravel.
   - Vérifier qu'il est impossible d'accéder au fichier `.env` depuis un navigateur web.
4. **Mise à jour Base de Données :**
   - Gérer l'importation de la base de données via phpMyAdmin (hPanel) ou exécuter les migrations si un accès SSH restreint est disponible.


   ## Environnement de Développement Local (Système)
- **OS :** Windows (PowerShell / CMD).
- **Règle de Commandes Terminal :** Lors de la génération de commandes pour le terminal, n'utilise JAMAIS `&&` pour chaîner les instructions. Utilise TOUJOURS le point-virgule (`;`) à la place, ou donne les commandes sur des lignes séparées pour garantir la compatibilité avec PowerShell.