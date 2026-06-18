/**
 * Gimli (01004)
 *
 * Gimli gets +1 Attack for each damage token on him.
 *
 * This is a passive whose bonus is computed from live game state, so it is
 * registered as a dynamic stat modifier rather than a fixed one.
 */

import type { GameState } from '../../types';
import { registerAbility, registerDynamicStatModifier, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

/**
 * Calculate Gimli's attack bonus based on damage tokens.
 */
export function getGimliAttackBonus(state: GameState, playerId: string): number {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return 0;

    const gimli = player.heroes.find((h) => h.code === '01004');
    if (!gimli) return 0;

    return gimli.damage ?? 0;
}

registerAbility({
    id: 'gimli-damage-attack',
    cardCode: '01004',
    cardName: 'Gimli',
    type: AbilityType.Passive,
    trigger: AbilityTrigger.Constant,
    effect: {
        type: EffectType.StatModifier,
        stat: 'attack',
        amount: 0, // Calculated dynamically based on damage
    },
    limit: AbilityLimit.Unlimited,
    description: 'Gimli gets +1 Attack for each damage token on him.',
});

registerDynamicStatModifier('01004', {
    stat: 'attack',
    amountFn: (state, playerId) => getGimliAttackBonus(state, playerId),
});
