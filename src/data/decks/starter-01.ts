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

export const HERO_CODES = ['01012', '01007', '01003']; // Beravor, Éowyn, Glóin

// ── Deck Cards (code + quantity) ──────────────────────────────────────────────

export interface DeckEntry {
    code: string;
    quantity: number;
}

export const DECK_CARDS: DeckEntry[] = [
    // Allies
    { code: '01031', quantity: 1 }, // Beorn
    { code: '01059', quantity: 2 }, // Erebor Hammersmith
    { code: '01014', quantity: 2 }, // Faramir
    { code: '01073', quantity: 3 }, // Gandalf
    { code: '01062', quantity: 1 }, // Gléowine
    { code: '01013', quantity: 2 }, // Guard of the Citadel
    { code: '01060', quantity: 1 }, // Henamarth Riversong
    { code: '01018', quantity: 1 }, // Longbeard Orc Slayer
    { code: '01061', quantity: 2 }, // Miner of the Iron Hills
    { code: '01045', quantity: 1 }, // Northern Tracker
    { code: '01016', quantity: 3 }, // Snowbourn Scout
    { code: '01015', quantity: 1 }, // Son of Arnor

    // Attachments
    { code: '01027', quantity: 1 }, // Celebrían's Stone
    { code: '01071', quantity: 1 }, // Dark Knowledge
    { code: '01069', quantity: 2 }, // Forest Snare
    { code: '01070', quantity: 2 }, // Protector of Lórien
    { code: '01072', quantity: 3 }, // Self Preservation
    { code: '01026', quantity: 3 }, // Steward of Gondor
    { code: '01057', quantity: 2 }, // Unexpected Courage

    // Events
    { code: '01050', quantity: 3 }, // A Test of Will
    { code: '01020', quantity: 1 }, // Ever Vigilant
    { code: '01022', quantity: 2 }, // For Gondor!
    { code: '01048', quantity: 2 }, // Hasty Stroke
    { code: '01063', quantity: 2 }, // Lore of Imladris
    { code: '01023', quantity: 3 }, // Sneak Attack
    { code: '01051', quantity: 3 }, // Stand and Fight
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
