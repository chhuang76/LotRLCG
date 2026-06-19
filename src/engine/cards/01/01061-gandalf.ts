/**
 * Gandalf (01061)
 *
 * Enter Play: When Gandalf enters play, choose one: draw 3 cards, deal 4 damage
 * to 1 enemy, or reduce your threat by 5.
 *
 * Declarative: uses the engine's `Choice` effect, resolved through
 * `resolveAbilityEffect`'s choice flow.
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'gandalf-enter-play',
    cardCode: '01061',
    cardName: 'Gandalf',
    type: AbilityType.EnterPlay,
    trigger: AbilityTrigger.OnEnterPlay,
    effect: {
        type: EffectType.Choice,
        choices: [
            { type: EffectType.DrawCards, amount: 3 },
            { type: EffectType.DealDamage, amount: 4, target: 'any_enemy' },
            { type: EffectType.ReduceThreat, amount: 5 },
        ],
        choiceDescriptions: [
            'Draw 3 cards',
            'Deal 4 damage to an enemy',
            'Reduce threat by 5',
        ],
    },
    limit: AbilityLimit.Unlimited,
    description: 'Choose: Draw 3, Deal 4 damage, or -5 threat.',
});
