/**
 * Chieftain Ufthak (01098)
 *
 * Forced: At the end of the combat phase, if Chieftain Ufthak is in the staging
 * area, he makes an immediate attack against the player with the highest threat.
 *
 * Note: The attack itself must currently be resolved manually (not fully
 * automated); this handler logs the trigger.
 */

import type { GameState, PlayerState, EncounterCard } from '../../types';
import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

function getPlayerWithHighestThreat(state: GameState): PlayerState | undefined {
    if (state.players.length === 0) return undefined;
    return state.players.reduce((highest, player) =>
        player.threat > highest.threat ? player : highest
    );
}

registerEnemyAbility({
    code: '01098',
    name: 'Chieftain Ufthak',
    type: EnemyAbilityType.EndOfCombat,
    description: 'If in staging area at end of combat, attacks highest threat player.',
    execute: (state, _enemy, _playerId) => {
        const logs: string[] = [];

        // Check if Chieftain Ufthak is in staging area
        const inStaging = state.stagingArea.some((item) => {
            if ('card' in item) return item.card.code === '01098';
            return (item as EncounterCard).code === '01098';
        });

        if (!inStaging) {
            return {
                state,
                log: [],
                success: true,
            };
        }

        const highestThreatPlayer = getPlayerWithHighestThreat(state);
        if (!highestThreatPlayer) {
            return {
                state,
                log: ['Chieftain Ufthak: No players to attack.'],
                success: true,
            };
        }

        logs.push(`Forced: Chieftain Ufthak attacks ${highestThreatPlayer.name} from staging area!`);
        logs.push(`⚠️ Chieftain Ufthak's attack must be resolved manually (not fully automated).`);

        // In a full implementation, this would initiate an attack sequence
        // For now, we log it as a warning for the player to handle

        return {
            state,
            log: logs,
            success: true,
        };
    },
});
