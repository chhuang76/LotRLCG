import type { PlayerCard, EncounterCard } from '../engine/types';

// Import local JSON datasets (Vite resolves these at build time)
import coreSet from '../../RingsDB/json/Core.json';
import coreEncounter from '../../RingsDB/json/core_encounter.json';

export function getPlayerCards(): PlayerCard[] {
    // RingsDB JSON structure has a slightly different shape — cast it
    return (coreSet as unknown as PlayerCard[]).filter(
        (c) => !['enemy', 'location', 'treachery', 'quest', 'objective'].includes(c.type_code)
    );
}

export function getEncounterCards(): EncounterCard[] {
    return coreEncounter as unknown as EncounterCard[];
}

export function getCardByCode(code: string): PlayerCard | EncounterCard | undefined {
    const all: (PlayerCard | EncounterCard)[] = [...getPlayerCards(), ...getEncounterCards()];
    return all.find((c) => c.code === code);
}

/** Returns only the Mirkwood scenario encounter set */
export function getMirkwoodEncounterDeck(): EncounterCard[] {
    const mirkwoodCodes = [
        '01074', '01075', '01076', // Enemies: King Spider, Hummerhorns, Ungoliant's Spawn
        '01096', '01097', '01098', // Enemies: Forest Spider, East Bight Patrol, Black Forest Bats
        '01089', '01090', '01091', // Enemies: Dol Guldur Orcs, Chieftain Ufthak, Dol Guldur Beastmaster
        '01077', '01078', '01099', '01100', '01094', '01095', // Locations
        '01092', '01093', '01079', '01080',                    // Treacheries
    ];
    return getEncounterCards().filter((c) => mirkwoodCodes.includes(c.code));
}

export function getMirkwoodQuestDeck(): EncounterCard[] {
    return getEncounterCards().filter(
        (c) => c.type_code === 'quest' && ['01119', '01120', '01121'].includes(c.code)
    );
}
