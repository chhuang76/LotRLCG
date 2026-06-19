/**
 * Forest Spider (01096)
 *
 * Forced: After Forest Spider engages a player, it gets +1 Attack until the
 * end of the round.
 */

import { registerEnemyAbility, EnemyAbilityType } from '../../enemyAbilities';

registerEnemyAbility({
    code: '01096',
    name: 'Forest Spider',
    type: EnemyAbilityType.WhenEngaged,
    description: 'Gets +1 Attack until end of round.',
    execute: (state, enemy, playerId) => {
        const enemyName = 'card' in enemy ? enemy.card.name : enemy.name;

        // The +1 is applied to the specific instance that just engaged by
        // engageEnemy (via the returned attackModifier). We must NOT scan
        // engagedEnemies by card code here, because all Forest Spiders share
        // code 01096 and that would bump every engaged spider.
        return {
            state,
            log: [`Forced: ${enemyName} engages ${playerId} - gets +1 Attack until end of round.`],
            success: true,
            attackModifier: 1,
        };
    },
});
