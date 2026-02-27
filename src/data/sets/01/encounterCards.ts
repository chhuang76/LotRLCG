/**
 * Core Set (01) - Encounter Cards
 *
 * All encounter cards from the Core Set including enemies, locations, and treacheries.
 * Card codes: 01074 - 01121
 */

import type { EncounterCard } from '../../../engine/types';

// ── Encounter Set IDs ─────────────────────────────────────────────────────────

export const ENCOUNTER_SET_IDS = {
    // Shared encounter sets
    SPIDERS_OF_MIRKWOOD: 'spiders-of-mirkwood',
    DOL_GULDUR_ORCS: 'dol-guldur-orcs',
    SAURONS_REACH: 'saurons-reach',
    WILDERLANDS: 'wilderlands',
    // Scenario-specific encounter sets
    PASSAGE_THROUGH_MIRKWOOD: 'passage-through-mirkwood',
    JOURNEY_DOWN_THE_ANDUIN: 'journey-down-the-anduin',
    ESCAPE_FROM_DOL_GULDUR: 'escape-from-dol-guldur',
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
        name: "Necromancer's Pass",
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
        name: "Necromancer's Reach",
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: 'When Revealed: Deal 1 damage to each exhausted character.',
        quantity: 3,
    },
];

// ── Sauron's Reach Encounter Set ──────────────────────────────────────────────

export const SAURONS_REACH_SET: EncounterCard[] = [
    {
        code: '01079',
        name: 'Eastern Crows',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 30,
        threat: 1,
        attack: 1,
        defense: 0,
        health: 1,
        text: 'Surge. When Revealed: Eastern Crows gets +1 [threat] until the end of the phase.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 3,
    },
    {
        code: '01080',
        name: 'Black Forest Bats',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 15,
        threat: 1,
        attack: 1,
        defense: 0,
        health: 2,
        text: 'When Revealed: Each player must choose 1 character currently committed to a quest. Deal 1 damage to that character.',
        shadow: 'Defending character gets -1 [defense] until the end of this attack.',
        quantity: 1,
    },
    {
        code: '01081',
        name: "The Brown Lands",
        type_code: 'location',
        traits: 'Wasteland.',
        threat: 5,
        quest_points: 1,
        text: '',
        quantity: 2,
    },
    {
        code: '01082',
        name: "The East Bight",
        type_code: 'location',
        traits: 'Wasteland.',
        threat: 1,
        quest_points: 6,
        text: '',
        quantity: 2,
    },
    {
        code: '01083',
        name: "Treacherous Fog",
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: 'When Revealed: Each location in the staging area gets +1 [threat] until the end of the phase. Then, each player raises his threat by the number of locations in the staging area.',
        shadow: 'Defending player raises his threat by 2.',
        quantity: 2,
    },
    {
        code: '01084',
        name: 'Evil Storm',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: 'When Revealed: Deal 1 damage to each character committed to a quest.',
        shadow: 'Attacking enemy gets +1 [attack].',
        quantity: 3,
    },
];

// ── Wilderlands Encounter Set ─────────────────────────────────────────────────

export const WILDERLANDS_SET: EncounterCard[] = [
    {
        code: '01085',
        name: 'Hill Troll',
        type_code: 'enemy',
        traits: 'Troll.',
        engagement_cost: 30,
        threat: 1,
        attack: 6,
        defense: 3,
        health: 9,
        text: 'Excess combat damage dealt by Hill Troll (damage that is dealt beyond the remaining hit points of the character damaged by this attack) must be assigned as an increase to your threat.',
        victory: 4,
        quantity: 1,
    },
    {
        code: '01086',
        name: 'Goblin Sniper',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 48,
        threat: 2,
        attack: 2,
        defense: 0,
        health: 2,
        text: 'Goblin Sniper engages the last player. Forced: At the end of each round, if Goblin Sniper is not engaged with a player, each player deals 1 damage to 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01087',
        name: 'Wargs',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 20,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 3,
        text: 'Shadow: Attacking enemy gets +1 [attack]. If this attack destroys a character, return attacking enemy to the staging area after this attack.',
        quantity: 2,
    },
    {
        code: '01088',
        name: 'Marsh Adder',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 40,
        threat: 3,
        attack: 4,
        defense: 1,
        health: 7,
        text: 'Forced: Each time Marsh Adder deals damage to a character, raise the controller\'s threat by 1.',
        victory: 3,
        quantity: 1,
    },
];

// ── Journey Down the Anduin Encounter Set ─────────────────────────────────────

export const JOURNEY_DOWN_THE_ANDUIN_SET: EncounterCard[] = [
    {
        code: '01105',
        name: 'Misty Mountain Goblins',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 15,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 3,
        text: 'Forced: After Misty Mountain Goblins attacks, remove 1 progress token from the current quest.',
        quantity: 3,
    },
    {
        code: '01106',
        name: 'Banks of the Anduin',
        type_code: 'location',
        traits: 'Riverland.',
        threat: 1,
        quest_points: 3,
        text: 'Forced: If Banks of the Anduin leaves play, return it to the top of the encounter deck instead of placing it in the discard pile.',
        quantity: 2,
    },
    {
        code: '01107',
        name: 'Gladden Fields',
        type_code: 'location',
        traits: 'Marshland.',
        threat: 3,
        quest_points: 3,
        text: 'Forced: While Gladden Fields is the active location, each player must raise his threat by 2 during the refresh phase.',
        quantity: 3,
    },
    {
        code: '01108',
        name: 'Despair',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: "When Revealed: Remove 4 progress tokens from the current quest. (If there are fewer than 4 progress tokens on the quest, remove all progress tokens and raise each player's threat by 2.)",
        shadow: 'Defending player chooses and discards an attachment he controls.',
        quantity: 2,
    },
    {
        code: '01109',
        name: 'Pursued by Shadow',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: "When Revealed: Each player raises his threat by 1 for each enemy in the staging area.",
        shadow: 'Attacking enemy gets +1 [attack] for each enemy in the staging area.',
        quantity: 2,
    },
    {
        code: '01110',
        name: 'Massing at Night',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: 'When Revealed: Reveal X additional cards from the encounter deck, where X is the number of players in the game.',
        quantity: 1,
    },
];

// ── Escape from Dol Guldur Encounter Set ──────────────────────────────────────

export const ESCAPE_FROM_DOL_GULDUR_SET: EncounterCard[] = [
    {
        code: '01111',
        name: 'Nazgûl of Dol Guldur',
        type_code: 'enemy',
        traits: 'Nazgûl.',
        engagement_cost: 40,
        threat: 5,
        attack: 4,
        defense: 3,
        health: 9,
        text: 'No attachments can be played on Nazgûl of Dol Guldur. Forced: When the prisoner is rescued, the Nazgûl engages the first player.',
        victory: 5,
        quantity: 1,
    },
    {
        code: '01112',
        name: 'Dungeon Jailor',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 38,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 5,
        text: 'Forced: If Dungeon Jailor is in the staging area at the end of the quest phase, shuffle 1 unclaimed objective card from the staging area back into the encounter deck.',
        quantity: 2,
    },
    {
        code: '01113',
        name: 'Cavern Guardian',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 8,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 2,
        text: 'Doomed 1.',
        shadow: 'Choose and discard 1 attachment from defending character. If this attack is undefended, all attachments in play are discarded.',
        quantity: 2,
    },
    {
        code: '01114',
        name: "Dol Guldur",
        type_code: 'location',
        traits: 'Stronghold. Dol Guldur.',
        threat: 3,
        quest_points: 3,
        text: 'Dol Guldur cannot be explored while an objective card is attached to it. If there are no other locations in play, add Dol Guldur to the staging area.',
        quantity: 2,
    },
    {
        code: '01115',
        name: "Tower Gate",
        type_code: 'location',
        traits: 'Gate.',
        threat: 2,
        quest_points: 1,
        text: 'Forced: After travelling to Tower Gate, each player must discard 1 card from their hand.',
        quantity: 2,
    },
    {
        code: '01116',
        name: "Gandalf's Map",
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: 'Restricted. Action: Exhaust Gandalf\'s Map to look at the top card of the encounter deck.',
        quantity: 1,
    },
    {
        code: '01117',
        name: "Dungeon Torch",
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: 'Restricted. Action: Exhaust Dungeon Torch to place 2 progress tokens on the current quest.',
        quantity: 1,
    },
    {
        code: '01118',
        name: "Shadow Key",
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: 'Restricted. Action: Exhaust Shadow Key to ready the attached hero.',
        quantity: 1,
    },
];

// ── All Encounter Cards ───────────────────────────────────────────────────────

export const ALL_ENCOUNTER_CARDS: EncounterCard[] = [
    ...SPIDERS_OF_MIRKWOOD,
    ...PASSAGE_THROUGH_MIRKWOOD_SET,
    ...DOL_GULDUR_ORCS_SET,
    ...SAURONS_REACH_SET,
    ...WILDERLANDS_SET,
    ...JOURNEY_DOWN_THE_ANDUIN_SET,
    ...ESCAPE_FROM_DOL_GULDUR_SET,
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
        case ENCOUNTER_SET_IDS.SPIDERS_OF_MIRKWOOD:
            return SPIDERS_OF_MIRKWOOD;
        case ENCOUNTER_SET_IDS.PASSAGE_THROUGH_MIRKWOOD:
            return PASSAGE_THROUGH_MIRKWOOD_SET;
        case ENCOUNTER_SET_IDS.DOL_GULDUR_ORCS:
            return DOL_GULDUR_ORCS_SET;
        case ENCOUNTER_SET_IDS.SAURONS_REACH:
            return SAURONS_REACH_SET;
        case ENCOUNTER_SET_IDS.WILDERLANDS:
            return WILDERLANDS_SET;
        case ENCOUNTER_SET_IDS.JOURNEY_DOWN_THE_ANDUIN:
            return JOURNEY_DOWN_THE_ANDUIN_SET;
        case ENCOUNTER_SET_IDS.ESCAPE_FROM_DOL_GULDUR:
            return ESCAPE_FROM_DOL_GULDUR_SET;
        default:
            return [];
    }
}
