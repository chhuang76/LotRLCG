/**
 * Ungoliant's Spawn (01076)
 *
 * When Revealed: Each player must raise his threat by 4 for each Spider card in
 * play.
 */

import type { GameState, PlayerState } from '../../types';
import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) => (p.id === playerId ? { ...p, ...updates } : p)),
    };
}

function countSpidersInPlay(state: GameState): number {
    let count = 0;

    // Count spiders in staging area
    for (const item of state.stagingArea) {
        if ('card' in item) {
            // ActiveEnemy
            if (item.card.traits?.toLowerCase().includes('spider')) count++;
        } else {
            // EncounterCard
            if (item.traits?.toLowerCase().includes('spider')) count++;
        }
    }

    // Count engaged spiders
    for (const player of state.players) {
        for (const enemy of player.engagedEnemies) {
            if (enemy.card.traits?.toLowerCase().includes('spider')) count++;
        }
    }

    return count;
}

registerEnemyAbility({
    code: '01076',
    name: "Ungoliant's Spawn",
    type: EnemyAbilityType.WhenRevealed,
    description: 'Each player raises threat by 4 for each Spider in play.',
    execute: (state, _enemy, _playerId) => {
        const spiderCount = countSpidersInPlay(state);
        const threatIncrease = 4 * spiderCount;

        const logs: string[] = [
            `When Revealed: Ungoliant's Spawn - ${spiderCount} Spider(s) in play.`,
            `Each player raises threat by ${threatIncrease}.`
        ];

        let updatedState = state;

        for (const player of state.players) {
            const newThreat = player.threat + threatIncrease;
            logs.push(`${player.name}: threat ${player.threat} → ${newThreat}`);

            updatedState = updatePlayer(updatedState, player.id, {
                threat: newThreat,
            });

            // Check for threat elimination
            if (newThreat >= 50) {
                logs.push(`${player.name} has been eliminated (threat ≥ 50)!`);
            }
        }

        // Check if all players eliminated
        const allEliminated = updatedState.players.every((p) => p.threat >= 50);
        if (allEliminated) {
            updatedState = { ...updatedState, phase: 'game_over' };
            logs.push('All players eliminated by threat! GAME OVER.');
        }

        return {
            state: updatedState,
            log: logs,
            success: true,
        };
    },
});
