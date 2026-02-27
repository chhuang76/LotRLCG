/**
 * Journey Down the Anduin - Scenario Definition
 *
 * This file contains only references (card codes), not card data.
 * Card data is stored in src/data/sets/01/
 */

import type { EncounterCard } from '../../../engine/types';
import { getEncounterSet, getQuestCardsForScenario } from '../../sets/01';
import { getEncounterCards, ENCOUNTER_SET_IDS } from '../../sets/01/encounterCards';

// ── Scenario Metadata ─────────────────────────────────────────────────────────

export const SCENARIO_ID = 'journey-down-the-anduin';
export const SCENARIO_NAME = 'Journey Down the Anduin';
export const SCENARIO_SET = '01';
export const SCENARIO_NUMBER = 2;
export const SCENARIO_DIFFICULTY = 'Medium';

// ── Quest Card Codes ──────────────────────────────────────────────────────────

export const QUEST_CODES = ['01126A', '01127A', '01128A'];

// ── Encounter Sets Used ───────────────────────────────────────────────────────
// From rulebook: Journey Down the Anduin, Sauron's Reach, Dol Guldur Orcs, and Wilderlands

export const ENCOUNTER_SET_NAMES = [
    ENCOUNTER_SET_IDS.JOURNEY_DOWN_THE_ANDUIN,
    ENCOUNTER_SET_IDS.SAURONS_REACH,
    ENCOUNTER_SET_IDS.DOL_GULDUR_ORCS,
    ENCOUNTER_SET_IDS.WILDERLANDS,
];

// ── Setup Cards (added to staging during setup) ──────────────────────────────

export const SETUP_CARD_CODES = {
    HILL_TROLL: '01082',
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
    return getEncounterCards([SETUP_CARD_CODES.HILL_TROLL]);
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

export const ANDUIN_SCENARIO = {
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

export default ANDUIN_SCENARIO;
