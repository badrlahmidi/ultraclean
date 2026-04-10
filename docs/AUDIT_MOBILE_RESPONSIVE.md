# Audit Mobile Responsive — RitajPOS / UltraClean
> Date : 6 avril 2026  
> Scope : tous les fichiers JSX du dossier `resources/js/`  
> Breakpoints Tailwind : `sm` = 640px · `md` = 768px · `lg` = 1024px · `xl` = 1280px

---

## Résumé exécutif

| Sévérité | Pages | État |
|----------|-------|------|
| 🔴 Critique | 3 | Corrigé dans ce commit |
| 🟡 Mineur  | 4 | Noté, non bloquant |
| ✅ OK      | 23 | Aucune action requise |

---

## 🔴 Problèmes critiques — CORRIGÉS

### 1. `Caissier/Tickets/Create.jsx` — POS deux colonnes illisible sur mobile

**Problème :**  
Layout `flex h-[calc(100vh-4rem)]` en ligne fixe. Sur mobile (≤ 375 px) la colonne droite de récap (`w-72 = 288 px`) déborde ou écrase la grille de prestations — la page est inutilisable.

**Fix appliqué :**  
- Ajout d'un état `mobileView` (`'services'` | `'recap'`).  
- Barre d'onglets mobile (`lg:hidden`) avec compteur de lignes et total en temps réel.  
- Layout `flex-col lg:flex-row` : sur `lg+` les deux panneaux restent côte à côte ; sur mobile un seul panneau est visible à la fois.  
- La colonne droite passe de `w-72` fixe à `w-full lg:w-72 xl:w-80`.

---

### 2. `Admin/Appointments/Calendar.jsx` — Barre de navigation overflow

**Problème :**  
`<div className="flex items-center justify-between gap-4">` contient dans la rangée droite : `AppointmentViewTabs` + bouton « Aujourd'hui » + lien « Nouveau RDV ». Sur mobile (≤ 640 px) ces éléments ne tiennent pas sur une seule ligne ; le bouton Nouveau RDV est coupé ou dépasse.

**Fix appliqué :**  
- `flex-wrap` sur le conteneur principal.  
- `flex-wrap` + `justify-end` sur le groupe droite.  
- Le titre de la date tronque avec `truncate` pour ne pas pousser le groupe.

---

### 3. `Caissier/Planning.jsx` — Kanban 2×2 en hauteur fixe sur mobile

**Problème :**  
`grid grid-cols-2 lg:grid-cols-4 h-full` crée un kanban 2×2 dans un conteneur `h-[calc(100vh-4rem)]`. Sur mobile les 4 colonnes se retrouvent dans 2 rangées de hauteur contrainte (environ 40 % du viewport chacune), les cartes sont tronquées et le scroll interne de chaque colonne est trop court.

**Fix appliqué :**  
- Sur `lg+` : conserve `grid-cols-4 h-full` (inchangé).  
- Sous `lg` : scroll horizontal `overflow-x-auto` avec `flex`, chaque colonne occupe `min-w-[82vw]` et `snap-start`, permettant un swipe fluide entre les 4 colonnes.  
- La barre de filtre laveurs devient `flex-wrap` pour éviter le débordement horizontal quand il y a plus de 3 laveurs.

---

## 🟡 Problèmes mineurs — documentés, non bloquants

### 4. `Admin/Clients/Index.jsx` — Table 7 colonnes

**Observation :**  
La table brute (non `DataTable`) a 7 colonnes avec `overflow-x-auto`. Le scroll horizontal fonctionne mais les colonnes « Tier fidélité » et « Dernière visite » pourraient être masquées sous `md` pour réduire la largeur.

**Recommandation :**  
Ajouter `hidden md:table-cell` sur les colonnes secondaires (Fidélité, Dernière visite) et `hidden lg:table-cell` sur Contact.

---

### 5. `Admin/Appointments/Index.jsx` — Modal formulaire très long

**Observation :**  
Le modal de création/édition de RDV contient de nombreuses sections (client search, véhicule, conflits…). Sur petit écran `max-h-[90vh] overflow-y-auto` est présent → scroll fonctionnel. Mais les `grid grid-cols-2` internes dans le formulaire pourraient être `grid-cols-1 sm:grid-cols-2`.

**Recommandation :**  
Vérifier les grilles internes du `AppointmentFormModal` ; remplacer `grid-cols-2` par `grid-cols-1 sm:grid-cols-2` sur les champs courts (date/durée).

---

### 6. `PaymentModal.jsx` — Grille 4 colonnes étroite

**Observation :**  
`grid-cols-4` pour les modes de paiement (Espèces / Carte / Mobile / Mixte). Sur 320 px chaque bouton fait ~68 px — encore lisible mais serré.

**Recommandation :**  
`grid-cols-2 sm:grid-cols-4` serait plus confortable sur < 375 px.

---

### 7. `Admin/Invoices/Index.jsx` — `DataTable` avec colonnes secondaires

**Observation :**  
Colonnes « Mode paiement », « Caissier », « Créé » peuvent être `hidden sm:table-cell` pour réduire la largeur minimale de la table sur mobile.

---

## ✅ Pages validées — aucune action requise

| Fichier | Points contrôlés | Résultat |
|---------|-----------------|----------|
| `Layouts/AppLayout.jsx` | MobileDrawer, sidebar, nav items min-h-[44px] | ✅ |
| `Layouts/Topbar.jsx` | Hamburger, dropdown HeadlessUI | ✅ |
| `Layouts/MobileDrawer.jsx` | Dialog v2, `w-72 max-w-[85vw]` | ✅ |
| `Auth/Login.jsx` | Split-screen, stack mobile | ✅ |
| `Admin/Dashboard.jsx` | `grid-cols-2 lg:grid-cols-4`, `ResponsiveContainer` | ✅ |
| `Admin/Reports/Index.jsx` | Recharts `ResponsiveContainer`, `flex-wrap` | ✅ |
| `Admin/Settings/Index.jsx` | `max-w-2xl` formulaire unique | ✅ |
| `Admin/Users/Index.jsx` | `DataTable` + modal `max-h-[90vh]` | ✅ |
| `Admin/Clients/Show.jsx` | `flex-wrap` hero, `grid lg:grid-cols-3` stacks | ✅ |
| `Admin/Stock/Index.jsx` | Modal `max-h-[90vh]`, `sm:grid-cols-2` forms | ✅ |
| `Admin/Promotions/Index.jsx` | `sm:grid-cols-2/4`, modal scrollable | ✅ |
| `Caissier/Dashboard.jsx` | `grid-cols-2 lg:grid-cols-4`, touch targets | ✅ |
| `Caissier/Tickets/Index.jsx` | `DataTable`, `flex-wrap` filtres, `min-h-[44px]` | ✅ |
| `Caissier/Tickets/Show.jsx` | Modals `fixed inset-0 p-4`, `max-w-sm` | ✅ |
| `Caissier/Tickets/components/ServiceGrid.jsx` | `grid-cols-2 sm:grid-cols-3`, tabs `overflow-x-auto` | ✅ |
| `Caissier/Tickets/components/TicketRecap.jsx` | Scroll interne `flex-1 overflow-y-auto` | ✅ |
| `Caissier/Tickets/components/PaymentModal.jsx` | `p-4` wrapper, `max-w-md` | ✅ (voir §6) |
| `Laveur/Queue.jsx` | Cartes, pas de table | ✅ |
| `Laveur/Stats.jsx` | `max-w-3xl`, `grid-cols-2 sm:grid-cols-4`, `ResponsiveContainer` | ✅ |
| `Profile/Edit.jsx` | `max-w-3xl` formulaires simples | ✅ |
| `Components/DataTable.jsx` | `overflow-x-auto`, `min-w-[500px]` | ✅ |
| `Components/PageHeader.jsx` | `flex-col sm:flex-row`, `flex-wrap` actions | ✅ |
| `Components/Pagination.jsx` | `min-w/h-[44px]`, résumé mobile compacté | ✅ |

---

## Standards de référence appliqués

- **Touch targets** : minimum `44×44 px` (`min-h-[44px] touch-manipulation`) sur tous les boutons navigables.  
- **Tables** : `overflow-x-auto` obligatoire, `min-w-[500px]` ou via `DataTable`.  
- **Modals** : `max-h-[90vh] overflow-y-auto` + `p-4` wrapper pour éviter le clipping hors écran.  
- **Grilles KPI** : `grid-cols-2 lg:grid-cols-4` (jamais `grid-cols-4` fixe sans breakpoint).  
- **Grilles formulaires** : `grid-cols-1 sm:grid-cols-2` (jamais `grid-cols-2` fixe en mobile-first).  
- **Graphiques** : `ResponsiveContainer width="100%"` exclusivement.  
- **Navigation sidebar** : Drawer HeadlessUI `md:hidden`, `max-w-[85vw]`.
