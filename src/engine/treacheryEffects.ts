/**
 * Treachery Effect Resolution System
 *
 * Handles "When Revealed" effects for treachery cards in the encounter deck.
 *
 * Individual treachery effects live in standalone per-card modules under
 * `src/engine/cards/01/` (e.g. `01080-caught-in-a-web.ts`), registered via
 * `registerTreachery`. The barrel `src/engine/cards/index.ts` imports them for
 * their side-effects. This file retains only the shared machinery (registry,
 * types, and resolution functions).
 */

import type { GameState, EncounterCard } from './types';

// ── Effect Result ─────────────────────────────────────────────────────────────

export interface TreacheryResult {
    state: GameState;
    log: string[];
    /** If true, the treachery should be discarded after resolution */
    discard: boolean;
}

export type TreacheryHandler = (state: GameState, card: EncounterCard) => TreacheryResult;

// ── Treachery Handler Registry ────────────────────────────────────────────────

const treacheryRegistry: Map<string, TreacheryHandler> = new Map();

export function registerTreachery(code: string, handler: TreacheryHandler): void {
    treacheryRegistry.set(code, handler);
}

export function getTreacheryHandler(code: string): TreacheryHandler | undefined {
    return treacheryRegistry.get(code);
}

// ── Main Resolution Function ──────────────────────────────────────────────────

/**
 * Resolve a treachery card's "When Revealed" effect.
 * Returns the updated game state and log messages.
 */
export function resolveTreachery(state: GameState, card: EncounterCard): TreacheryResult {
    const handler = treacheryRegistry.get(card.code);

    if (handler) {
        return handler(state, card);
    }

    // Unknown treachery - log and discard
    return {
        state,
        log: [`Treachery revealed: ${card.name} (effect not implemented)`],
        discard: true,
    };
}

/**
 * Check if a card is a treachery card.
 */
export function isTreacheryCard(card: EncounterCard): boolean {
    return card.type_code === 'treachery';
}
