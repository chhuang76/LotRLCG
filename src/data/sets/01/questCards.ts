/**
 * Core Set (01) - Quest Cards
 *
 * Quest cards for all Core Set scenarios.
 * Card codes: 01119 - 01127
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

// ── Journey Down the Anduin Quest Cards ───────────────────────────────────────

export const ANDUIN_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01122A',
        name: 'To the River...',
        type_code: 'quest',
        stage: 1,
        quest_points: 8,
        text:
            '<b>Setup:</b> Search the encounter deck for a Hill Troll, and add it to the staging area. Shuffle the encounter deck.' +
            '<br/><b>Forced:</b> When this stage is defeated, each player must reveal 1 card from the encounter deck.',
        quantity: 1,
    },
    {
        code: '01123A',
        name: 'Anduin Passage',
        type_code: 'quest',
        stage: 2,
        quest_points: 16,
        text:
            '<b>Reveal 1 additional card from the encounter deck each turn and add it to the staging area.</b>' +
            '<br/>Do not make engagement checks during the encounter phase. (Enemies can still engage players through other effects.)',
        quantity: 1,
    },
    {
        code: '01124A',
        name: 'Ambush on the Shore',
        type_code: 'quest',
        stage: 3,
        quest_points: 0,
        text:
            '<b>When Revealed:</b> Each player must reveal 1 encounter card and add it to the staging area.' +
            '<br/>Skip the staging step of the quest phase for the remainder of the game.' +
            '<br/>Once there are no enemies left in play, the players have won the game.',
        quantity: 1,
    },
];

// ── Escape from Dol Guldur Quest Cards ────────────────────────────────────────

export const DOL_GULDUR_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01125A',
        name: 'The Necromancer\'s Tower',
        type_code: 'quest',
        stage: 1,
        quest_points: 9,
        text:
            '<b>Setup:</b> Search the encounter deck for the 3 objective cards, and place them in the staging area. Also remove and shuffle the "Nazgûl of Dol Guldur" card into the encounter deck. Choose 1 player\'s hero at random. That hero is the "prisoner." Flip that hero face down, set it aside, and attach 1 objective card to it.' +
            '<br/>Players cannot advance to stage 2 until there are no objective cards in play, and all 3 objective cards have been "found."',
        quantity: 1,
    },
    {
        code: '01126A',
        name: 'Through the Caverns',
        type_code: 'quest',
        stage: 2,
        quest_points: 15,
        text:
            '<b>When Revealed:</b> Shuffle the Nazgûl of Dol Guldur back into the encounter deck if it is in the discard pile.' +
            '<br/>Enemies get +1 [attack] and +1 [defense].' +
            '<br/>When Revealed: Reveal 1 card from the encounter deck and add it to the staging area.',
        quantity: 1,
    },
    {
        code: '01127A',
        name: 'Out of the Dungeons',
        type_code: 'quest',
        stage: 3,
        quest_points: 7,
        text:
            '<b>When Revealed:</b> Shuffle the encounter discard pile back into the encounter deck.' +
            '<br/>Enemies cannot take damage.' +
            '<br/>The players have won the game when this stage is defeated and the prisoner is rescued.',
        quantity: 1,
    },
];

// ── All Quest Cards ───────────────────────────────────────────────────────────

export const ALL_QUEST_CARDS: EncounterCard[] = [
    ...MIRKWOOD_QUEST_CARDS,
    ...ANDUIN_QUEST_CARDS,
    ...DOL_GULDUR_QUEST_CARDS,
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
        case 'journey-down-the-anduin':
            return ANDUIN_QUEST_CARDS;
        case 'escape-from-dol-guldur':
            return DOL_GULDUR_QUEST_CARDS;
        default:
            return [];
    }
}
