/**
 * Core Set (01) - Index
 *
 * Exports all cards from the Core Set.
 */

export * from './playerCards';
export * from './encounterCards';
export * from './questCards';

import { ALL_PLAYER_CARDS, getPlayerCard } from './playerCards';
import { ALL_ENCOUNTER_CARDS, getEncounterCard, getEncounterSet } from './encounterCards';
import { ALL_QUEST_CARDS, getQuestCard } from './questCards';
import type { PlayerCard, EncounterCard } from '../../../engine/types';

// ── Set Metadata ──────────────────────────────────────────────────────────────

export const SET_ID = '01';
export const SET_NAME = 'Core Set';
export const SET_RELEASE_DATE = '2011-04-20';

// ── Unified Lookup ────────────────────────────────────────────────────────────

export function getCard(code: string): PlayerCard | EncounterCard | undefined {
    return getPlayerCard(code) ?? getEncounterCard(code) ?? getQuestCard(code);
}

export function getAllCards(): (PlayerCard | EncounterCard)[] {
    return [...ALL_PLAYER_CARDS, ...ALL_ENCOUNTER_CARDS, ...ALL_QUEST_CARDS];
}

// ── Re-export for convenience ─────────────────────────────────────────────────

export { getEncounterSet };
