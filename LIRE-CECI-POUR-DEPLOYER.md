# 🚀 Instructions pour le Déploiement Automatique

## Important : Ce script va faire TOUT automatiquement !

✅ Se connecter à Hostinger  
✅ Cloner le dépôt GitHub  
✅ Configurer le fichier .env  
✅ Installer les dépendances  
✅ Exécuter les migrations (52)  
✅ Remplir la base de données  
✅ Créer les liens  
✅ Configurer les permissions  

---

## Étape 1 : Installer PuTTY (Nécessaire)

1. **Téléchargez** PuTTY depuis : https://www.putty.org/
2. **Installez** PuTTY sur votre Windows
3. **Vérifiez** que `plink.exe` est disponible

---

## Étape 2 : Exécuter le Script de Déploiement

Ouvrez **PowerShell** sur votre Windows et exécutez :

```powershell
cd C:\DEVPROJECTS\ultraclean
.\deploy.ps1
```

Le script va automatiquement :
- Se connecter à Hostinger avec vos identifiants
- Exécuter toutes les étapes de déploiement
- Afficher la progression en temps réel
- Vérifier que tout fonctionne

---

## Étape 3 : Configuration hPanel (Après le script)

Une fois le script terminé, configurez dans hPanel :

### 1. Document Root (CRUCIAL !)

**hPanel → Domains → ultraclean.ritajpos.com**

**Changez le dossier vers :** `/public_html/public`

⚠️ **Sans ça, votre site ne fonctionnera PAS !**

### 2. Certificat SSL

**hPanel → SSL → Activer Let's Encrypt**

### 3. Version PHP

**hPanel → PHP → Sélectionnez PHP 8.2 ou 8.3**

### 4. Cron Job

**hPanel → Advanced → Scheduled Tasks (Cron Jobs)**

**Ajoutez :**
- Fréquence : `* * * * *` (chaque minute)
- Commande :
```bash
/usr/local/bin/php /home/u897563629/domains/ultraclean.ritajpos.com/public_html/artisan schedule:run >> /dev/null 2>&1
```

---

## Étape 4 : Sécurité Après Déploiement

### 1. Connectez-vous

**URL :** https://ultraclean.ritajpos.com

**Identifiants par défaut :**
- Email : `admin@ritajpos.ma`
- Mot de passe : `Admin@2026!`
- PIN : `1234`

### 2. IMMÉDIATEMENT :
- Changez votre mot de passe admin
- Configurez les paramètres de votre entreprise
- Vérifiez les services et les tarifs

---

## Vérification

Après l'exécution du script, vérifiez :

1. ✅ Ouvrez : https://ultraclean.ritajpos.com
2. ✅ Connectez-vous avec les identifiants par défaut
3. ✅ Changez votre mot de passe
4. ✅ Testez toutes les fonctionnalités

---

## Problèmes ?

### Le script ne trouve pas plink.exe ?

1. Assurez-vous que PuTTY est installé
2. Ajoutez `C:\Program Files\PuTTY\` à votre PATH Windows
3. Ou copiez `plink.exe` dans `C:\DEVPROJECTS\ultraclean\`

### Erreur de connexion ?

- Vérifiez votre mot de passe Hostinger : `Ultraclean@26`
- Vérifiez que SSH est activé sur Hostinger

### Erreur de base de données ?

- Vérifiez que la base de données existe dans hPanel → MySQL Databases
- Nom : `u897563629_ultraclean`
- Utilisateur : `u897563629_ultraclean`
- Mot de passe : `Ultraclean@26`

---

## Résumé

1. **Ouvrez PowerShell**
2. **Exécutez :** `cd C:\DEVPROJECTS\ultraclean && .\deploy.ps1`
3. **Attendez** que tout se termine (quelques minutes)
4. **Configurez** le document root dans hPanel vers `/public_html/public`
5. **Connectez-vous** et changez votre mot de passe

**Votre application sera live sur :** https://ultraclean.ritajpos.com 🚀