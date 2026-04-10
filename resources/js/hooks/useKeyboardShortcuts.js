import { useEffect, useCallback } from 'react';

/**
 * useKeyboardShortcuts
 *
 * Enregistre des raccourcis clavier globaux.
 * Ignore les événements déclenchés depuis un <input>, <textarea> ou <select>.
 *
 * @param {Record<string, () => void>} shortcuts
 *   Objet dont les clés sont des combinaisons de touches :
 *     'g d'      → touche G puis D
 *     'ctrl+k'   → Ctrl+K
 *     'ctrl+/'   → Ctrl+/
 *
 * @example
 * useKeyboardShortcuts({
 *   'g d': () => router.visit(route('admin.dashboard')),
 *   'ctrl+k': () => setSearchOpen(true),
 * });
 */
export function useKeyboardShortcuts(shortcuts) {
    // Buffer pour séquences à 2 touches (ex: "g d")
    const bufferRef = { current: '', timer: null };

    const handleKey = useCallback((e) => {
        // Ignore si focus dans un champ de saisie
        const tag = e.target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) {
            return;
        }

        // Construire la clé courante (avec modificateurs)
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey && e.key.length > 1) parts.push('shift');
        parts.push(e.key.toLowerCase());
        const combo = parts.join('+');

        // Raccourci direct (ex: 'ctrl+k')
        if (shortcuts[combo]) {
            e.preventDefault();
            shortcuts[combo]();
            return;
        }

        // Séquences à 2 touches (ex: 'g d')
        clearTimeout(bufferRef.timer);
        const seq = bufferRef.current ? `${bufferRef.current} ${e.key.toLowerCase()}` : e.key.toLowerCase();

        if (shortcuts[seq]) {
            e.preventDefault();
            shortcuts[seq]();
            bufferRef.current = '';
            return;
        }

        // Garde 1 touche en attente pendant 1 seconde
        bufferRef.current = e.key.toLowerCase();
        bufferRef.timer = setTimeout(() => { bufferRef.current = ''; }, 1000);
    }, [shortcuts]);

    useEffect(() => {
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('keydown', handleKey);
            clearTimeout(bufferRef.timer);
        };
    }, [handleKey]);
}
