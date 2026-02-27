/**
 * Card Registry
 *
 * Single entry point for all card lookups across sets, scenarios, and decks.
 */

import type { PlayerCard, EncounterCard } from '../engine/types';

// Re-export from sets
export { getCardByCode, getCardsByCodes, getEncounterSet, getSetInfo } from './sets';

// Re-export from scenarios
export { getScenario, getScenarioInfo, getScenariosBySet } from './scenarios';

// Re-export from decks
export { getDeck, getDeckInfo, getDecksBySet } from './decks';

// ── Convenience Imports ───────────────────────────────────────────────────────

import { STARTER_DECK } from './decks';
import { MIRKWOOD_SCENARIO } from './scenarios';

// ── Build Full Game ───────────────────────────────────────────────────────────

export interface GameSetup {
    heroes: PlayerCard[];
    playerDeck: PlayerCard[];
    questDeck: EncounterCard[];
    encounterDeck: EncounterCard[];
    setupCards: EncounterCard[];
}

/**
 * Builds a complete game setup from a deck ID and scenario ID.
 */
export function buildGameSetup(deckId: string, scenarioId: string): GameSetup {
    // Get deck
    const deck = deckId === 'core-starter' ? STARTER_DECK : null;
    if (!deck) {
        throw new Error(`Unknown deck: ${deckId}`);
    }

    // Get scenario
    const scenario = scenarioId === 'passage-through-mirkwood' ? MIRKWOOD_SCENARIO : null;
    if (!scenario) {
        throw new Error(`Unknown scenario: ${scenarioId}`);
    }

    return {
        heroes: deck.getHeroes(),
        playerDeck: deck.buildDeck(),
        questDeck: scenario.getQuestDeck(),
        encounterDeck: scenario.buildEncounterDeck(),
        setupCards: scenario.getSetupCards(),
    };
}

/**
 * Quick setup using default starter deck and Mirkwood scenario.
 */
export function buildDefaultGameSetup(): GameSetup {
    return buildGameSetup('core-starter', 'passage-through-mirkwood');
}

// ── Type Guards ───────────────────────────────────────────────────────────────

export function isPlayerCard(card: PlayerCard | EncounterCard): card is PlayerCard {
    return 'sphere_code' in card || card.type_code === 'hero' || card.type_code === 'ally' || card.type_code === 'attachment' || card.type_code === 'event';
}

export function isEncounterCard(card: PlayerCard | EncounterCard): card is EncounterCard {
    return card.type_code === 'enemy' || card.type_code === 'location' || card.type_code === 'treachery' || card.type_code === 'quest';
}

// ── Default Exports ───────────────────────────────────────────────────────────

export { STARTER_DECK, MIRKWOOD_SCENARIO };
