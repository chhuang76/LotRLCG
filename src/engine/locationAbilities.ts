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

import type { GameState, EncounterCard } from './types';

// ── Location Ability Types ───────────────────────────────────────────────────

export const LocationAbilityType = {
    TravelCost: 'travel_cost',          // Cost to travel (exhaust hero, reveal card, etc.)
    AfterTraveling: 'after_traveling',  // Response after becoming active location
    WhileActive: 'while_active',        // Constant effect while active
    AfterExploring: 'after_exploring',  // Response after location is explored
} as const;
export type LocationAbilityType = (typeof LocationAbilityType)[keyof typeof LocationAbilityType];

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
// (Per-card helpers now live in the individual card modules under
//  `src/engine/cards/01/`.)

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
//
// Location card abilities live in standalone per-card modules under
// `src/engine/cards/01/` (e.g. `01078-mountains-of-mirkwood.ts`), registered via
// `registerLocationAbility`. The barrel `src/engine/cards/index.ts` imports them
// for their side-effects. This file retains only the shared machinery (registry,
// types, and resolution functions) below.

// ── Main Resolution Functions ────────────────────────────────────────────────

/**
 * Check if a location has a travel cost that can be paid.
 */
export function canPayTravelCost(state: GameState, location: EncounterCard, playerId: string): { canPay: boolean; reason?: string } {
    const travelCostAbility = getLocationAbilityByType(location.code, LocationAbilityType.TravelCost);

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
    const travelCostAbility = getLocationAbilityByType(location.code, LocationAbilityType.TravelCost);

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
    const afterTravelingAbility = getLocationAbilityByType(location.code, LocationAbilityType.AfterTraveling);

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
    const afterExploringAbility = getLocationAbilityByType(location.code, LocationAbilityType.AfterExploring);

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
    return hasLocationAbility(state.activeLocation.card.code, LocationAbilityType.WhileActive);
}

/**
 * Get the "while active" effect description for the current active location.
 */
export function getWhileActiveEffectDescription(state: GameState): string | null {
    if (!state.activeLocation) return null;

    const whileActiveAbility = getLocationAbilityByType(state.activeLocation.card.code, LocationAbilityType.WhileActive);
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
