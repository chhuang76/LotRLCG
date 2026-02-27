/**
 * Scenarios Index
 *
 * Registry of all scenarios. Add new scenarios here as they are implemented.
 */

import { MIRKWOOD_SCENARIO } from './01/passageThroughMirkwood';
import { ANDUIN_SCENARIO } from './01/journeyDownTheAnduin';
import { DOL_GULDUR_SCENARIO } from './01/escapeFromDolGuldur';

// ── Scenario Registry ─────────────────────────────────────────────────────────

export interface ScenarioInfo {
    id: string;
    name: string;
    set: string;
    number: number;
    difficulty: string;
}

export const SCENARIO_REGISTRY: Record<string, ScenarioInfo> = {
    'passage-through-mirkwood': {
        id: 'passage-through-mirkwood',
        name: 'Passage Through Mirkwood',
        set: '01',
        number: 1,
        difficulty: 'Easy',
    },
    'journey-down-the-anduin': {
        id: 'journey-down-the-anduin',
        name: 'Journey Down the Anduin',
        set: '01',
        number: 2,
        difficulty: 'Medium',
    },
    'escape-from-dol-guldur': {
        id: 'escape-from-dol-guldur',
        name: 'Escape from Dol Guldur',
        set: '01',
        number: 3,
        difficulty: 'Hard',
    },
};

// ── Scenario Loaders ──────────────────────────────────────────────────────────

export const SCENARIOS = {
    'passage-through-mirkwood': MIRKWOOD_SCENARIO,
    'journey-down-the-anduin': ANDUIN_SCENARIO,
    'escape-from-dol-guldur': DOL_GULDUR_SCENARIO,
};

// ── Lookup Functions ──────────────────────────────────────────────────────────

export function getScenario(scenarioId: string) {
    return SCENARIOS[scenarioId as keyof typeof SCENARIOS];
}

export function getScenarioInfo(scenarioId: string): ScenarioInfo | undefined {
    return SCENARIO_REGISTRY[scenarioId];
}

export function getScenariosBySet(setId: string): ScenarioInfo[] {
    return Object.values(SCENARIO_REGISTRY).filter((s) => s.set === setId);
}

// ── Re-export scenarios for convenience ───────────────────────────────────────

export { MIRKWOOD_SCENARIO };
export { ANDUIN_SCENARIO };
export { DOL_GULDUR_SCENARIO };
