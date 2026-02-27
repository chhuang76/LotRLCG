/**
 * Core Set (01) - Encounter Cards
 *
 * All encounter cards from the Core Set including enemies, locations, and treacheries.
 * Card codes: 01074 - 01121
 */

import type { EncounterCard } from '../../../engine/types';

// ── Encounter Set IDs ─────────────────────────────────────────────────────────

export const ENCOUNTER_SET_IDS = {
    SPIDERS_OF_MIRKWOOD: 'spiders-of-mirkwood',
    PASSAGE_THROUGH_MIRKWOOD: 'passage-through-mirkwood',
    DOL_GULDUR_ORCS: 'dol-guldur-orcs',
} as const;

export type EncounterSetId = typeof ENCOUNTER_SET_IDS[keyof typeof ENCOUNTER_SET_IDS];

// ── Spiders of Mirkwood Encounter Set ─────────────────────────────────────────

export const SPIDERS_OF_MIRKWOOD: EncounterCard[] = [
    {
        code: '01074',
        name: 'King Spider',
        type_code: 'enemy',
        traits: 'Creature. Spider.',
        engagement_cost: 25,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 3,
        text: '<b>When Revealed:</b> Each player must choose and exhaust 1 character he controls.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 2,
    },
    {
        code: '01075',
        name: 'Hummerhorns',
        type_code: 'enemy',
        traits: 'Creature. Insect.',
        engagement_cost: 40,
        threat: 1,
        attack: 2,
        defense: 0,
        health: 3,
        text: '<b>Forced:</b> After Hummerhorns engages a player, it deals 5 damage to a single hero controlled by that player.',
        victory: 5,
        quantity: 1,
    },
    {
        code: '01076',
        name: "Ungoliant's Spawn",
        type_code: 'enemy',
        traits: 'Creature. Spider.',
        engagement_cost: 35,
        threat: 3,
        attack: 5,
        defense: 2,
        health: 9,
        text: '<b>When Revealed:</b> Each player must raise his threat by 4 for each Spider card in play.',
        shadow: 'Each player raises his threat by 2.',
        quantity: 1,
    },
    {
        code: '01077',
        name: 'Great Forest Web',
        type_code: 'treachery',
        traits: 'Obstacle.',
        threat: 0,
        text: "<b>When Revealed:</b> Attach to a hero (Cannot have attachments.). (Counts as a Condition attachment with the text: 'Attached hero cannot ready during the refresh phase unless you pay 2 resources from that hero's pool.')",
        quantity: 1,
    },
    {
        code: '01078',
        name: 'Caught in a Web',
        type_code: 'treachery',
        traits: 'Condition.',
        threat: 0,
        text: "<b>When Revealed:</b> Each player must choose 1 hero he controls. Attach this card to that hero. (Counts as a Condition attachment with the text: 'Attached hero cannot collect resources during the resource phase.')",
        quantity: 1,
    },
];

// ── Passage Through Mirkwood Encounter Set ────────────────────────────────────

export const PASSAGE_THROUGH_MIRKWOOD_SET: EncounterCard[] = [
    {
        code: '01096',
        name: 'Forest Spider',
        type_code: 'enemy',
        traits: 'Creature. Spider.',
        engagement_cost: 25,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 4,
        text: '<b>Forced:</b> After Forest Spider engages a player, it gets +1 [attack] until the end of the round.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 4,
    },
    {
        code: '01097',
        name: 'Dol Guldur Orcs',
        type_code: 'enemy',
        traits: 'Orc. Warrior.',
        engagement_cost: 17,
        threat: 3,
        attack: 3,
        defense: 0,
        health: 5,
        text: '<b>Shadow:</b> Attacking enemy gets +1 [attack] for each character the defending player controls.',
        quantity: 2,
    },
    {
        code: '01098',
        name: 'Chieftain Ufthak',
        type_code: 'enemy',
        traits: 'Orc. Warrior.',
        engagement_cost: 30,
        threat: 3,
        attack: 4,
        defense: 2,
        health: 6,
        text: '<b>Forced:</b> At the end of the combat phase, if Chieftain Ufthak is in the staging area, he makes an immediate attack against the player with the highest threat.',
        victory: 4,
        quantity: 1,
    },
    {
        code: '01099',
        name: 'Old Forest Road',
        type_code: 'location',
        traits: 'Forest.',
        threat: 1,
        quest_points: 3,
        text: '<b>Response:</b> After Old Forest Road becomes the active location, the first player may choose and ready 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01100',
        name: 'Forest Gate',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 4,
        text: '<b>Travel:</b> The player with the highest threat must exhaust 1 hero he controls to travel here.',
        quantity: 2,
    },
    {
        code: '01101',
        name: 'Mountains of Mirkwood',
        type_code: 'location',
        traits: 'Forest. Hills.',
        threat: 3,
        quest_points: 5,
        text: 'While Mountains of Mirkwood is the active location, players cannot use card effects to place progress tokens on the current quest.',
        quantity: 2,
    },
    {
        code: '01095',
        name: 'Enchanted Stream',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 3,
        text: 'While Enchanted Stream is the active location, each character gets −1 [willpower].',
        quantity: 2,
    },
    {
        code: '01102',
        name: "The Necromancer's Reach",
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Assign 1 damage to each exhausted character.',
        shadow: 'Deal 1 damage to the defending character.',
        quantity: 2,
    },
    {
        code: '01103',
        name: 'Driven by Shadow',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Place 1 progress token on the current quest for each card in the staging area.',
        shadow: 'Defending player must choose and discard 1 card from his hand.',
        quantity: 2,
    },
    {
        code: '01104',
        name: 'Despair',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: "<b>When Revealed:</b> Raise each player's threat by 3.",
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 2,
    },
];

// ── Dol Guldur Orcs Encounter Set ─────────────────────────────────────────────

export const DOL_GULDUR_ORCS_SET: EncounterCard[] = [
    {
        code: '01089',
        name: 'Dol Guldur Orcs',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 10,
        threat: 2,
        attack: 2,
        defense: 0,
        health: 3,
        text: 'When Revealed: The first player chooses 1 character currently committed to a quest. Deal 2 damage to that character.',
        shadow: 'Attacking enemy gets +1 [attack]. (+3 [attack] instead if this attack is undefended.)',
        quantity: 3,
    },
    {
        code: '01090',
        name: 'Chieftain Ufthak',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 35,
        threat: 2,
        attack: 3,
        defense: 3,
        health: 6,
        text: 'Chieftain Ufthak gets +2 [attack] for each resource token on him. Forced: After Chieftain Ufthak attacks, place 1 resource token on him.',
        victory: 4,
        quantity: 1,
    },
    {
        code: '01091',
        name: 'Dol Guldur Beastmaster',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 35,
        threat: 3,
        attack: 3,
        defense: 1,
        health: 5,
        text: 'Forced: When Dol Guldur Beastmaster attacks, deal it 1 additional shadow card.',
        quantity: 2,
    },
    {
        code: '01092',
        name: 'Necromancer\'s Pass',
        type_code: 'location',
        traits: 'Stronghold. Dol Guldur.',
        threat: 3,
        quest_points: 2,
        text: 'Travel: The first player must discard 2 cards from his hand at random to travel here.',
        quantity: 2,
    },
    {
        code: '01093',
        name: 'Enchanted Stream',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 2,
        text: 'While Enchanted Stream is the active location, players cannot draw cards.',
        quantity: 2,
    },
    {
        code: '01094',
        name: 'Necromancer\'s Reach',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: 'When Revealed: Deal 1 damage to each exhausted character.',
        quantity: 3,
    },
];

// ── All Encounter Cards ───────────────────────────────────────────────────────

export const ALL_ENCOUNTER_CARDS: EncounterCard[] = [
    ...SPIDERS_OF_MIRKWOOD,
    ...PASSAGE_THROUGH_MIRKWOOD_SET,
    ...DOL_GULDUR_ORCS_SET,
];

// ── Lookup Functions ──────────────────────────────────────────────────────────

export function getEncounterCard(code: string): EncounterCard | undefined {
    return ALL_ENCOUNTER_CARDS.find((c) => c.code === code);
}

export function getEncounterCards(codes: string[]): EncounterCard[] {
    return codes
        .map((code) => getEncounterCard(code))
        .filter((c): c is EncounterCard => c !== undefined);
}

export function getEncounterSet(setName: string): EncounterCard[] {
    switch (setName) {
        case 'spiders-of-mirkwood':
            return SPIDERS_OF_MIRKWOOD;
        case 'passage-through-mirkwood':
            return PASSAGE_THROUGH_MIRKWOOD_SET;
        case 'dol-guldur-orcs':
            return DOL_GULDUR_ORCS_SET;
        default:
            return [];
    }
}
