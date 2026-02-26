/**
 * Keyword Parser and Handler System
 *
 * Handles encounter card keywords like Surge and Doomed.
 *
 * Keywords in LOTR LCG:
 * - Surge: After resolving this card's staging, reveal an additional card
 * - Doomed X: Each player raises their threat by X
 * - Guarded: Attach to another encounter card (not implemented yet)
 * - Peril: Only active player may trigger responses (not implemented yet)
 */

import type { GameState, EncounterCard } from './types';

// ── Keyword Detection ─────────────────────────────────────────────────────────

/**
 * Check if a card has the Surge keyword.
 * Surge can appear in:
 * - The `keywords` field (e.g., "Surge.")
 * - The `traits` field (less common)
 * - The `text` field (e.g., "Surge." at the beginning)
 */
export function hasSurge(card: EncounterCard): boolean {
    // Check keywords field (RingsDB format may have this)
    const keywords = (card as any).keywords ?? '';
    if (keywords.toLowerCase().includes('surge')) {
        return true;
    }

    // Check traits field
    const traits = card.traits ?? '';
    if (traits.toLowerCase().includes('surge')) {
        return true;
    }

    // Check text field for "Surge." keyword
    const text = card.text ?? '';
    if (text.toLowerCase().includes('surge.') || text.toLowerCase().startsWith('surge')) {
        return true;
    }

    return false;
}

/**
 * Check if a card has the Doomed keyword and return the X value.
 * Returns 0 if no Doomed keyword is found.
 *
 * Doomed X appears as:
 * - "Doomed 2." in keywords or text
 * - "Doomed X." where X is a number
 */
export function getDoomedValue(card: EncounterCard): number {
    // Check keywords field
    const keywords = (card as any).keywords ?? '';
    const keywordMatch = keywords.match(/doomed\s*(\d+)/i);
    if (keywordMatch) {
        return parseInt(keywordMatch[1], 10);
    }

    // Check traits field
    const traits = card.traits ?? '';
    const traitsMatch = traits.match(/doomed\s*(\d+)/i);
    if (traitsMatch) {
        return parseInt(traitsMatch[1], 10);
    }

    // Check text field
    const text = card.text ?? '';
    const textMatch = text.match(/doomed\s*(\d+)/i);
    if (textMatch) {
        return parseInt(textMatch[1], 10);
    }

    return 0;
}

/**
 * Check if a card has any keywords that need to be resolved.
 */
export function hasKeywords(card: EncounterCard): boolean {
    return hasSurge(card) || getDoomedValue(card) > 0;
}

// ── Keyword Resolution ────────────────────────────────────────────────────────

export interface KeywordResult {
    state: GameState;
    log: string[];
    /** If true, reveal an additional encounter card (Surge) */
    surge: boolean;
}

/**
 * Resolve all keywords on an encounter card.
 * This should be called when a card is revealed during staging.
 *
 * @param state Current game state
 * @param card The encounter card being revealed
 * @returns Updated state, log messages, and whether to surge
 */
export function resolveKeywords(state: GameState, card: EncounterCard): KeywordResult {
    const logs: string[] = [];
    let nextState = state;
    let shouldSurge = false;

    // Check for Doomed X
    const doomedValue = getDoomedValue(card);
    if (doomedValue > 0) {
        logs.push(`Doomed ${doomedValue}: Each player raises their threat by ${doomedValue}.`);

        const updatedPlayers = nextState.players.map((player) => {
            const newThreat = Math.min(50, player.threat + doomedValue);
            logs.push(`${player.name}'s threat raised to ${newThreat}.`);
            return { ...player, threat: newThreat };
        });

        nextState = { ...nextState, players: updatedPlayers };

        // Check for threat elimination
        const eliminated = nextState.players.filter((p) => p.threat >= 50);
        if (eliminated.length > 0) {
            logs.push(`${eliminated.map((p) => p.name).join(', ')} eliminated by threat!`);
            nextState = { ...nextState, phase: 'game_over' };
        }
    }

    // Check for Surge
    if (hasSurge(card)) {
        logs.push(`Surge: Revealing an additional encounter card.`);
        shouldSurge = true;
    }

    return {
        state: nextState,
        log: logs,
        surge: shouldSurge,
    };
}

// ── Keyword Parsing Utilities ─────────────────────────────────────────────────

/**
 * Parse all keywords from a card and return them as an array.
 * Useful for displaying keywords on cards.
 */
export function parseKeywords(card: EncounterCard): string[] {
    const keywords: string[] = [];

    if (hasSurge(card)) {
        keywords.push('Surge');
    }

    const doomedValue = getDoomedValue(card);
    if (doomedValue > 0) {
        keywords.push(`Doomed ${doomedValue}`);
    }

    return keywords;
}

/**
 * Format keywords for display (e.g., "Surge. Doomed 2.")
 */
export function formatKeywords(card: EncounterCard): string {
    const keywords = parseKeywords(card);
    return keywords.length > 0 ? keywords.map((k) => `${k}.`).join(' ') : '';
}
