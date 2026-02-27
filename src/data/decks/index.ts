/**
 * Decks Index
 *
 * Registry of all pre-built decks. Add new decks here as they are created.
 */

import { STARTER_DECK } from './starter-01';

// ── Deck Registry ─────────────────────────────────────────────────────────────

export interface DeckInfo {
    id: string;
    name: string;
    set: string;
}

export const DECK_REGISTRY: Record<string, DeckInfo> = {
    'core-starter': {
        id: 'core-starter',
        name: 'Core Set Starter',
        set: '01',
    },
};

// ── Deck Loaders ──────────────────────────────────────────────────────────────

export const DECKS = {
    'core-starter': STARTER_DECK,
};

// ── Lookup Functions ──────────────────────────────────────────────────────────

export function getDeck(deckId: string) {
    return DECKS[deckId as keyof typeof DECKS];
}

export function getDeckInfo(deckId: string): DeckInfo | undefined {
    return DECK_REGISTRY[deckId];
}

export function getDecksBySet(setId: string): DeckInfo[] {
    return Object.values(DECK_REGISTRY).filter((d) => d.set === setId);
}

// ── Re-export for convenience ─────────────────────────────────────────────────

export { STARTER_DECK };
