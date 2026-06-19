/**
 * Blade of Gondolin (01044)
 *
 * Passive: Attached hero gets +1 Attack.
 * Response: After attached hero destroys an Orc enemy, place 1 progress on the
 * current quest.
 *
 * Declarative: the passive uses the stat-modifier system; the response uses the
 * engine's `PlaceProgress` effect gated by a trait `condition`.
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'blade-gondolin-attack',
    cardCode: '01044',
    cardName: 'Blade of Gondolin',
    type: AbilityType.Passive,
    trigger: AbilityTrigger.Constant,
    effect: {
        type: EffectType.StatModifier,
        stat: 'attack',
        amount: 1,
    },
    limit: AbilityLimit.Unlimited,
    description: '+1 Attack to attached hero.',
});

registerAbility({
    id: 'blade-gondolin-progress',
    cardCode: '01044',
    cardName: 'Blade of Gondolin',
    type: AbilityType.Response,
    trigger: AbilityTrigger.AfterOrcDestroyed,
    effect: {
        type: EffectType.PlaceProgress,
        amount: 1,
        target: 'current_quest',
    },
    limit: AbilityLimit.Unlimited,
    description: 'Place 1 progress after destroying an Orc.',
    condition: (_state, _playerId, context) => {
        // Check if destroyed enemy has Orc trait
        const traits = context?.destroyedEnemy?.traits ?? '';
        return traits.toLowerCase().includes('orc');
    },
});
