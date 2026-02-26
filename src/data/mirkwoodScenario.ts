/**
 * Passage Through Mirkwood — Scenario Definition
 *
 * Defines all three quest stages and the encounter sets
 * that make up this scenario.
 */

import type { EncounterCard } from '../engine/types';

// ── Quest Cards ────────────────────────────────────────────────────────────

export const QUEST_STAGES: EncounterCard[] = [
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

// ── Encounter Set: Spiders of Mirkwood ──────────────────────────────────────

export const SPIDERS_OF_MIRKWOOD: EncounterCard[] = [
    {
        code: '01074', name: 'King Spider',
        type_code: 'enemy', traits: 'Creature. Spider.',
        engagement_cost: 25, threat: 2, attack: 3, defense: 1, health: 3,
        text: '<b>When Revealed:</b> Each player must choose and exhaust 1 character he controls.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 2,
    },
    {
        code: '01075', name: 'Hummerhorns',
        type_code: 'enemy', traits: 'Creature. Insect.',
        engagement_cost: 40, threat: 1, attack: 2, defense: 0, health: 3,
        text: '<b>Forced:</b> After Hummerhorns engages a player, it deals 5 damage to a single hero controlled by that player.',
        victory: 5,
        quantity: 1,
    },
    {
        code: '01076', name: "Ungoliant's Spawn",
        type_code: 'enemy', traits: 'Creature. Spider.',
        engagement_cost: 35, threat: 3, attack: 5, defense: 2, health: 9,
        text: "<b>When Revealed:</b> Each player must raise his threat by 4 for each Spider card in play.",
        shadow: 'Each player raises his threat by 2.',
        quantity: 1,
    },
    {
        code: '01077', name: 'Great Forest Web',
        type_code: 'treachery', traits: 'Obstacle.',
        threat: 0,
        text: "<b>When Revealed:</b> Attach to a hero (Cannot have attachments.). (Counts as a Condition attachment with the text: 'Attached hero cannot ready during the refresh phase unless you pay 2 resources from that hero's pool.')",
        quantity: 1,
    },
    {
        code: '01078', name: "Caught in a Web",
        type_code: 'treachery', traits: 'Condition.',
        threat: 0,
        text: "<b>When Revealed:</b> Each player must choose 1 hero he controls. Attach this card to that hero. (Counts as a Condition attachment with the text: 'Attached hero cannot collect resources during the resource phase.')",
        quantity: 1,
    },
];

// ── Encounter Set: Passage Through Mirkwood (unique to this scenario) ───────

export const PASSAGE_THROUGH_MIRKWOOD_SET: EncounterCard[] = [
    {
        code: '01096', name: 'Forest Spider',
        type_code: 'enemy', traits: 'Creature. Spider.',
        engagement_cost: 25, threat: 2, attack: 2, defense: 1, health: 4,
        text: '<b>Forced:</b> After Forest Spider engages a player, it gets +1 [attack] until the end of the round.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 4,
    },
    {
        code: '01097', name: 'Dol Guldur Orcs',
        type_code: 'enemy', traits: 'Orc. Warrior.',
        engagement_cost: 17, threat: 3, attack: 3, defense: 0, health: 5,
        text: '<b>Shadow:</b> Attacking enemy gets +1 [attack] for each character the defending player controls.',
        quantity: 2,
    },
    {
        code: '01098', name: 'Chieftain Ufthak',
        type_code: 'enemy', traits: 'Orc. Warrior.',
        engagement_cost: 30, threat: 3, attack: 4, defense: 2, health: 6,
        text: '<b>Forced:</b> At the end of the combat phase, if Chieftain Ufthak is in the staging area, he makes an immediate attack against the player with the highest threat.',
        victory: 4,
        quantity: 1,
    },
    {
        code: '01099', name: 'Old Forest Road',
        type_code: 'location', traits: 'Forest.',
        threat: 1, quest_points: 3,
        text: '<b>Response:</b> After Old Forest Road becomes the active location, the first player may choose and ready 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01100', name: 'Forest Gate',
        type_code: 'location', traits: 'Forest.',
        threat: 2, quest_points: 4,
        text: '<b>Travel:</b> The player with the highest threat must exhaust 1 hero he controls to travel here.',
        quantity: 2,
    },
    {
        code: '01101', name: 'Mountains of Mirkwood',
        type_code: 'location', traits: 'Forest. Hills.',
        threat: 3, quest_points: 5,
        text: 'While Mountains of Mirkwood is the active location, players cannot use card effects to place progress tokens on the current quest.',
        quantity: 2,
    },
    {
        code: '01095', name: 'Enchanted Stream',
        type_code: 'location', traits: 'Forest.',
        threat: 2, quest_points: 3,
        text: 'While Enchanted Stream is the active location, each character gets −1 [willpower].',
        quantity: 2,
    },
    {
        code: '01102', name: 'The Necromancer\'s Reach',
        type_code: 'treachery', traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Assign 1 damage to each exhausted character.',
        shadow: 'Deal 1 damage to the defending character.',
        quantity: 2,
    },
    {
        code: '01103', name: 'Driven by Shadow',
        type_code: 'treachery', traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Place 1 progress token on the current quest for each card in the staging area.',
        shadow: 'Defending player must choose and discard 1 card from his hand.',
        quantity: 2,
    },
    {
        code: '01104', name: 'Despair',
        type_code: 'treachery', traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Raise each player\'s threat by 3.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 2,
    },
];

// ── Complete encounter deck for the scenario ────────────────────────────────

export const MIRKWOOD_ENCOUNTER_DECK: EncounterCard[] = [
    ...SPIDERS_OF_MIRKWOOD,
    ...PASSAGE_THROUGH_MIRKWOOD_SET,
];

// ── Starting heroes for default single-player test ──────────────────────────
// (Real play pulls these from CoreSet.json via the deck builder)

export const DEFAULT_HEROES = {
    ARAGORN: '01001',
    LEGOLAS: '01005',
    GIMLI: '01004',
};
