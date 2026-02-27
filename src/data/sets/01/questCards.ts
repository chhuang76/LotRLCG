/**
 * Core Set (01) - Quest Cards
 *
 * Quest cards for all Core Set scenarios.
 * Card codes: 01119 - 01128
 *
 * Data source: OCTGN GitHub repository
 * Reference: References/octgn_core_set.xml
 */

import type { EncounterCard } from '../../../engine/types';

// ── Passage Through Mirkwood Quest Cards (01119-01122) ───────────────────────

export const MIRKWOOD_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01119A',
        name: 'Flies and Spiders',
        type_code: 'quest',
        stage: 1,
        quest_points: 8,
        text:
            '<b>Setup:</b> Search the encounter deck for 1 copy of <em>Forest Spider</em> and 1 copy of <em>Old Forest Road</em>, and add them to the staging area. Shuffle the encounter deck.',
        quantity: 1,
    },
    {
        code: '01120A',
        name: 'A Fork in the Road',
        type_code: 'quest',
        stage: 2,
        quest_points: 2,
        text:
            '<b>Forced:</b> When you defeat this stage, proceed to one of the 2 "A Chosen Path" stages, at random.',
        quantity: 1,
    },
    {
        code: '01121A',
        name: "A Chosen Path - Don't Leave the Path!",
        type_code: 'quest',
        stage: 3,
        quest_points: 0,
        text:
            '<b>When Revealed:</b> Each player must search the encounter deck and discard pile for 1 Spider card of his choice, and add it to the staging area.<br/><br/>The players must find and defeat Ungoliant\'s Spawn to win this game.',
        quantity: 1,
    },
    {
        code: '01122A',
        name: "A Chosen Path - Beorn's Path",
        type_code: 'quest',
        stage: 3,
        quest_points: 10,
        text:
            "Players cannot defeat this stage while Ungoliant's Spawn is in play. If players defeat this stage, they have won the game.",
        quantity: 1,
    },
];

// ── Escape from Dol Guldur Quest Cards (01123-01125) ─────────────────────────

export const DOL_GULDUR_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01123A',
        name: "The Necromancer's Tower",
        type_code: 'quest',
        stage: 1,
        quest_points: 9,
        text:
            '<b>Setup:</b> Search the encounter deck for the 3 objective cards, reveal and place them in the staging area. Also, place the Nazgûl of Dol Guldur face up but out of play, alongside the quest deck. Then, shuffle the encounter deck, and attach 1 encounter to each objective card.<br/><br/><b>When Revealed:</b> Randomly select 1 hero card (among all the heroes controlled by the players) and turn it facedown. That hero is now considered a "prisoner", cannot be used, cannot be damaged, and does not collect resources, until it is "rescued" (as instructed by card effects) later in this quest.<br/><br/>The players, as a group, cannot play more than 1 ally card each round.<br/><br/>Players cannot advance to the next stage of this quest unless they have at least 1 objective card.',
        quantity: 1,
    },
    {
        code: '01124A',
        name: 'Through the Caverns',
        type_code: 'quest',
        stage: 2,
        quest_points: 15,
        text:
            '<b>Response:</b> After placing any number of progress tokens on this card, flip the "prisoner" hero card face-up, and place 1 damage token on it. This hero has been "rescued", and may now be used by its controller.<br/><br/>The players, as a group, cannot play more than 1 ally card each round.<br/><br/>Players cannot advance to the next stage of this quest unless they have rescued the prisoner and have all 3 "Escape from Dol Guldur" objective cards.',
        quantity: 1,
    },
    {
        code: '01125A',
        name: 'Out of the Dungeons',
        type_code: 'quest',
        stage: 3,
        quest_points: 7,
        text:
            '<b>Forced:</b> At the beginning of each quest phase, each player places the top card of his deck, face down in front of him, as if it just engaged him from the staging area. These cards are called "Orc Guard", and act as enemies with: 1 hit point, 1 [attack], and 1 [defense].<br/><br/>Players cannot defeat this stage while Nazgûl of Dol Guldur is in play. If this stage is defeated and Nazgûl of Dol Guldur is not in play, the players have won the game.',
        quantity: 1,
    },
];

// ── Journey Down the Anduin Quest Cards (01126-01128) ────────────────────────

export const ANDUIN_QUEST_CARDS: EncounterCard[] = [
    {
        code: '01126A',
        name: 'To the River...',
        type_code: 'quest',
        stage: 1,
        quest_points: 8,
        text:
            '<b>Setup:</b> Each player reveals 1 card from the top of the encounter deck, and adds it to the staging area.<br/><br/><b>When Revealed:</b> Search the encounter deck for 1 Hill Troll (if one is not already in play), and place it in the staging area. Shuffle the encounter deck.<br/><br/>Players cannot defeat this stage while any Hill Troll cards are in play.',
        quantity: 1,
    },
    {
        code: '01127A',
        name: 'Anduin Passage',
        type_code: 'quest',
        stage: 2,
        quest_points: 16,
        text:
            'Reveal 1 additional card from the encounter deck each quest phase. Do not make engagement checks during the encounter phase. (Each player may still optionally engage 1 enemy each encounter phase.)',
        quantity: 1,
    },
    {
        code: '01128A',
        name: 'Ambush on the Shore',
        type_code: 'quest',
        stage: 3,
        quest_points: 0,
        text:
            '<b>When Revealed:</b> Reveal 2 encounter cards per player, and add them to the staging area.<br/><br/>Skip the staging step of the quest phase for the remainder of the game.<br/><br/>Once there are no enemies in play, the players have won the game.',
        quantity: 1,
    },
];

// ── All Quest Cards ───────────────────────────────────────────────────────────

export const ALL_QUEST_CARDS: EncounterCard[] = [
    ...MIRKWOOD_QUEST_CARDS,
    ...DOL_GULDUR_QUEST_CARDS,
    ...ANDUIN_QUEST_CARDS,
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
