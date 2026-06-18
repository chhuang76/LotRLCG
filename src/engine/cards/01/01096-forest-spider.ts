/**
 * Forest Spider (01096)
 *
 * Forced: After Forest Spider engages a player, it gets +1 Attack until the
 * end of the round.
 */

import { registerEnemyAbility } from '../../enemyAbilities';

registerEnemyAbility({
    code: '01096',
    name: 'Forest Spider',
    type: 'when_engaged',
    description: 'Gets +1 Attack until end of round.',
    execute: (state, enemy, playerId) => {
        const enemyName = 'card' in enemy ? enemy.card.name : enemy.name;
        const logs: string[] = [
            `Forced: ${enemyName} engages ${playerId} - gets +1 Attack until end of round.`
        ];

        // Track the attack bonus on the matching ActiveEnemy (round-based modifier).
        const updatedPlayers = state.players.map((p) => {
            if (p.id !== playerId) return p;

            return {
                ...p,
                engagedEnemies: p.engagedEnemies.map((e) => {
                    const code = 'card' in enemy ? enemy.card.code : enemy.code;
                    if (e.card.code === code) {
                        return {
                            ...e,
                            attackBonus: (e.attackBonus ?? 0) + 1,
                        };
                    }
                    return e;
                }),
            };
        });

        return {
            state: { ...state, players: updatedPlayers },
            log: logs,
            success: true,
            attackModifier: 1,
        };
    },
});
