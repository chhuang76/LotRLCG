/**
 * Celebrían's Stone (01027)
 *
 * Passive: Attached hero gets +2 Willpower (and gains the Spirit trait).
 *
 * Declarative passive: applied via the engine's stat-modifier system
 * (`applyPassiveAbilities` reads the `StatModifier` effect).
 */

import { registerAbility, AbilityType, AbilityTrigger, AbilityLimit, EffectType } from '../../cardAbilities';

registerAbility({
    id: 'celebrians-stone-willpower',
    cardCode: '01027',
    cardName: "Celebrían's Stone",
    type: AbilityType.Passive,
    trigger: AbilityTrigger.Constant,
    effect: {
        type: EffectType.StatModifier,
        stat: 'willpower',
        amount: 2,
    },
    limit: AbilityLimit.Unlimited,
    description: '+2 Willpower to attached hero.',
});
