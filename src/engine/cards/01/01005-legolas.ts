/**
 * Legolas (01005)
 *
 * Response: After Legolas participates in an attack that destroys an enemy,
 * place 2 progress tokens on the current quest.
 *
 * Self-contained: progress placement is implemented in the `resolve` hook.
 */

import {
    registerAbility,
    AbilityType,
    AbilityTrigger,
    AbilityLimit,
    placeProgress,
} from '../../cardAbilities';

const CARD_CODE = '01005';
const CARD_NAME = 'Legolas';
const PROGRESS = 2;

registerAbility({
    id: 'legolas-progress',
    cardCode: CARD_CODE,
    cardName: CARD_NAME,
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterEnemyDestroyed,
    limit: AbilityLimit.Unlimited,
    description: 'Place 2 progress on the quest after destroying an enemy.',
    resolve: (state, _playerId) => {
        const { state: nextState, log } = placeProgress(state, PROGRESS, CARD_NAME);
        return { state: nextState, log, success: true };
    },
    condition: (_state, _playerId, context) => {
        // Check if Legolas participated in the attack
        return context?.attackingCharacter?.type === 'hero' &&
               context?.attackingCharacter?.code === CARD_CODE;
    },
});
