/**
 * Core Set (01) - Quest Cards
 *
 * Quest cards for all Core Set scenarios.
 * Card codes: 01119 - 01121 (Passage Through Mirkwood)
 */

import type { EncounterCard } from '../../../engine/types';

// ── Passage Through Mirkwood Quest Cards ──────────────────────────────────────

export const MIRKWOOD_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01119A',
        name: 'Flies and Spiders',
        type_code: 'quest',
        stage: 1,
        quest_points: 8,
        text:
            '<b>Setup:</b> Search the encounter deck for 1 copy of <em>Forest Spider</em> and 1 copy of <em>Old Forest Road</em>, and add them to the staging area. Shuffle the encounter deck.' +
            '<br/><b>Forced:</b> When this stage is defeated, advance to stage 2.',
        quantity: 1,
    },
    {
        code: '01120A',
        name: 'A Fork in the Road',
        type_code: 'quest',
        stage: 2,
        quest_points: 10,
        text:
            '<b>When Revealed:</b> Add the Caught in a Web set-aside card to the staging area.' +
            '<br/><b>Forced:</b> At the end of the encounter phase, if there are no enemies in play, reveal the top card of the encounter deck.' +
            '<br/><b>Forced:</b> When this stage is defeated, advance to stage 3.',
        quantity: 1,
    },
    {
        code: '01121A',
        name: 'Escape from Mirkwood',
        type_code: 'quest',
        stage: 3,
        quest_points: 0,
        text:
            '<b>Forced:</b> At the beginning of each encounter phase, reveal 2 cards from the encounter deck instead of 1.' +
            '<br/>When there are 0 cards remaining in the encounter deck, the players win the game!',
        quantity: 1,
    },
];

// ── All Quest Cards ───────────────────────────────────────────────────────────

export const ALL_QUEST_CARDS: EncounterCard[] = [
    ...MIRKWOOD_QUEST_CARDS,
];

// ── Lookup Functions ──────────────────────────────────────────────────────────

export function getQuestCard(code: string): EncounterCard | undefined {
    return ALL_QUEST_CARDS.find((c) => c.code === code);
}

export function getQuestCards(codes: string[]): EncounterCard[] {
    return codes
        .map((code) => getQuestCard(code))
        .filter((c): c is EncounterCard => c !== undefined);
}

export function getQuestCardsForScenario(scenarioId: string): EncounterCard[] {
    switch (scenarioId) {
        case 'passage-through-mirkwood':
            return MIRKWOOD_QUEST_CARDS;
        default:
            return [];
    }
}
