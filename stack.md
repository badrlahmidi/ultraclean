# Stack Technique et Infrastructure

## Architecture : Monolithe Moderne (Laravel + React via Inertia.js)
Cette stack permet d'avoir la robustesse de PHP pour la gestion métier complexe et la fluidité de React pour l'interface, sans avoir à gérer une API REST séparée.

## Backend (Logique & Sécurité)
- **Framework :** Laravel (PHP 8.2+)
- **Rôle :** Routage, ORM (Eloquent), Authentification, Logique métier.
- **Compétences Requises :** Maîtrise d'Eloquent, des Middlewares, et de la validation des requêtes.

## Frontend (Interface Utilisateur)
- **Bibliothèque :** React.js
- **Connecteur :** Inertia.js (Remplace le routage API classique)
- **Styling :** Tailwind CSS (pour un design rapide et responsive)
- **Build Tool :** Vite.js
- **Compétences Requises :** Hooks React (useState, useEffect), composants fonctionnels.

## Base de Données
- **SGBD :** MySQL ou MariaDB.
- **Gestion :** Migrations et Seeders gérés via Laravel.

## Hébergement & Déploiement (Contraintes Hostinger hPanel)
- **Serveur :** Hébergement mutualisé Hostinger (Supporte PHP & MySQL).
- **Contrainte Majeure :** Pas d'exécution Node.js en production.
- **Solution de Build :** Le code React doit être compilé localement (`npm run build`) avant d'être transféré sur le serveur FTP/Git. Le serveur ne servira que des fichiers statiques pour le frontend.