/**
 * Hummerhorns (01075)
 *
 * Forced: After Hummerhorns engages a player, deal 5 damage to a single hero
 * controlled by that player.
 *
 * Single-player/auto-resolve: damages the player's first hero.
 */

import type { GameState, PlayerState } from '../../types';
import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

function getPlayer(state: GameState, playerId: string): PlayerState | undefined {
    return state.players.find((p) => p.id === playerId);
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    };
}

registerEnemyAbility({
    code: '01075',
    name: 'Hummerhorns',
    type: EnemyAbilityType.WhenEngaged,
    description: 'Deal 5 damage to a single hero controlled by that player.',
    execute: (state, _enemy, playerId) => {
        const logs: string[] = [`Forced: Hummerhorns engages ${playerId} - deal 5 damage to a hero.`];

        const player = getPlayer(state, playerId);
        if (!player || player.heroes.length === 0) {
            return {
                state,
                log: [...logs, 'No heroes to damage.'],
                success: true,
            };
        }

        // Deal 5 damage to first hero (should be player choice in full implementation)
        const targetHero = player.heroes[0];
        const newDamage = targetHero.damage + 5;
        const isDefeated = newDamage >= (targetHero.health ?? 99);

        logs.push(`${targetHero.name} takes 5 damage (now ${newDamage}/${targetHero.health}).`);
        if (isDefeated) {
            logs.push(`${targetHero.name} is defeated!`);
        }

        const updatedState = updatePlayer(state, playerId, {
            heroes: player.heroes.map((h) =>
                h.code === targetHero.code ? { ...h, damage: newDamage } : h
            ),
        });

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});
