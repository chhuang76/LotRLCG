/**
 * Passage Through Mirkwood - Scenario Definition
 *
 * This file contains only references (card codes), not card data.
 * Card data is stored in src/data/sets/01/
 */

import type { EncounterCard } from '../../../engine/types';
import { getEncounterSet, getQuestCardsForScenario } from '../../sets/01';
import { getEncounterCards, ENCOUNTER_SET_IDS } from '../../sets/01/encounterCards';

// ── Scenario Metadata ─────────────────────────────────────────────────────────

export const SCENARIO_ID = 'passage-through-mirkwood';
export const SCENARIO_NAME = 'Passage Through Mirkwood';
export const SCENARIO_SET = '01';
export const SCENARIO_NUMBER = 1;
export const SCENARIO_DIFFICULTY = 'Easy';

// ── Quest Card Codes ──────────────────────────────────────────────────────────

export const QUEST_CODES = ['01119A', '01120A', '01121A'];

// ── Encounter Sets Used ───────────────────────────────────────────────────────

export const ENCOUNTER_SET_NAMES = [
    ENCOUNTER_SET_IDS.SPIDERS_OF_MIRKWOOD,
    ENCOUNTER_SET_IDS.PASSAGE_THROUGH_MIRKWOOD,
    ENCOUNTER_SET_IDS.DOL_GULDUR_ORCS,
];

// ── Setup Cards (added to staging during setup) ──────────────────────────────

export const SETUP_CARD_CODES = {
    FOREST_SPIDER: '01096',
    OLD_FOREST_ROAD: '01099',
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
 * Returns the setup cards to add to staging area.
 */
export function getSetupCards(): EncounterCard[] {
    return getEncounterCards([
        SETUP_CARD_CODES.FOREST_SPIDER,
        SETUP_CARD_CODES.OLD_FOREST_ROAD,
    ]);
}

/**
 * Builds the encounter deck expanded by quantity.
 * Each card is duplicated according to its quantity field.
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

export const MIRKWOOD_SCENARIO = {
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
    buildEncounterDeck,
};

export default MIRKWOOD_SCENARIO;
