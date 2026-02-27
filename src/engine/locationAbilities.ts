/**
 * Location Ability System
 *
 * Handles location abilities for the Passage Through Mirkwood scenario.
 *
 * Location Ability Types:
 * - Travel: Cost or effect when traveling to the location
 * - Response (After Traveling): Effect triggered after becoming active
 * - While Active: Constant effect while location is active
 * - Response (After Exploring): Effect triggered after location is explored
 */

import type { GameState, EncounterCard, PlayerState } from './types';

// ── Location Ability Types ───────────────────────────────────────────────────

export type LocationAbilityType =
    | 'travel_cost'        // Cost to travel (exhaust hero, reveal card, etc.)
    | 'after_traveling'    // Response after becoming active location
    | 'while_active'       // Constant effect while active
    | 'after_exploring';   // Response after location is explored

export interface LocationAbilityResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    /** If true, the travel action should be blocked */
    blockTravel?: boolean;
}

export interface LocationAbility {
    code: string;
    name: string;
    type: LocationAbilityType;
    description: string;
    /** Check if ability can be executed (for travel costs) */
    canExecute?: (state: GameState, playerId: string) => { canExecute: boolean; reason?: string };
    /** Execute the ability effect */
    execute: (state: GameState, location: EncounterCard, playerId: string) => LocationAbilityResult;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function getPlayer(state: GameState, playerId: string): PlayerState | undefined {
    return state.players.find((p) => p.id === playerId);
}

function getPlayerWithHighestThreat(state: GameState): PlayerState | undefined {
    if (state.players.length === 0) return undefined;
    return state.players.reduce((highest, player) =>
        player.threat > highest.threat ? player : highest
    );
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p
        ),
    };
}

// ── Location Ability Registry ────────────────────────────────────────────────

const locationAbilityRegistry: Map<string, LocationAbility[]> = new Map();

export function registerLocationAbility(ability: LocationAbility): void {
    const existing = locationAbilityRegistry.get(ability.code) ?? [];
    existing.push(ability);
    locationAbilityRegistry.set(ability.code, existing);
}

export function getLocationAbilities(code: string): LocationAbility[] {
    return locationAbilityRegistry.get(code) ?? [];
}

export function hasLocationAbility(code: string, type: LocationAbilityType): boolean {
    const abilities = getLocationAbilities(code);
    return abilities.some((a) => a.type === type);
}

export function getLocationAbilityByType(code: string, type: LocationAbilityType): LocationAbility | undefined {
    const abilities = getLocationAbilities(code);
    return abilities.find((a) => a.type === type);
}

// ── Location Ability Definitions ─────────────────────────────────────────────

/**
 * Old Forest Road (01099)
 * Response: After Old Forest Road becomes the active location,
 * the first player may choose and ready 1 character he controls.
 */
registerLocationAbility({
    code: '01099',
    name: 'Old Forest Road',
    type: 'after_traveling',
    description: 'The first player may choose and ready 1 character he controls.',
    execute: (state, _location, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        // Find first exhausted character to ready (auto-select for simplicity)
        // In a full implementation, this would prompt the player to choose
        let readiedCharacter: string | null = null;

        // Check heroes first
        const exhaustedHeroIndex = player.heroes.findIndex((h) => h.exhausted);
        if (exhaustedHeroIndex !== -1) {
            const hero = player.heroes[exhaustedHeroIndex];
            const updatedHeroes = player.heroes.map((h, i) =>
                i === exhaustedHeroIndex ? { ...h, exhausted: false } : h
            );
            readiedCharacter = hero.name;
            const newState = updatePlayer(state, playerId, { heroes: updatedHeroes });
            return {
                state: newState,
                log: [`Old Forest Road: ${readiedCharacter} readied.`],
                success: true,
            };
        }

        // Check allies
        const exhaustedAllyIndex = player.allies.findIndex((a) => a.exhausted);
        if (exhaustedAllyIndex !== -1) {
            const ally = player.allies[exhaustedAllyIndex];
            const updatedAllies = player.allies.map((a, i) =>
                i === exhaustedAllyIndex ? { ...a, exhausted: false } : a
            );
            readiedCharacter = ally.name;
            const newState = updatePlayer(state, playerId, { allies: updatedAllies });
            return {
                state: newState,
                log: [`Old Forest Road: ${readiedCharacter} readied.`],
                success: true,
            };
        }

        // No exhausted characters - effect is optional, so success
        return {
            state,
            log: ['Old Forest Road: No exhausted characters to ready.'],
            success: true,
        };
    },
});

/**
 * Forest Gate (01100)
 * Travel: The player with the highest threat must exhaust 1 hero he controls to travel here.
 */
registerLocationAbility({
    code: '01100',
    name: 'Forest Gate',
    type: 'travel_cost',
    description: 'The player with the highest threat must exhaust 1 hero he controls.',
    canExecute: (state, _playerId) => {
        const highestThreatPlayer = getPlayerWithHighestThreat(state);
        if (!highestThreatPlayer) {
            return { canExecute: false, reason: 'No players found.' };
        }

        const readyHeroes = highestThreatPlayer.heroes.filter((h) => !h.exhausted);
        if (readyHeroes.length === 0) {
            return { canExecute: false, reason: `${highestThreatPlayer.name} has no ready heroes to exhaust.` };
        }

        return { canExecute: true };
    },
    execute: (state, _location, _playerId) => {
        const highestThreatPlayer = getPlayerWithHighestThreat(state);
        if (!highestThreatPlayer) {
            return { state, log: [], success: false, error: 'No players found.' };
        }

        // Find first ready hero to exhaust (auto-select for simplicity)
        const readyHeroIndex = highestThreatPlayer.heroes.findIndex((h) => !h.exhausted);
        if (readyHeroIndex === -1) {
            return {
                state,
                log: [],
                success: false,
                error: `${highestThreatPlayer.name} has no ready heroes to exhaust.`,
                blockTravel: true,
            };
        }

        const hero = highestThreatPlayer.heroes[readyHeroIndex];
        const updatedHeroes = highestThreatPlayer.heroes.map((h, i) =>
            i === readyHeroIndex ? { ...h, exhausted: true } : h
        );

        const newState = updatePlayer(state, highestThreatPlayer.id, { heroes: updatedHeroes });

        return {
            state: newState,
            log: [`Forest Gate Travel Cost: ${highestThreatPlayer.name} exhausted ${hero.name}.`],
            success: true,
        };
    },
});

/**
 * Mountains of Mirkwood (01078)
 * Travel: Reveal the top card of the encounter deck and add it to the staging area to travel here.
 * Response: After Mountains of Mirkwood leaves play as an explored location, each player may search
 * the top 5 cards of his deck for 1 card and add it to his hand. Shuffle the rest back into their decks.
 *
 * Note: The "while active" text was from an older interpretation.
 * The actual card has a travel cost and after-exploring response.
 */
registerLocationAbility({
    code: '01078',
    name: 'Mountains of Mirkwood',
    type: 'travel_cost',
    description: 'Reveal the top card of the encounter deck and add it to the staging area.',
    execute: (state, _location, _playerId) => {
        // Reveal top card of encounter deck
        if (state.encounterDeck.length === 0) {
            return {
                state,
                log: ['Mountains of Mirkwood: No cards in encounter deck to reveal.'],
                success: true,
            };
        }

        const [revealedCard, ...remainingDeck] = state.encounterDeck;
        const newState = {
            ...state,
            encounterDeck: remainingDeck,
            stagingArea: [...state.stagingArea, { card: revealedCard, damage: 0, progress: 0 }],
        };

        return {
            state: newState,
            log: [`Mountains of Mirkwood Travel Cost: Revealed ${revealedCard.name} to staging area.`],
            success: true,
        };
    },
});

/**
 * Enchanted Stream (01095)
 * While Enchanted Stream is the active location, each character gets −1 willpower.
 *
 * Note: This is a constant effect that modifies character stats.
 * The actual willpower reduction is calculated when needed.
 */
registerLocationAbility({
    code: '01095',
    name: 'Enchanted Stream',
    type: 'while_active',
    description: 'Each character gets -1 willpower.',
    execute: (state, _location, _playerId) => {
        // This is a passive effect - just log it
        return {
            state,
            log: ['Enchanted Stream: All characters get -1 Willpower while active.'],
            success: true,
        };
    },
});

// ── Main Resolution Functions ────────────────────────────────────────────────

/**
 * Check if a location has a travel cost that can be paid.
 */
export function canPayTravelCost(state: GameState, location: EncounterCard, playerId: string): { canPay: boolean; reason?: string } {
    const travelCostAbility = getLocationAbilityByType(location.code, 'travel_cost');

    if (!travelCostAbility) {
        return { canPay: true }; // No travel cost
    }

    if (travelCostAbility.canExecute) {
        const result = travelCostAbility.canExecute(state, playerId);
        return { canPay: result.canExecute, reason: result.reason };
    }

    return { canPay: true };
}

/**
 * Resolve travel cost for a location.
 * Called before the location becomes active.
 */
export function resolveTravelCost(
    state: GameState,
    location: EncounterCard,
    playerId: string
): LocationAbilityResult {
    const travelCostAbility = getLocationAbilityByType(location.code, 'travel_cost');

    if (!travelCostAbility) {
        return { state, log: [], success: true };
    }

    return travelCostAbility.execute(state, location, playerId);
}

/**
 * Resolve "after traveling" effects for a location.
 * Called after the location becomes active.
 */
export function resolveAfterTraveling(
    state: GameState,
    location: EncounterCard,
    playerId: string
): LocationAbilityResult {
    const afterTravelingAbility = getLocationAbilityByType(location.code, 'after_traveling');

    if (!afterTravelingAbility) {
        return { state, log: [], success: true };
    }

    return afterTravelingAbility.execute(state, location, playerId);
}

/**
 * Resolve "after exploring" effects for a location.
 * Called after the location is explored and discarded.
 */
export function resolveAfterExploring(
    state: GameState,
    location: EncounterCard,
    playerId: string
): LocationAbilityResult {
    const afterExploringAbility = getLocationAbilityByType(location.code, 'after_exploring');

    if (!afterExploringAbility) {
        return { state, log: [], success: true };
    }

    return afterExploringAbility.execute(state, location, playerId);
}

/**
 * Check if the active location has a "while active" effect.
 */
export function hasWhileActiveEffect(state: GameState): boolean {
    if (!state.activeLocation) return false;
    return hasLocationAbility(state.activeLocation.card.code, 'while_active');
}

/**
 * Get the "while active" effect description for the current active location.
 */
export function getWhileActiveEffectDescription(state: GameState): string | null {
    if (!state.activeLocation) return null;

    const whileActiveAbility = getLocationAbilityByType(state.activeLocation.card.code, 'while_active');
    return whileActiveAbility?.description ?? null;
}

/**
 * Check if Enchanted Stream is active (for willpower reduction).
 */
export function isEnchantedStreamActive(state: GameState): boolean {
    return state.activeLocation?.card.code === '01095';
}

/**
 * Check if Mountains of Mirkwood is active (blocks card effect progress).
 */
export function isMountainsOfMirkwoodActive(state: GameState): boolean {
    return state.activeLocation?.card.code === '01078';
}

/**
 * Get the willpower modifier from active location effects.
 * Returns a negative number if willpower should be reduced.
 */
export function getActiveLocationWillpowerModifier(state: GameState): number {
    if (isEnchantedStreamActive(state)) {
        return -1;
    }
    return 0;
}

/**
 * Check if card effects can place progress on the quest.
 * Returns false if Mountains of Mirkwood is active.
 */
export function canCardEffectsPlaceQuestProgress(state: GameState): boolean {
    return !isMountainsOfMirkwoodActive(state);
}
