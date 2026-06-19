/**
 * Old Forest Road (01099)
 *
 * Response: After Old Forest Road becomes the active location, the first player
 * may choose and ready 1 character he controls.
 *
 * Single-player/auto-resolve: readies the player's first exhausted character
 * (hero first, then ally).
 */

import type { GameState, PlayerState } from '../../types';
import { registerLocationAbility, LocationAbilityType } from '../../locationAbilities';

function getPlayer(state: GameState, playerId: string): PlayerState | undefined {
    return state.players.find((p) => p.id === playerId);
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    };
}

registerLocationAbility({
    code: '01099',
    name: 'Old Forest Road',
    type: LocationAbilityType.AfterTraveling,
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
