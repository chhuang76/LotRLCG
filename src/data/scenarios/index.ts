/**
 * Scenarios Index
 *
 * Registry of all scenarios. Add new scenarios here as they are implemented.
 */

import { MIRKWOOD_SCENARIO } from './01/passageThroughMirkwood';

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
    // Future scenarios:
    // 'journey-down-the-anduin': { ... },
    // 'escape-from-dol-guldur': { ... },
};

// ── Scenario Loaders ──────────────────────────────────────────────────────────

export const SCENARIOS = {
    'passage-through-mirkwood': MIRKWOOD_SCENARIO,
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

// ── Re-export Mirkwood for convenience ────────────────────────────────────────

export { MIRKWOOD_SCENARIO };
