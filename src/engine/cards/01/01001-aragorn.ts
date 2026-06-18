/**
 * Aragorn (01001)
 *
 * Action: Spend 1 resource from Aragorn's pool to ready him. (Limit once per phase.)
 */

import { registerAbility } from '../../cardAbilities';

registerAbility({
    id: 'aragorn-ready',
    cardCode: '01001',
    cardName: 'Aragorn',
    type: 'action',
    trigger: 'manual',
    cost: {
        resources: 1,
        resourcesFromPool: '01001', // Aragorn's own pool
    },
    effect: {
        type: 'ready_self',
    },
    limit: 'once_per_phase',
    description: 'Spend 1 resource to ready Aragorn.',
});
