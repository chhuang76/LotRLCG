/**
 * Core Set (01) - Encounter Cards
 *
 * All encounter cards from the Core Set including enemies, locations, and treacheries.
 * Data sourced from OCTGN Game Definition: https://github.com/GeckoTH/Lord-of-the-Rings
 * Card codes: 01074 - 01118
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

// ── Spiders of Mirkwood Encounter Set (01074-01080) ──────────────────────────

export const SPIDERS_OF_MIRKWOOD: EncounterCard[] = [
    {
        code: '01074',
        name: 'King Spider',
        type_code: 'enemy',
        traits: 'Creature. Spider.',
        engagement_cost: 20,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 3,
        text: '<b>When Revealed:</b> Each player must choose and exhaust 1 character he controls.',
        shadow: 'Defending player must choose and exhaust 1 character he controls. (2 characters instead if this attack is undefended.)',
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
        text: '<b>Forced:</b> After Hummerhorns engages you, deal 5 damage to a single hero you control.',
        shadow: 'Deal 1 damage to each character the defending player controls. (2 damage instead if this attack is undefended.)',
        victory: 5,
        quantity: 1,
    },
    {
        code: '01076',
        name: "Ungoliant's Spawn",
        type_code: 'enemy',
        traits: 'Creature. Spider.',
        engagement_cost: 32,
        threat: 3,
        attack: 5,
        defense: 2,
        health: 9,
        text: 'When <em>Ungoliant\'s Spawn</em> attacks, it gets +1 [attack] (+2 [attack] instead if attacking the first player).',
        shadow: 'Raise defending player\'s threat by 4. (Raise defending player\'s threat by 8 instead if this attack is undefended.)',
        quantity: 1,
    },
    {
        code: '01077',
        name: 'Great Forest Web',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 2,
        text: '<b>Travel:</b> Each player must exhaust 1 hero he controls to travel here.',
        shadow: 'Defending player must choose and exhaust 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01078',
        name: 'Mountains of Mirkwood',
        type_code: 'location',
        traits: 'Forest. Mountain.',
        threat: 2,
        quest_points: 3,
        text: '<b>Travel:</b> Reveal the top card of the encounter deck and add it to the staging area to travel here.<br/><b>Response:</b> After <em>Mountains of Mirkwood</em> leaves play as an explored location, each player may search the top 5 cards of his deck for 1 card and add it to his hand. Shuffle the rest back into their decks.',
        quantity: 3,
    },
    {
        code: '01079',
        name: 'Eyes of the Forest',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Each player discards all event cards in his hand.',
        quantity: 1,
    },
    {
        code: '01080',
        name: 'Caught in a Web',
        type_code: 'treachery',
        traits: 'Condition.',
        threat: 0,
        text: '<b>When Revealed:</b> The player with the highest threat level attaches this card to one of his heroes. (Counts as a Condition attachment with the text: "Attached hero does not ready during the refresh phase unless you pay 2 resources from that hero\'s pool.")',
        shadow: 'Defending player must choose and exhaust 1 character he controls.',
        quantity: 2,
    },
];

// ── Wilderlands Encounter Set (01081-01088) ──────────────────────────────────

export const WILDERLANDS_SET: EncounterCard[] = [
    {
        code: '01081',
        name: 'Wolf Rider',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 10,
        threat: 1,
        attack: 2,
        defense: 0,
        health: 2,
        text: '<b>Surge.</b><br/>Forced: After a character is declared as a defender against <em>Wolf Rider</em>, deal 1 damage to the defending character.',
        quantity: 1,
    },
    {
        code: '01082',
        name: 'Hill Troll',
        type_code: 'enemy',
        traits: 'Troll.',
        engagement_cost: 30,
        threat: 1,
        attack: 6,
        defense: 3,
        health: 9,
        text: 'Excess combat damage dealt by Hill Troll (damage that is dealt beyond the remaining hit points of the character damaged by its attack) must be assigned as an increase to your threat.',
        victory: 4,
        quantity: 2,
    },
    {
        code: '01083',
        name: 'Goblin Sniper',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 48,
        threat: 2,
        attack: 2,
        defense: 0,
        health: 2,
        text: 'During the encounter phase, players cannot optionally engage Goblin Sniper if there are other enemies in the staging area.<br/><b>Forced:</b> If Goblin Sniper is in the staging area at the end of the combat phase, each player deals 1 damage to 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01084',
        name: 'Marsh Adder',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 40,
        threat: 3,
        attack: 4,
        defense: 1,
        health: 7,
        text: '<b>Forced:</b> Each time Marsh Adder attacks you, raise your threat by 1.',
        victory: 3,
        quantity: 1,
    },
    {
        code: '01085',
        name: 'Wargs',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 20,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 3,
        text: '<b>Forced:</b> If Wargs is dealt a shadow card with no effect, return Wargs to the staging area after it attacks.',
        shadow: 'Attacking enemy gets +1 [attack]. (+2 [attack] instead if this attack is undefended.)',
        quantity: 2,
    },
    {
        code: '01086',
        name: 'Despair',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Remove 4 progress tokens from the current quest card. (If there are fewer than 4 progress tokens on the quest, remove all progress tokens from that quest.)',
        shadow: 'Defending character does not count its [defense].',
        quantity: 2,
    },
    {
        code: '01087',
        name: 'The Brown Lands',
        type_code: 'location',
        traits: 'Wasteland.',
        threat: 5,
        quest_points: 1,
        text: '<b>Forced:</b> After the players travel to The Brown Lands, place 1 progress token on it.',
        quantity: 2,
    },
    {
        code: '01088',
        name: 'The East Bight',
        type_code: 'location',
        traits: 'Wasteland.',
        threat: 1,
        quest_points: 6,
        text: 'When faced with the option to travel, the players must travel to The East Bight if there is no active location.',
        quantity: 2,
    },
];

// ── Dol Guldur Orcs Encounter Set (01089-01095) ──────────────────────────────

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
        text: '<b>When Revealed:</b> The first player chooses 1 character currently committed to a quest. Deal 2 damage to that character.',
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
        text: 'Chieftain Ufthak gets +2 [attack] for each resource token on him.<br/><b>Forced:</b> After Chieftain Ufthak attacks, place 1 resource token on him.',
        victory: 4,
        quantity: 1,
    },
    {
        code: '01091',
        name: 'Dol Guldur Beastmaster',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 35,
        threat: 2,
        attack: 3,
        defense: 1,
        health: 5,
        text: '<b>Forced:</b> When Dol Guldur Beastmaster attacks, deal it 1 additional shadow card.',
        quantity: 2,
    },
    {
        code: '01092',
        name: 'Driven by Shadow',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Each enemy and each location currently in the staging area gets +1 [threat] until the end of the phase. If there are no cards in the staging area, Driven by Shadow gains surge.',
        shadow: 'Choose and discard 1 attachment from the defending character. (If this attack is undefended, discard all attachments you control.)',
        quantity: 1,
    },
    {
        code: '01093',
        name: "The Necromancer's Reach",
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Deal 1 damage to each exhausted character.',
        quantity: 3,
    },
    {
        code: '01094',
        name: "Necromancer's Pass",
        type_code: 'location',
        traits: 'Stronghold. Dol Guldur.',
        threat: 3,
        quest_points: 2,
        text: '<b>Travel:</b> The first player must discard 2 cards from his hand at random to travel here.',
        quantity: 2,
    },
    {
        code: '01095',
        name: 'Enchanted Stream',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 2,
        text: 'While Enchanted Stream is the active location, players cannot draw cards.',
        quantity: 2,
    },
];

// ── Passage Through Mirkwood Encounter Set (01096-01100) ─────────────────────

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
        shadow: 'Defending player must choose and discard 1 attachment he controls.',
        quantity: 4,
    },
    {
        code: '01097',
        name: 'East Bight Patrol',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 5,
        threat: 3,
        attack: 3,
        defense: 1,
        health: 2,
        shadow: 'Attacking enemy gets +1 [attack]. (If this attack is undefended, also raise your threat by 3.)',
        quantity: 1,
    },
    {
        code: '01098',
        name: 'Black Forest Bats',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 15,
        threat: 1,
        attack: 1,
        defense: 0,
        health: 2,
        text: '<b>When Revealed:</b> Each player must choose 1 character currently committed to a quest, and remove that character from the quest. (The chosen character does not ready.)',
        quantity: 1,
    },
    {
        code: '01099',
        name: 'Old Forest Road',
        type_code: 'location',
        traits: 'Forest.',
        threat: 1,
        quest_points: 3,
        text: '<b>Response:</b> After you travel to Old Forest Road, the first player may choose and ready 1 character he controls.',
        quantity: 2,
    },
    {
        code: '01100',
        name: 'Forest Gate',
        type_code: 'location',
        traits: 'Forest.',
        threat: 2,
        quest_points: 4,
        text: '<b>Response:</b> After you travel to Forest Gate, the first player may draw 2 cards.',
        quantity: 2,
    },
];

// ── Escape from Dol Guldur Encounter Set (01101-01110) ───────────────────────

export const ESCAPE_FROM_DOL_GULDUR_SET: EncounterCard[] = [
    {
        code: '01101',
        name: 'Dungeon Jailor',
        type_code: 'enemy',
        traits: 'Dol Guldur. Orc.',
        engagement_cost: 38,
        threat: 1,
        attack: 2,
        defense: 3,
        health: 5,
        text: '<b>Forced:</b> If Dungeon Jailor is in the staging area after the players have just quested unsuccessfully, shuffle 1 unclaimed objective card from the staging area back into the encounter deck.',
        victory: 5,
        quantity: 2,
    },
    {
        code: '01102',
        name: 'Nazgûl of Dol Guldur',
        type_code: 'enemy',
        traits: 'Nazgûl.',
        engagement_cost: 40,
        threat: 5,
        attack: 4,
        defense: 3,
        health: 9,
        text: 'No attachments can be played on Nazgûl of Dol Guldur.<br/><b>Forced:</b> When the prisoner is "rescued", move Nazgûl of Dol Guldur into the staging area.<br/><b>Forced:</b> After a shadow effect dealt to Nazgûl of Dol Guldur resolves, the engaged player must choose and discard 1 character he controls.',
        quantity: 1,
    },
    {
        code: '01103',
        name: 'Cavern Guardian',
        type_code: 'enemy',
        traits: 'Undead.',
        engagement_cost: 8,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 2,
        text: '<b>Doomed 1.</b>',
        shadow: 'Choose and discard 1 attachment you control. Discarded objective cards are returned to the staging area. (If this attack is undefended, discard all attachments you control.)',
        quantity: 2,
    },
    {
        code: '01104',
        name: 'Under the Shadow',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Until the end of the phase, raise the total [threat] in the staging area by X, where X is the number of players in the game.',
        shadow: 'Defending player raises his threat by the number of enemies with which he is engaged.',
        quantity: 2,
    },
    {
        code: '01105',
        name: 'Iron Shackles',
        type_code: 'treachery',
        traits: 'Condition.',
        threat: 0,
        text: '<b>When Revealed:</b> Attach Iron Shackles to the top of the first player\'s deck. (Counts as a Condition attachment with the text: "The next time a player would draw 1 or more cards from attached deck, discard Iron Shackles instead.")',
        shadow: 'Resolve the "When Revealed" effect of Iron Shackles.',
        quantity: 1,
    },
    {
        code: '01106',
        name: 'Endless Caverns',
        type_code: 'location',
        traits: 'Dungeon.',
        threat: 1,
        quest_points: 3,
        text: '<b>Doomed 1. Surge.</b>',
        quantity: 2,
    },
    {
        code: '01107',
        name: 'Tower Gate',
        type_code: 'location',
        traits: 'Dungeon.',
        threat: 2,
        quest_points: 1,
        text: '<b>Forced:</b> After travelling to Tower Gate, each player places the top card of his deck, face down in front of him, as if it just engaged him from the staging area. These cards are called "Orc Guard", and act as enemies with: 1 hit point, 1 [attack], and 1 [defense].',
        quantity: 2,
    },
    {
        code: '01108',
        name: "Gandalf's Map",
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: '<b>Guarded. Restricted.</b><br/><b>Action:</b> Raise your threat by 2 to claim this objective when it is free of encounters. When claimed, attach Gandalf\'s Map to a hero you control. (Counts as an attachment. If detached, return Gandalf\'s Map to the staging area.)<br/>Attached hero cannot attack or defend.',
        quantity: 1,
    },
    {
        code: '01109',
        name: 'Dungeon Torch',
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: '<b>Guarded. Restricted.</b><br/><b>Action:</b> Raise your threat by 2 to claim this objective when it is free of encounters. When claimed, attach Dungeon Torch to a hero you control. (Counts as an attachment. If detached, return Dungeon Torch to the staging area.)<br/><b>Forced:</b> At the end of each round, raise attached hero\'s controller\'s threat by 2.',
        quantity: 1,
    },
    {
        code: '01110',
        name: 'Shadow Key',
        type_code: 'objective',
        traits: 'Item.',
        threat: 0,
        text: '<b>Guarded. Restricted.</b><br/><b>Action:</b> Raise your threat by 2 to claim this objective when it is free of encounters. When claimed, attach Shadow Key to a hero you control. (Counts as an attachment. If detached, return Shadow Key to the staging area.)<br/><b>Forced:</b> At the end of each round, attached hero suffers 1 damage.',
        quantity: 1,
    },
];

// ── Journey Down the Anduin Encounter Set (01111-01114) ──────────────────────

export const JOURNEY_DOWN_THE_ANDUIN_SET: EncounterCard[] = [
    {
        code: '01111',
        name: 'Misty Mountain Goblins',
        type_code: 'enemy',
        traits: 'Goblin. Orc.',
        engagement_cost: 15,
        threat: 2,
        attack: 2,
        defense: 1,
        health: 3,
        text: '<b>Forced:</b> After Misty Mountain Goblins attacks, remove 1 progress token from the current quest.',
        shadow: 'Remove 1 progress token from the current quest. (3 progress tokens instead if this attack is undefended.)',
        quantity: 3,
    },
    {
        code: '01112',
        name: 'Massing at Night',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Reveal X additional cards from the encounter deck. X is the number of players in the game.',
        shadow: 'Deal X shadow cards to this attacker. X is the number of players in the game.',
        quantity: 1,
    },
    {
        code: '01113',
        name: 'Banks of the Anduin',
        type_code: 'location',
        traits: 'Riverland.',
        threat: 1,
        quest_points: 3,
        text: '<b>Forced:</b> If Banks of the Anduin leaves play, return it to the top of the encounter deck instead of placing it in the discard pile.',
        quantity: 2,
    },
    {
        code: '01114',
        name: 'Gladden Fields',
        type_code: 'location',
        traits: 'Marshland.',
        threat: 3,
        quest_points: 3,
        text: '<b>Forced:</b> While Gladden Fields is the active location, each player must raise his threat by an additional point during the refresh phase.',
        victory: 3,
        quantity: 3,
    },
];

// ── Sauron's Reach Encounter Set (01115-01118) ───────────────────────────────

export const SAURONS_REACH_SET: EncounterCard[] = [
    {
        code: '01115',
        name: 'Eastern Crows',
        type_code: 'enemy',
        traits: 'Creature.',
        engagement_cost: 30,
        threat: 1,
        attack: 1,
        defense: 0,
        health: 1,
        text: '<b>Surge.</b><br/><b>Forced:</b> After Eastern Crows is defeated, shuffle it back into the encounter deck.',
        shadow: 'Attacking enemy gets +1 [attack]. (+2 [attack] instead if defending player\'s threat is 35 or higher.)',
        quantity: 3,
    },
    {
        code: '01116',
        name: 'Evil Storm',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Deal 1 damage to each character controlled by each player with a threat of 35 or higher.',
        shadow: 'If the defending player\'s threat is 35 or higher, this attack is considered undefended.',
        quantity: 3,
    },
    {
        code: '01117',
        name: 'Pursued by Shadow',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Each player raises his threat by 1 for each character he controls that is not currently committed to a quest.',
        shadow: 'Defending player chooses and returns 1 exhausted ally he controls to its owner\'s hand. If he controls no exhausted allies, raise his threat by 3.',
        quantity: 2,
    },
    {
        code: '01118',
        name: 'Treacherous Fog',
        type_code: 'treachery',
        traits: '',
        threat: 0,
        text: '<b>When Revealed:</b> Each location in the staging area gets +1 [threat] until the end of the phase. Then, each player with a threat of 35 or higher chooses and discards 1 card from his hand.',
        quantity: 2,
    },
];

// ── All Encounter Cards ───────────────────────────────────────────────────────

export const ALL_ENCOUNTER_CARDS: EncounterCard[] = [
    ...SPIDERS_OF_MIRKWOOD,
    ...WILDERLANDS_SET,
    ...DOL_GULDUR_ORCS_SET,
    ...PASSAGE_THROUGH_MIRKWOOD_SET,
    ...ESCAPE_FROM_DOL_GULDUR_SET,
    ...JOURNEY_DOWN_THE_ANDUIN_SET,
    ...SAURONS_REACH_SET,
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
