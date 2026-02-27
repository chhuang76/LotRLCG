/**
 * Escape from Dol Guldur - Scenario Definition
 *
 * This file contains only references (card codes), not card data.
 * Card data is stored in src/data/sets/01/
 */

import type { EncounterCard } from '../../../engine/types';
import { getEncounterSet, getQuestCardsForScenario } from '../../sets/01';
import { getEncounterCards, ENCOUNTER_SET_IDS } from '../../sets/01/encounterCards';

// ── Scenario Metadata ─────────────────────────────────────────────────────────

export const SCENARIO_ID = 'escape-from-dol-guldur';
export const SCENARIO_NAME = 'Escape from Dol Guldur';
export const SCENARIO_SET = '01';
export const SCENARIO_NUMBER = 3;
export const SCENARIO_DIFFICULTY = 'Hard';

// ── Quest Card Codes ──────────────────────────────────────────────────────────

export const QUEST_CODES = ['01123A', '01124A', '01125A'];

// ── Encounter Sets Used ───────────────────────────────────────────────────────
// From rulebook: Escape from Dol Guldur, Spiders of Mirkwood, and Dol Guldur Orcs

export const ENCOUNTER_SET_NAMES = [
    ENCOUNTER_SET_IDS.ESCAPE_FROM_DOL_GULDUR,
    ENCOUNTER_SET_IDS.SPIDERS_OF_MIRKWOOD,
    ENCOUNTER_SET_IDS.DOL_GULDUR_ORCS,
];

// ── Setup Cards (objective cards placed in staging during setup) ─────────────

export const SETUP_CARD_CODES = {
    GANDALFS_MAP: '01108',
    DUNGEON_TORCH: '01109',
    SHADOW_KEY: '01110',
};

// ── Build Functions ───────────────────────────────────────────────────────────

/**
 * Returns the quest deck for this scenario.
 */
export function getQuestDeck(): EncounterCard[] {
    return getQuestCardsForScenario(SCENARIO_ID);
}

/**
 * Returns the complete encounter deck for this scenario.
 * Cards are NOT expanded by quantity - use buildEncounterDeck for that.
 */
export function getEncounterDeckCards(): EncounterCard[] {
    return ENCOUNTER_SET_NAMES.flatMap((setName) => getEncounterSet(setName));
}

/**
 * Returns the setup cards (objectives) to add to staging area.
 */
export function getSetupCards(): EncounterCard[] {
    return getEncounterCards([
        SETUP_CARD_CODES.GANDALFS_MAP,
        SETUP_CARD_CODES.DUNGEON_TORCH,
        SETUP_CARD_CODES.SHADOW_KEY,
    ]);
}

/**
 * Returns the Nazgul card that needs special handling during setup.
 * Should be shuffled into the encounter deck (removed from standard setup).
 */
export function getNazgulCard(): EncounterCard | undefined {
    const cards = getEncounterCards(['01102']);
    return cards[0];
}

/**
 * Builds the encounter deck expanded by quantity.
 * Each card is duplicated according to its quantity field.
 * Note: Nazgûl of Dol Guldur (01102) starts shuffled in the encounter deck.
 */
export function buildEncounterDeck(): EncounterCard[] {
    const cards = getEncounterDeckCards();
    const deck: EncounterCard[] = [];

    for (const card of cards) {
        const qty = card.quantity ?? 1;
        for (let i = 0; i < qty; i++) {
            deck.push({ ...card });
        }
    }

    return deck;
}

// ── Scenario Configuration Export ─────────────────────────────────────────────

export const DOL_GULDUR_SCENARIO = {
    id: SCENARIO_ID,
    name: SCENARIO_NAME,
    set: SCENARIO_SET,
    number: SCENARIO_NUMBER,
    difficulty: SCENARIO_DIFFICULTY,
    questCodes: QUEST_CODES,
    encounterSets: ENCOUNTER_SET_NAMES,
    setupCards: SETUP_CARD_CODES,
    getQuestDeck,
    getEncounterDeckCards,
    getSetupCards,
    getNazgulCard,
    buildEncounterDeck,
};

export default DOL_GULDUR_SCENARIO;
