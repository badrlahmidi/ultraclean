# Audit — Module POS Caissier (Création Ticket)

**Date :** 31 mars 2026  
**Périmètre :** `Create.jsx` · `ServiceGrid.jsx` · `TicketRecap.jsx` · `VehicleOverlay.jsx` · `ClientDrawer.jsx` · `WasherDrawer.jsx` · `PricePicker.jsx` · `DataTable.jsx`  
**Stack :** React 18 · Inertia.js v2 · Tailwind CSS v3 · HeadlessUI v2 · Lucide React

---

## Résumé exécutif

**31 problèmes identifiés** : 4 critiques · 16 importants · 7 code quality · 4 UX/minor.

Le flux POS est fonctionnellement complet et bien architecturé (séparation des responsabilités, debounce, calcul auto durée). Les défauts majeurs sont :
1. **Accessibilité systématique** : 5 modals/drawers DIY sans focus trap ni Escape (HeadlessUI non utilisé)  
2. **Responsive absent** : le layout 2 colonnes est inutilisable sur tablette < lg  
3. **Race conditions** : ClientDrawer expose une race condition axios sans AbortController  
4. **Anti-patterns React** : IIFE dans le JSX de TicketRecap, `span role="button"` sans keyboard handler

---

## 1. `Create.jsx` — 8 problèmes

### 🔴 Critiques

**C1 — Layout POS non responsive (mobile/tablette)**  
Le conteneur `flex h-[calc(100vh-4rem)]` avec `w-72 shrink-0` côté récap n'a aucun breakpoint. Sur un écran 768px, le récap prend 288px, laissant ~480px à la grille — acceptable. Sur 375px (mobile), le récap prend 288px sur 375px disponibles : **87px pour la grille de services, inutilisable**. Aucun layout alternatif (tabs, bottom sheet) n'est prévu.

**C2 — `<span role="button">` sans handler clavier**  
Les boutons "effacer" X (véhicule, client, opérateur) utilisent `<span role="button" tabIndex={0}>` sans `onKeyDown`. Un utilisateur clavier ne peut pas les activer avec Enter/Space. Doit devenir `<button type="button">`.

**C3 — Modals rendues sans `createPortal`**  
`VehicleOverlay`, `ClientDrawer`, `WasherDrawer` sont instanciés inline dans le DOM POS. Le conteneur parent a `overflow-hidden` — sur Safari, `position: fixed` à l'intérieur d'un ancêtre `overflow: hidden` peut être clippé. Utiliser `createPortal(…, document.body)` ou laisser HeadlessUI gérer le portail.

### ⚠️ Importants

**C4 — `serverNow` prop destructurée mais jamais utilisée**  
`export default function Create({ …, serverNow })` — `serverNow` est passé par Inertia mais la date dans la barre est calculée avec `new Date()` côté client. Si l'utilisateur laisse la page ouverte, la date peut être décalée. Utiliser `serverNow` ou supprimer la prop.

**C5 — `handleOpenVehicle` avec `...args` — API non typée**  
La fonction gère deux cas distincts via `args[0] === 'plate'`. C'est fragile et non documenté. Remplacer par deux callbacks séparés : `onOpenVehicle()` et `onSetPlate(val)`.

**C6 — `processing` peut rester bloqué sur erreur réseau**  
`setProcessing(false)` est appelé dans `onError` et `onSuccess` mais pas en cas d'exception réseau non interceptée (timeout, 503 sans réponse Inertia). Entourer d'un `try/finally`.

**C7 — `duration` objet recréé à chaque render**  
```js
const duration = { auto: durationOverride === null, minutes: durationOverride ?? autoDuration };
```
Objet inline recréé à chaque render, passé comme prop à `TicketRecap` et `WasherDrawer`. Provoque des re-renders inutiles. Wrapper dans `useMemo`.

### 🔵 Code quality

**C8 — Date `new Date()` non réactive**  
La date affichée dans la barre (`{new Date().toLocaleDateString(…)}`) est calculée une seule fois au montage (React mémoïse le JSX). Utiliser un `useMemo` ou `serverNow`.

---

## 2. `ServiceGrid.jsx` — 5 problèmes

### ⚠️ Importants

**SG1 — Carte service `<div onClick>` non accessible au clavier**  
Les cartes de services sont des `<div>` avec `onClick` mais sans `role="button"`, `tabIndex={0}`, ni `onKeyDown`. Navigation clavier impossible (Tab ne les atteint pas). Remplacer par `<button>` ou ajouter les attributs ARIA.

**SG2 — `CATEGORY_COLORS` hardcodé pour 4 catégories**  
```js
const CATEGORY_COLORS = { 'Lavage': '…', 'Pressing': '…', 'Détailing': '…', 'Autre': '…' };
```
Toute nouvelle catégorie créée en admin reçoit le fallback gris 'Autre' sans avertissement. Implémenter une palette dynamique avec un pool de couleurs cyclique via l'index.

### 🔵 Code quality

**SG3 — Suffixe hex opacité `${accentColor}1a` invalide sur format non-hex**  
Si `svc.color` contient `rgb(…)` ou un nom CSS, l'expression `${accentColor}1a` génère une valeur CSS invalide. Utiliser CSS `color-mix()` ou convertir en Tailwind arbitrary + `opacity`.

**SG4 — Bitwise OR `| 0` pour arrondir**  
`Math.min(...priceVals) / 100 | 0` — fonctionnel mais peu lisible et trompeur. Remplacer par `Math.floor(…)`.

**SG5 — Calculs `Math.min/max` non mémoïsés**  
`Object.values(prices)`, `Math.min(…)`, `Math.max(…)` recalculés pour chaque service à chaque render. Avec 30+ services, ce peut être perceptible. Extraire dans `useMemo` ou précalculer dans `handlePickerConfirm`.

---

## 3. `TicketRecap.jsx` — 5 problèmes

### 🔴 Critique

**TR1 — IIFE inline dans le JSX pour la section Opérateur**  
```jsx
{washer && (() => {
    const w = washers.find(…);
    // …80 lignes de logique…
    return (<Section label="Opérateur">…</Section>);
})()}
```
Anti-pattern React : une IIFE est recrée et exécutée à chaque render sans possibilité de mémoïsation. La lisibilité est très faible. Extraire en composant `<WasherSection>` avec ses propres props.

### ⚠️ Importants

**TR2 — `draftMin` désynchronisé pendant l'édition**  
Si l'utilisateur ouvre l'éditeur de durée et ajoute un service entre-temps (modifiant `autoDuration`), `draftMin` (valeur brouillon) reste à la valeur précédente. Synchroniser avec un `useEffect([duration.minutes])` quand `editDuration === true`.

**TR3 — Double champ plaque (source de vérité partagée)**  
La plaque est modifiable dans la topbar de `Create.jsx` ET dans la section Véhicule de `TicketRecap` via le callback `onOpenVehicle('plate', val)`. L'UX est confuse : deux champs identiques modifient le même état. Unifier en un seul endroit (recommandé : uniquement dans TicketRecap).

### 🎨 UX

**TR4 — Grille 5 colonnes `col-5` mode de paiement trop serrée**  
Sur `w-72` (288px) avec `px-4` (32px), la zone utile est ~256px. Divisée en 5 : ~51px par bouton. "Virement" en `text-[10px]` avec icône est à la limite de la lisibilité. Sur mobile (bottom sheet), encore plus critique. Passer en grille 3+2 ou utiliser un sélecteur avec étiquettes plus lisibles.

**TR5 — `dueTime` calculé avec `Date.now()` instable**  
`new Date(Date.now() + duration.minutes * 60000)` — recalculé à chaque render mais représente une heure absolue qui dérive si la page reste ouverte. Utiliser `serverNow` transmis depuis `Create.jsx`.

---

## 4. `VehicleOverlay.jsx` — 2 problèmes

### ⚠️ Importants

**VO1 — Overlay DIY sans HeadlessUI Dialog**  
L'overlay plein-écran n'a pas de :
- Focus trap (Tab peut sortir de l'overlay)
- Handler `Escape` pour fermer
- Attributs ARIA `role="dialog"`, `aria-modal="true"`, `aria-label`

Utiliser `<Dialog>` HeadlessUI (déjà utilisé dans `MobileDrawer.jsx`).

**VO2 — `autoFocus` instable en React**  
L'attribut `autoFocus` natif sur l'input de recherche fonctionne au premier montage mais React ne le ré-applique pas si le composant est re-rendu sans être démonté. Utiliser `useRef` + `useEffect(() => ref.current?.focus(), [])`.

---

## 5. `ClientDrawer.jsx` — 4 problèmes

### ⚠️ Importants

**CD1 — Drawer DIY sans HeadlessUI Dialog**  
Même déficit que VO1 : backdrop `<div>`, pas de focus trap, pas d'Escape handler, pas d'ARIA.

**CD2 — Race condition axios sans `AbortController`**  
Le debounce annule le **timer** mais si deux requêtes axios sont en vol simultanément (possible si le timer précédent a déjà déclenché avant le clearTimeout), la réponse la plus lente peut écraser la plus récente dans `setResults`.

```js
// Pattern sécurisé à implémenter :
const abortRef = useRef(null);
// Dans le useEffect :
abortRef.current?.abort();
abortRef.current = new AbortController();
const res = await axios.get(…, { signal: abortRef.current.signal });
```

**CD3 — Axios en vol non annulé au démontage**  
Si le drawer est fermé pendant une requête en cours, la réponse tentera de `setResults(…)` sur un composant démonté → warning React "Can't perform a React state update on an unmounted component". Le cleanup du useEffect annule le timer mais pas la requête. AbortController résout les deux problèmes (CD2 + CD3).

**CD4 — Touche Escape non gérée**  
Aucun `useEffect` pour écouter `keydown → Escape → onClose()`. Comportement utilisateur attendu sur un drawer.

---

## 6. `WasherDrawer.jsx` — 3 problèmes

### ⚠️ Importants

**WD1 — Drawer DIY sans HeadlessUI Dialog**  
Même déficit que CD1/VO1.

### 🔵 Code quality

**WD2 — `w.queue_minutes` peut être `null` dans `endTimeFor`**  
```js
const endMs = Date.now() + (w.queue_minutes + newDuration) * 60_000;
```
Si `w.queue_minutes` est `null` ou `undefined`, `null + 30` vaut `30` (coercion JS) mais `undefined + 30` vaut `NaN`. Le calcul devient silencieusement invalide. Remplacer par `(w.queue_minutes ?? 0) + newDuration`.

**WD3 — Requête interval non annulée au démontage**  
Le `clearInterval` dans le cleanup du useEffect est correct, mais si une requête `refresh()` est en vol au moment du démontage, elle se terminera et tentera de `setWashers()`. Ajouter un flag `isMounted` ou AbortController dans `refresh()`.

---

## 7. `PricePicker.jsx` — 2 problèmes

### 🔵 Code quality

**PP1 — `z-60` non défini dans Tailwind v3 par défaut**  
Tailwind v3 fournit `z-50` comme maximum dans les valeurs par défaut. `z-60` sera ignoré ou générera une classe inexistante. Utiliser `z-[60]` (arbitrary value) ou étendre `tailwind.config.js`.

### ⚠️ Important

**PP2 — Modal DIY sans HeadlessUI Dialog**  
Même déficit que les autres overlays : pas de focus trap, pas d'Escape, pas d'ARIA.

---

## 8. `DataTable.jsx` — 2 problèmes

### 🔵 Code quality

**DT1 — `key={i}` (index) sur les colonnes**  
`columns.map((col, i) => <th key={i}>…)` — l'index comme clé React est problématique si l'ordre des colonnes change. Utiliser `key={col.label ?? col}` ou exiger une `id` dans le schéma colonne.

**DT2 — Tri de colonnes absent**  
Le composant accepte `col.label`, `col.align`, `col.width` mais pas `col.sortable`. Pour un tableau de données admin, l'absence de tri est un déficit fonctionnel notable. Ajouter `onSort(key, direction)` prop + indicateur visuel dans le `<th>`.

---

## Tableau récapitulatif

| ID  | Fichier          | Sévérité  | Description                                   |
|-----|------------------|-----------|-----------------------------------------------|
| C1  | Create.jsx       | 🔴 Critique | Layout POS non responsive < lg               |
| C2  | Create.jsx       | 🔴 Critique | `span role="button"` sans onKeyDown           |
| C3  | Create.jsx       | 🔴 Critique | Modals sans createPortal (overflow:hidden)    |
| TR1 | TicketRecap.jsx  | 🔴 Critique | IIFE inline JSX anti-pattern                  |
| C4  | Create.jsx       | ⚠️ Import. | `serverNow` prop non utilisée                 |
| C5  | Create.jsx       | ⚠️ Import. | `handleOpenVehicle(...args)` API confuse       |
| C6  | Create.jsx       | ⚠️ Import. | `processing` bloquable sur erreur réseau      |
| SG1 | ServiceGrid.jsx  | ⚠️ Import. | `<div onClick>` non accessible                |
| SG2 | ServiceGrid.jsx  | ⚠️ Import. | CATEGORY_COLORS hardcodé                      |
| TR2 | TicketRecap.jsx  | ⚠️ Import. | `draftMin` désynchronisé pendant édition      |
| TR3 | TicketRecap.jsx  | ⚠️ Import. | Double source de vérité plaque                |
| VO1 | VehicleOverlay   | ⚠️ Import. | Overlay DIY sans focus trap/Escape/ARIA       |
| VO2 | VehicleOverlay   | ⚠️ Import. | `autoFocus` instable React                    |
| CD1 | ClientDrawer.jsx | ⚠️ Import. | Drawer DIY sans HeadlessUI Dialog             |
| CD2 | ClientDrawer.jsx | ⚠️ Import. | Race condition axios (pas AbortController)    |
| CD3 | ClientDrawer.jsx | ⚠️ Import. | Axios non annulé au démontage                 |
| CD4 | ClientDrawer.jsx | ⚠️ Import. | Touche Escape non gérée                       |
| WD1 | WasherDrawer.jsx | ⚠️ Import. | Drawer DIY sans HeadlessUI Dialog             |
| PP2 | PricePicker.jsx  | ⚠️ Import. | Modal DIY sans HeadlessUI Dialog              |
| TR4 | TicketRecap.jsx  | 🎨 UX     | Grille paiement 5 col trop serrée             |
| TR5 | TicketRecap.jsx  | 🎨 UX     | `dueTime` avec Date.now() instable            |
| C7  | Create.jsx       | 🔵 Code   | `duration` objet non mémoïsé                 |
| C8  | Create.jsx       | 🔵 Code   | Date `new Date()` non réactive                |
| SG3 | ServiceGrid.jsx  | 🔵 Code   | Suffixe hex opacité invalide non-hex          |
| SG4 | ServiceGrid.jsx  | 🔵 Code   | Bitwise OR `\| 0` pour arrondir               |
| SG5 | ServiceGrid.jsx  | 🔵 Code   | Calculs min/max non mémoïsés                  |
| WD2 | WasherDrawer.jsx | 🔵 Code   | `queue_minutes` null → NaN silencieux         |
| WD3 | WasherDrawer.jsx | 🔵 Code   | Requête interval non annulée au démontage     |
| PP1 | PricePicker.jsx  | 🔵 Code   | `z-60` non défini Tailwind v3                 |
| DT1 | DataTable.jsx    | 🔵 Code   | `key={i}` index sur colonnes                  |
| DT2 | DataTable.jsx    | 🔵 Code   | Tri de colonnes absent                        |

**Total : 4 critiques · 16 importants · 7 code quality · 4 UX**

---

## Plan d'action proposé

### Étape A — Accessibilité universelle drawers/overlays (haute priorité)
Migrer les 5 overlays DIY vers `<Dialog>` HeadlessUI avec focus trap, Escape, ARIA :
- `VehicleOverlay.jsx` → `<Dialog>` plein-écran
- `ClientDrawer.jsx` → `<Dialog>` + `<DialogPanel>` slide-in droite + AbortController
- `WasherDrawer.jsx` → `<Dialog>` + `<DialogPanel>` slide-in droite
- `PricePicker.jsx` → `<Dialog>` centered modal

### Étape B — Fix critiques Create.jsx
- `<span role="button">` → `<button type="button">`
- `useMemo` sur `duration`
- Séparer `onOpenVehicle` / `onSetPlate`
- `serverNow` utilisé pour la date + `dueTime`
- `try/finally` sur `submit()`

### Étape C — Responsive POS mobile
Layout mobile (< md) : colonne unique avec bottom sheet collapsible pour TicketRecap (type iOS bottom drawer, hauteur 60vh, drag handle).

### Étape D — TicketRecap refactoring
- Extraire `<WasherSection>` depuis l'IIFE
- Grille paiement 3+2 avec labels plus lisibles
- `useEffect` sync `draftMin` quand `editDuration` actif

### Étape E — ServiceGrid & DataTable
- Cartes service `<button>` accessible
- CATEGORY_COLORS pool dynamique cyclique
- `Math.floor()` + `useMemo` pour calculs prix
- `DataTable` : `key` sur label + prop `onSort`

---

*Audit rédigé le 31/03/2026 — En attente de validation avant développement.*
