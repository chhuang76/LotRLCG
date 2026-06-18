/**
 * Legolas (01005)
 *
 * Response: After Legolas participates in an attack that destroys an enemy,
 * place 2 progress tokens on the current quest.
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'legolas-progress',
    cardCode: '01005',
    cardName: 'Legolas',
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterEnemyDestroyed,
    effect: {
        type: EffectType.PlaceProgress,
        amount: 2,
        target: 'current_quest',
    },
    limit: AbilityLimit.Unlimited,
    description: 'Place 2 progress on the quest after destroying an enemy.',
    condition: (_state, _playerId, context) => {
        // Check if Legolas participated in the attack
        return context?.attackingCharacter?.type === 'hero' &&
               context?.attackingCharacter?.code === '01005';
    },
});
