/**
 * Sets Index
 *
 * Registry of all card sets. Add new sets here as they are implemented.
 */

import type { PlayerCard, EncounterCard } from '../../engine/types';

// ── Set Metadata ──────────────────────────────────────────────────────────────

export interface SetInfo {
    id: string;
    name: string;
    releaseDate: string;
}

export const SET_REGISTRY: Record<string, SetInfo> = {
    '01': { id: '01', name: 'Core Set', releaseDate: '2011-04-20' },
    // Future sets:
    // '02': { id: '02', name: 'The Hunt for Gollum', releaseDate: '2011-07-21' },
    // '03': { id: '03', name: 'Conflict at the Carrock', releaseDate: '2011-08-18' },
};

// ── Set Loaders ───────────────────────────────────────────────────────────────

// Import sets statically for now (can be converted to lazy loading later)
import * as CoreSet from './01';

const SETS: Record<string, typeof CoreSet> = {
    '01': CoreSet,
};

// ── Card Lookup Functions ─────────────────────────────────────────────────────

/**
 * Get the set ID from a card code.
 * Card codes are formatted as {setId}{cardNumber}, e.g., "01001" → "01"
 */
export function getSetIdFromCode(code: string): string {
    return code.substring(0, 2);
}

/**
 * Get any card by its code from any loaded set.
 */
export function getCardByCode(code: string): PlayerCard | EncounterCard | undefined {
    const setId = getSetIdFromCode(code);
    const set = SETS[setId];
    return set?.getCard(code);
}

/**
 * Get multiple cards by their codes.
 */
export function getCardsByCodes(codes: string[]): (PlayerCard | EncounterCard)[] {
    return codes
        .map((code) => getCardByCode(code))
        .filter((c): c is PlayerCard | EncounterCard => c !== undefined);
}

/**
 * Get an encounter set by name from a specific set.
 */
export function getEncounterSet(setId: string, encounterSetName: string): EncounterCard[] {
    const set = SETS[setId];
    return set?.getEncounterSet(encounterSetName) ?? [];
}

/**
 * Check if a set is loaded.
 */
export function isSetLoaded(setId: string): boolean {
    return setId in SETS;
}

/**
 * Get set info.
 */
export function getSetInfo(setId: string): SetInfo | undefined {
    return SET_REGISTRY[setId];
}

// ── Re-export Core Set for convenience ────────────────────────────────────────

export { CoreSet };
