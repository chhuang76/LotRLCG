/**
 * King Spider (01074)
 *
 * When Revealed: Each player must choose and exhaust 1 character he controls.
 *
 * Single-player/auto-resolve: exhausts each player's first ready character
 * (hero first, then ally).
 */

import type { GameState, PlayerState } from '../../types';
import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    };
}

registerEnemyAbility({
    code: '01074',
    name: 'King Spider',
    type: EnemyAbilityType.WhenRevealed,
    description: 'Each player must choose and exhaust 1 character he controls.',
    execute: (state, _enemy, _playerId) => {
        const logs: string[] = [`When Revealed: King Spider - Each player must exhaust 1 character.`];

        let updatedState = state;

        // For each player, exhaust first ready character (hero first, then ally)
        for (const player of state.players) {
            // Find first ready hero
            const readyHeroIndex = player.heroes.findIndex((h) => !h.exhausted);
            if (readyHeroIndex !== -1) {
                const hero = player.heroes[readyHeroIndex];
                logs.push(`${player.name} exhausts ${hero.name}.`);
                updatedState = updatePlayer(updatedState, player.id, {
                    heroes: player.heroes.map((h, i) =>
                        i === readyHeroIndex ? { ...h, exhausted: true } : h
                    ),
                });
                continue;
            }

            // Find first ready ally
            const readyAllyIndex = player.allies.findIndex((a) => !a.exhausted);
            if (readyAllyIndex !== -1) {
                const ally = player.allies[readyAllyIndex];
                logs.push(`${player.name} exhausts ${ally.name}.`);
                updatedState = updatePlayer(updatedState, player.id, {
                    allies: player.allies.map((a, i) =>
                        i === readyAllyIndex ? { ...a, exhausted: true } : a
                    ),
                });
                continue;
            }

            logs.push(`${player.name} has no ready characters to exhaust.`);
        }

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});
