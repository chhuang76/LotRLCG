/**
 * Forest Gate (01100)
 *
 * Travel: The player with the highest threat must exhaust 1 hero he controls to
 * travel here.
 */

import type { GameState, PlayerState } from '../../types';
import { registerLocationAbility, LocationAbilityType } from '../../locationAbilities';

function getPlayerWithHighestThreat(state: GameState): PlayerState | undefined {
    if (state.players.length === 0) return undefined;
    return state.players.reduce((highest, player) =>
        player.threat > highest.threat ? player : highest
    );
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    };
}

registerLocationAbility({
    code: '01100',
    name: 'Forest Gate',
    type: LocationAbilityType.TravelCost,
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
