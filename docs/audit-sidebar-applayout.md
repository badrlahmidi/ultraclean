# 🔍 Audit — Sidebar & AppLayout (`AppLayout.jsx`)

> **Date :** 31 Mars 2026
> **Composant audité :** `resources/js/Layouts/AppLayout.jsx` (406 lignes)
> **Stack :** React 18 · Inertia.js v2 · Tailwind CSS v3 · HeadlessUI v2 · Lucide React · Vite 7
> **Auditeur :** Lead UI/UX Designer & Développeur Frontend Senior React

---

## 📌 Observation Préliminaire (Structurelle)

La "Sidebar" n'est **pas un composant isolé**. Elle est entièrement embarquée dans `AppLayout.jsx` via un composant inline `SidebarContent`. Ce fichier unique gère simultanément :
- La sidebar desktop (collapsible)
- Le drawer mobile (overlay)
- La Topbar (titre, shift indicator, notifications, menu utilisateur)
- Le layout principal (`<main>`)

C'est le premier problème structurel de l'ensemble.

---

## 🔴 Étape 1 — Audit : Failles Critiques UI/UX & Code

### Architecture React

| # | Zone | Problème |
|---|---|---|
| 1 | **`SidebarContent` inline** | Défini **à l'intérieur du `return` d'`AppLayout`**. React recrée ce composant à chaque re-render (ouverture des notifs, menu user…), provoquant des **re-mounts complets**, perte d'état interne et performances dégradées. Faute React fondamentale. |
| 14 | **`useEffect` flash : mauvaises dépendances** | `[flash]` compare l'objet entier. Inertia peut créer un nouvel objet `flash` à chaque navigation même si les valeurs sont identiques → risque de **toasts dupliqués**. Doit être `[flash?.success, flash?.error, flash?.warning]`. |
| 15 | **`useEffect` dans `NavGroup` : stale closure** | `useEffect(() => { if (isChildActive && !open) setOpen(true); }, [currentRoute])` — `open` et `isChildActive` utilisés dans le callback mais **absents des dépendances**. Violation ESLint `exhaustive-deps`. |
| 16 | **Pas de `useMemo` sur `navItems`** | `ROLE_NAV[auth.user?.role]` recalculé à chaque render. Mineur mais mémoïsable. |
| 17 | **`route()` sans guard** | `route(item.href)` peut **throw** si la route est absente du manifest Ziggy (typo, route manquante). Aucun try/catch ou vérification préalable. |
| 18 | **Z-index anarchique** | Sidebar overlay (`z-40`, `z-50`), notifications panel (`z-50`), user menu (`z-50`) — tous à `z-50` sans système cohérent. Comportement imprévisible en cas de superposition. |
| 19 | **Dropdowns manuels vs HeadlessUI** | `notifRef` + `userMenuRef` + `mousedown` sur `document` = boilerplate fragile. `@headlessui/react` (`Menu`, `Popover`) — **déjà installés** — gèrent keyboard nav, ARIA et outside-click nativement. |

---

### UI/UX

| # | Zone | Problème |
|---|---|---|
| 2 | **Mobile Drawer — a11y critique** | Pas de gestion de `Escape` pour fermer le drawer. Pas de **focus trap**. Pas d'attributs ARIA (`role="dialog"`, `aria-modal`, `aria-label`). `@headlessui/react Dialog` est disponible et gère tout cela — il n'est pas utilisé. |
| 3 | **Mobile Drawer — scroll body** | Quand le drawer s'ouvre, le `body` peut toujours **scroller** en arrière-plan (`overflow-hidden` manquant sur body). |
| 4 | **`NavGroup` — animation absente** | Ouverture/fermeture du sous-menu "Configuration" : simple `open && <div>` sans transition. Apparition/disparition brutale. HeadlessUI `Disclosure` ou une transition `max-height` corrigerait ça. |
| 5 | **Tooltips mode collapsed — a11y** | Tooltips au hover (`group-hover:opacity-100`) sans `role="tooltip"` ni `aria-describedby`. Non accessibles au clavier. Antipattern `pointer-events-none → group-hover:pointer-events-auto`. |
| 6 | **Bouton collapse mal placé** | `PanelLeftClose/Open` est dans la **Topbar**, pas dans la sidebar. L'utilisateur cherche instinctivement ce contrôle **sur le bord ou en bas de la sidebar**. Contre-intuitif. |
| 7 | **Logo non cliquable** | Le logo/nom de l'app est décoratif. Il devrait être un `<Link>` vers le dashboard du rôle courant. Standard universel. |
| 8 | **CTA "Nouveau ticket" dégradé en collapsed** | En mode collapsed, l'item `accent: true` (Nouveau ticket) perd son impact visuel — l'icône bleue se fond dans les autres. L'appel à l'action principal disparaît. |
| 9 | **Notifications — auto-`markAllRead`** | `markAllRead()` est appelé **à l'ouverture** du panneau. L'utilisateur n'a pas le temps de voir les nouvelles notifs avant qu'elles soient marquées lues. Le badge rouge disparaît instantanément. Conventionnellement, on marque à la fermeture. |
| 10 | **Notifications — non cliquables** | Chaque notification contient `ticketId` et `ticketNumber` mais **aucun lien de navigation** vers le ticket. L'information est affichée mais inexploitable. |
| 11 | **Active state fragile** | `currentRoute.startsWith(baseRoute)` est une heuristique cassable. `admin.settings.index` et une hypothétique `admin.settings-extended` seraient toutes deux "actives" pour le même item. |
| 2b | **Logout absent de la sidebar** | Logout uniquement via le menu user dans la Topbar. Sur mobile, après ouverture du drawer, l'utilisateur doit fermer le drawer puis chercher le menu. Non intuitif. |

---

### Responsive Design

| # | Zone | Problème |
|---|---|---|
| 12 | **Pas de breakpoint tablette** | Seulement deux états : sidebar desktop (`lg:flex`) et drawer mobile. Sur **iPad (768–1023px)**, on est en mode mobile avec drawer — sous-optimal. La tablette mériterait la sidebar en mode collapsed fixe (icônes seules, sans overlay). |
| 13 | **Transition de collapse saccadée** | `transition-all duration-300` anime la largeur de la `<aside>`, mais les **labels texte disparaissent brutalement** sans fade. Artefact visuel à mi-animation. |

---

## 📋 Étape 2 — Plan d'Action

### 🏗️ Architecture (refactoring structurel)

- **Extraire en 3 composants distincts :**
  - `Sidebar.jsx` — logique de navigation desktop + collapse
  - `MobileDrawer.jsx` — wrappant **HeadlessUI `Dialog`** (focus trap, Escape, ARIA natifs)
  - `Topbar.jsx` — shift indicator, notifications, menu utilisateur
  - `AppLayout.jsx` devient un simple orchestrateur léger

### ♿ Accessibilité (a11y)

- Remplacer l'overlay mobile DIY par **HeadlessUI `Dialog`** : focus trap automatique, `Escape`, `role="dialog"`, `aria-modal`, `aria-label`.
- Ajouter `role="tooltip"` + `id` + `aria-describedby` sur les tooltips du mode collapsed.
- Vérifier le focus visible (`:focus-visible`) sur tous les éléments interactifs.

### 🎨 UI/UX

- **Déplacer le bouton collapse en bas de la sidebar desktop**, séparé par une `border-t`. Libère la Topbar.
- **Logo cliquable** → `<Link href={route(dashboardRouteByRole)}>`.
- **Ajouter Logout dans la sidebar** (en bas, sous le bouton collapse), toujours visible.
- **Animer `NavGroup`** avec une transition CSS `max-height` + `opacity` (ou HeadlessUI `Disclosure`).
- **CTA "Nouveau ticket" collapsed** : fond bleu plein + `ring-2 ring-blue-300` sur l'icône pour maintenir l'impact visuel.
- **Notifications** : déclencher `markAllRead` à la **fermeture** du panneau (`useEffect` sur `notifOpen → false`). Rendre chaque notification un `<Link>` vers `/tickets/{ticketId}`.

### 📱 Responsive

- **Breakpoint tablette `md:` (768–1023px)** : sidebar collapsed fixe (`w-[60px]`) sans overlay. Seul mobile (`< 768px`) utilise le drawer.
- **Transition de collapse** : ajouter `transition-opacity duration-150 delay-100` sur les labels, coordonné avec le `duration-300` de la largeur pour un fade-out propre.

### 🧹 Qualité du code

- Corriger dépendances `useEffect` : `[flash?.success, flash?.error, flash?.warning]` pour les toasts.
- Corriger `NavGroup` useEffect : ajouter `isChildActive` dans les deps (supprimer `open` de la condition ou utiliser `useCallback`).
- Remplacer dropdowns manuels (refs + `mousedown`) par **HeadlessUI `Popover`/`Menu`**.
- Wrapper `route(item.href)` dans un helper safe : `safeRoute(name) => { try { return route(name); } catch { return '#'; } }`.
- Établir un système de z-index : overlay `z-40`, drawers/panels `z-50`, tooltips `z-60`, toasts `z-70`.
- Ajouter `useMemo` sur `navItems`.

---

## 📊 Bilan de l'Audit

| Catégorie | Problèmes identifiés | Sévérité |
|---|---|---|
| Architecture React | 4 | 🔴 Critique |
| Accessibilité (a11y) | 5 | 🔴 Critique |
| UI/UX | 7 | 🟠 Important |
| Responsive Design | 2 | 🟡 Modéré |
| Qualité du code | 5 | 🟡 Modéré |
| **Total** | **23** | — |

---

## ⏳ Statut

- [x] Étape 1 — Audit réalisé
- [x] Étape 2 — Plan d'action défini
- [x] Étape 3 — Validé par l'utilisateur
- [x] Étape 4 — **Code refactorisé et livré** ✅
  - `navConfig.js`, `NavItem.jsx`, `NavGroup.jsx`, `Sidebar.jsx`, `MobileDrawer.jsx`, `Topbar.jsx`, `AppLayout.jsx`
  - Build Vite : 0 erreur · 4236 modules
