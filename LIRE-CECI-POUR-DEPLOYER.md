# 🚀 Instructions pour le Déploiement - UltraClean

> ⚠️ **AVERTISSEMENT DE SÉCURITÉ :** Ne jamais stocker des mots de passe, clés secrètes
> ou adresses IP de production dans des fichiers suivis par Git.
> Toutes les valeurs sensibles doivent être définies directement sur le serveur.

## Ce que le déploiement va faire

✅ Cloner le dépôt GitHub  
✅ Configurer le fichier .env (vous devrez remplir les valeurs manuellement)  
✅ Installer les dépendances  
✅ Exécuter les migrations  
✅ Remplir la base de données  
✅ Créer les liens  
✅ Configurer les permissions  

---

## Étape 1 : Script de Déploiement (Windows)

Ouvrez **PowerShell** sur votre Windows et exécutez :

```powershell
.\deploy.ps1
```

Le script va vous demander interactivement votre utilisateur SSH, l'hôte et le domaine.
**Ne passez jamais de mots de passe en paramètre de ligne de commande.**

---

## Étape 2 : Configuration hPanel (Après le script)

Une fois le script terminé, configurez dans hPanel :

### 1. Document Root (CRUCIAL !)

**hPanel → Domains → votre-domaine**

**Changez le dossier vers :** `/public_html/public`

⚠️ **Sans ça, votre site ne fonctionnera PAS !**

### 2. Certificat SSL

**hPanel → SSL → Activer Let's Encrypt**

### 3. Version PHP

**hPanel → PHP → Sélectionnez PHP 8.2 ou 8.3**

### 4. Cron Job

**hPanel → Advanced → Scheduled Tasks (Cron Jobs)**

**Ajoutez** (remplacez `uXXXX` et `votre-domaine` par vos valeurs) :
- Fréquence : `* * * * *` (chaque minute)
- Commande :
```bash
/usr/local/bin/php /home/uXXXX/domains/votre-domaine/public_html/artisan schedule:run >> /dev/null 2>&1
```

---

## Étape 3 : Sécurité Après Déploiement

### 1. Connectez-vous

**URL :** `https://<VOTRE_DOMAINE>`

Un compte administrateur par défaut est créé par le seeder.
Consultez `database/seeders/AdminUserSeeder.php` pour l'e-mail par défaut.

### 2. IMMÉDIATEMENT :
- Changez votre mot de passe admin
- Changez le PIN admin
- Configurez les paramètres de votre entreprise
- Vérifiez les services et les tarifs

---

## Vérification

Après le déploiement, vérifiez :

1. ✅ Ouvrez votre URL de production
2. ✅ Connectez-vous avec le compte admin par défaut
3. ✅ Changez votre mot de passe **immédiatement**
4. ✅ Testez toutes les fonctionnalités

---

## Problèmes ?

### Erreur de connexion SSH ?

- Vérifiez que SSH est activé dans hPanel
- Consultez `setup-ssh-key.md` pour configurer les clés SSH

### Erreur de base de données ?

- Vérifiez que la base de données existe dans hPanel → MySQL Databases
- Vérifiez les identifiants dans votre fichier `.env` sur le serveur

---

## Résumé

1. **Exécutez** `.\deploy.ps1` depuis PowerShell
2. **Saisissez** vos informations SSH quand demandé
3. **Éditez** le fichier `.env` sur le serveur avec vos vraies valeurs
4. **Configurez** le document root dans hPanel vers `/public_html/public`
5. **Connectez-vous** et changez votre mot de passe
