/**
 * Core Set Starter Deck
 *
 * A balanced starter deck using Core Set cards.
 * This file contains only card codes and quantities - not card data.
 */

import type { PlayerCard } from '../../engine/types';
import { getHeroes, getPlayerCard } from '../sets/01/playerCards';

// ── Deck Metadata ─────────────────────────────────────────────────────────────

export const DECK_ID = 'core-starter';
export const DECK_NAME = 'Core Set Starter';
export const DECK_SET = '01';

// ── Hero Codes ────────────────────────────────────────────────────────────────

export const HERO_CODES = ['01001', '01005', '01004']; // Aragorn, Legolas, Gimli

// ── Deck Cards (code + quantity) ──────────────────────────────────────────────

export interface DeckEntry {
    code: string;
    quantity: number;
}

export const DECK_CARDS: DeckEntry[] = [
    // Leadership
    { code: '01026', quantity: 2 }, // Steward of Gondor
    { code: '01027', quantity: 1 }, // Celebrían's Stone
    { code: '01023', quantity: 2 }, // Sneak Attack
    { code: '01014', quantity: 2 }, // Faramir
    { code: '01016', quantity: 3 }, // Snowbourn Scout

    // Tactics
    { code: '01039', quantity: 2 }, // Blade of Gondolin
    { code: '01037', quantity: 2 }, // Swift Strike
    { code: '01034', quantity: 2 }, // Feint
    { code: '01028', quantity: 3 }, // Veteran Axehand
    { code: '01029', quantity: 3 }, // Gondorian Spearman
    { code: '01041', quantity: 2 }, // Dwarven Axe

    // Spirit
    { code: '01050', quantity: 2 }, // A Test of Will
    { code: '01048', quantity: 2 }, // Hasty Stroke
    { code: '01057', quantity: 1 }, // Unexpected Courage

    // Lore
    { code: '01063', quantity: 2 }, // Lore of Imladris
    { code: '01066', quantity: 2 }, // Secret Paths
    { code: '01069', quantity: 2 }, // Forest Snare
    { code: '01062', quantity: 2 }, // Gléowine

    // Neutral
    { code: '01073', quantity: 3 }, // Gandalf
];

// ── Build Functions ───────────────────────────────────────────────────────────

/**
 * Returns the hero cards for this deck.
 */
export function getStarterHeroes(): PlayerCard[] {
    return getHeroes(HERO_CODES);
}

/**
 * Returns the deck cards expanded by quantity.
 */
export function buildStarterDeck(): PlayerCard[] {
    const deck: PlayerCard[] = [];

    for (const entry of DECK_CARDS) {
        const card = getPlayerCard(entry.code);
        if (card) {
            for (let i = 0; i < entry.quantity; i++) {
                deck.push({ ...card });
            }
        }
    }

    return deck;
}

/**
 * Returns the total card count in the deck.
 */
export function getDeckSize(): number {
    return DECK_CARDS.reduce((sum, entry) => sum + entry.quantity, 0);
}

// ── Deck Configuration Export ─────────────────────────────────────────────────

export const STARTER_DECK = {
    id: DECK_ID,
    name: DECK_NAME,
    set: DECK_SET,
    heroCodes: HERO_CODES,
    cards: DECK_CARDS,
    getHeroes: getStarterHeroes,
    buildDeck: buildStarterDeck,
    getSize: getDeckSize,
};

export default STARTER_DECK;
