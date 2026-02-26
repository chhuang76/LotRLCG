/**
 * Unit tests for Card Ability System
 *
 * Tests player card abilities for heroes, allies, and attachments.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { GameState, Hero, PlayerCard, EncounterCard, AttachedCard } from './types';
import {
    getAbilities,
    hasAbilities,
    getAbilityById,
    activateAbility,
    canPayAbilityCost,
    canUseAbility,
    getTriggeredAbilities,
    getEffectiveAttack,
    getEffectiveWillpower,
    getEffectiveDefense,
    getGimliAttackBonus,
    applyPassiveAbilities,
    resetPhaseAbilities,
    resetRoundAbilities,
    registerStatModifier,
    clearStatModifiers,
} from './cardAbilities';

// ── Test Helpers ─────────────────────────────────────────────────────────────

function makeTestHero(overrides: Partial<Hero> = {}): Hero {
    return {
        code: 'test-hero',
        name: 'Test Hero',
        type_code: 'hero',
        sphere_code: 'leadership',
        threat: 10,
        willpower: 2,
        attack: 2,
        defense: 2,
        health: 5,
        currentHealth: 5,
        damage: 0,
        exhausted: false,
        resources: 1,
        attachments: [],
        quantity: 1,
        ...overrides,
    };
}

function makeTestAttachment(overrides: Partial<AttachedCard> = {}): AttachedCard {
    return {
        code: 'test-attachment',
        name: 'Test Attachment',
        type_code: 'attachment',
        sphere_code: 'leadership',
        cost: 2,
        exhausted: false,
        quantity: 1,
        ...overrides,
    };
}

function makeTestEnemy(overrides: Partial<EncounterCard> = {}): EncounterCard {
    return {
        code: 'test-enemy',
        name: 'Test Enemy',
        type_code: 'enemy',
        threat: 2,
        attack: 3,
        defense: 1,
        health: 4,
        engagement_cost: 30,
        quantity: 1,
        ...overrides,
    };
}

function makeTestState(overrides: Partial<GameState> = {}): GameState {
    return {
        phase: 'planning',
        round: 1,
        players: [
            {
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            },
        ],
        encounterDeck: [],
        encounterDiscard: [],
        stagingArea: [],
        activeLocation: null,
        questDeck: [],
        currentQuest: null,
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
        ...overrides,
    };
}

// ── Registry Tests ───────────────────────────────────────────────────────────

describe('Card Ability Registry', () => {
    it('has Aragorn ability registered', () => {
        const abilities = getAbilities('01001');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('aragorn-ready');
    });

    it('has Gimli ability registered', () => {
        const abilities = getAbilities('01004');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('gimli-damage-attack');
    });

    it('has Legolas ability registered', () => {
        const abilities = getAbilities('01005');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('legolas-progress');
    });

    it('has Steward of Gondor ability registered', () => {
        const abilities = getAbilities('01026');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('steward-resources');
    });

    it('has Celebrian Stone ability registered', () => {
        const abilities = getAbilities('01027');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('celebrians-stone-willpower');
    });

    it('has Blade of Gondolin abilities registered', () => {
        const abilities = getAbilities('01044');
        expect(abilities.length).toBe(2); // +1 attack and progress on Orc kill
    });

    it('has Gandalf ability registered', () => {
        const abilities = getAbilities('01061');
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].id).toBe('gandalf-enter-play');
    });

    it('returns empty array for unknown card', () => {
        const abilities = getAbilities('unknown-card');
        expect(abilities).toEqual([]);
    });

    it('hasAbilities returns true for cards with abilities', () => {
        expect(hasAbilities('01001')).toBe(true);
        expect(hasAbilities('01005')).toBe(true);
    });

    it('hasAbilities returns false for cards without abilities', () => {
        expect(hasAbilities('unknown')).toBe(false);
    });

    it('getAbilityById returns the correct ability', () => {
        const ability = getAbilityById('aragorn-ready');
        expect(ability).not.toBeUndefined();
        expect(ability?.cardCode).toBe('01001');
    });

    it('getAbilityById returns undefined for unknown ability', () => {
        const ability = getAbilityById('unknown-ability');
        expect(ability).toBeUndefined();
    });
});

// ── Aragorn Tests ────────────────────────────────────────────────────────────

describe('Aragorn (01001) - Ready Ability', () => {
    beforeEach(() => {
        resetPhaseAbilities();
        resetRoundAbilities();
    });

    it('readies Aragorn when activated with sufficient resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 2,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].exhausted).toBe(false);
        expect(result.state.players[0].heroes[0].resources).toBe(1);
        expect(result.log.some((m) => m.includes('readied'))).toBe(true);
    });

    it('fails if Aragorn has no resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 0,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'aragorn-ready', '01001');

        expect(result.success).toBe(false);
        expect(result.error).toContain('Not enough resources');
    });

    it('can only be used once per phase', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // First activation
        const result1 = activateAbility(state, 'player1', 'aragorn-ready', '01001');
        expect(result1.success).toBe(true);

        // Exhaust Aragorn again for second attempt
        const state2 = {
            ...result1.state,
            players: result1.state.players.map((p) => ({
                ...p,
                heroes: p.heroes.map((h) => ({ ...h, exhausted: true })),
            })),
        };

        // Second activation should fail (once per phase)
        const result2 = activateAbility(state2, 'player1', 'aragorn-ready', '01001');
        expect(result2.success).toBe(false);
        expect(result2.error).toContain('Already used this phase');
    });

    it('can be used again after phase reset', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            exhausted: true,
            resources: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // First activation
        const result1 = activateAbility(state, 'player1', 'aragorn-ready', '01001');
        expect(result1.success).toBe(true);

        // Reset phase abilities
        resetPhaseAbilities();

        // Exhaust Aragorn again
        const state2 = {
            ...result1.state,
            players: result1.state.players.map((p) => ({
                ...p,
                heroes: p.heroes.map((h) => ({ ...h, exhausted: true })),
            })),
        };

        // Second activation should work after phase reset
        const result2 = activateAbility(state2, 'player1', 'aragorn-ready', '01001');
        expect(result2.success).toBe(true);
    });
});

// ── Gimli Tests ──────────────────────────────────────────────────────────────

describe('Gimli (01004) - Damage Attack Bonus', () => {
    it('calculates attack bonus based on damage', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const bonus = getGimliAttackBonus(state, 'player1');
        expect(bonus).toBe(3);
    });

    it('returns 0 bonus when Gimli has no damage', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 0,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const bonus = getGimliAttackBonus(state, 'player1');
        expect(bonus).toBe(0);
    });

    it('getEffectiveAttack includes damage bonus', () => {
        const gimli = makeTestHero({
            code: '01004',
            name: 'Gimli',
            attack: 2,
            damage: 4,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [gimli],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const effectiveAttack = getEffectiveAttack(state, 'player1', '01004');
        expect(effectiveAttack).toBe(6); // 2 base + 4 damage
    });
});

// ── Legolas Tests ────────────────────────────────────────────────────────────

describe('Legolas (01005) - Progress on Enemy Kill', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('triggers when Legolas destroys an enemy', () => {
        const legolas = makeTestHero({
            code: '01005',
            name: 'Legolas',
        });

        const state = makeTestState({
            questProgress: 0,
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [legolas],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const triggered = getTriggeredAbilities(state, 'player1', 'after_enemy_destroyed', {
            attackingCharacter: { type: 'hero', code: '01005', index: 0 },
            destroyedEnemy: makeTestEnemy(),
        });

        expect(triggered.length).toBe(1);
        expect(triggered[0].id).toBe('legolas-progress');
    });

    it('does not trigger when another hero destroys an enemy', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const triggered = getTriggeredAbilities(state, 'player1', 'after_enemy_destroyed', {
            attackingCharacter: { type: 'hero', code: '01001', index: 0 },
            destroyedEnemy: makeTestEnemy(),
        });

        // Legolas ability should not trigger for Aragorn's kill
        const legolasAbility = triggered.find((a) => a.id === 'legolas-progress');
        expect(legolasAbility).toBeUndefined();
    });

    it('places 2 progress when activated', () => {
        const legolas = makeTestHero({
            code: '01005',
            name: 'Legolas',
        });

        const state = makeTestState({
            questProgress: 3,
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [legolas],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'legolas-progress', '01005', {
            attackingCharacter: { type: 'hero', code: '01005', index: 0 },
        });

        expect(result.success).toBe(true);
        expect(result.state.questProgress).toBe(5);
        expect(result.log.some((m) => m.includes('2 progress'))).toBe(true);
    });
});

// ── Gandalf Tests ────────────────────────────────────────────────────────────

describe('Gandalf (01061) - Enter Play Choice', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('requires a choice when activated without choiceIndex', () => {
        const state = makeTestState();

        const result = activateAbility(state, 'player1', 'gandalf-enter-play');

        expect(result.success).toBe(true);
        expect(result.requiresChoice).toBe(true);
        expect(result.choices?.length).toBe(3);
        expect(result.choices).toContain('Draw 3 cards');
        expect(result.choices).toContain('Deal 4 damage to an enemy');
        expect(result.choices).toContain('Reduce threat by 5');
    });

    it('draws 3 cards when choice 0 is selected', () => {
        const card1: PlayerCard = { code: 'c1', name: 'Card 1', type_code: 'ally', quantity: 1 };
        const card2: PlayerCard = { code: 'c2', name: 'Card 2', type_code: 'ally', quantity: 1 };
        const card3: PlayerCard = { code: 'c3', name: 'Card 3', type_code: 'ally', quantity: 1 };

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [makeTestHero()],
                allies: [],
                deck: [card1, card2, card3],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'gandalf-enter-play', undefined, undefined, 0);

        expect(result.success).toBe(true);
        expect(result.state.players[0].hand.length).toBe(3);
        expect(result.state.players[0].deck.length).toBe(0);
        expect(result.log.some((m) => m.includes('Draw 3 cards'))).toBe(true);
    });

    it('reduces threat by 5 when choice 2 is selected', () => {
        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 30,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'gandalf-enter-play', undefined, undefined, 2);

        expect(result.success).toBe(true);
        expect(result.state.players[0].threat).toBe(25);
        expect(result.log.some((m) => m.includes('Threat reduced by 5'))).toBe(true);
    });

    it('deals 4 damage to first enemy when choice 1 is selected', () => {
        const enemy = {
            card: makeTestEnemy({ health: 6 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 30,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [enemy],
            }],
        });

        const result = activateAbility(state, 'player1', 'gandalf-enter-play', undefined, undefined, 1);

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies[0].damage).toBe(4);
    });

    it('destroys enemy if 4 damage is fatal', () => {
        const enemy = {
            card: makeTestEnemy({ health: 3 }),
            damage: 0,
            shadowCards: [],
            engagedPlayerId: 'player1',
            exhausted: false,
        };

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 30,
                heroes: [makeTestHero()],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [enemy],
            }],
        });

        const result = activateAbility(state, 'player1', 'gandalf-enter-play', undefined, undefined, 1);

        expect(result.success).toBe(true);
        expect(result.state.players[0].engagedEnemies.length).toBe(0);
        expect(result.state.encounterDiscard.length).toBe(1);
        expect(result.log.some((m) => m.includes('destroyed'))).toBe(true);
    });
});

// ── Steward of Gondor Tests ──────────────────────────────────────────────────

describe('Steward of Gondor (01026)', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('adds 2 resources to attached hero', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            resources: 1,
            attachments: [makeTestAttachment({ code: '01026', name: 'Steward of Gondor' })],
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const result = activateAbility(state, 'player1', 'steward-resources', '01001', {
            sourceHeroCode: '01001',
        });

        expect(result.success).toBe(true);
        expect(result.state.players[0].heroes[0].resources).toBe(3);
        expect(result.log.some((m) => m.includes('gains 2 resources'))).toBe(true);
    });
});

// ── Passive Ability Tests ────────────────────────────────────────────────────

describe('Passive Abilities', () => {
    beforeEach(() => {
        clearStatModifiers('01001');
    });

    it('Celebrian Stone adds +2 willpower', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            willpower: 2,
            attachments: [makeTestAttachment({ code: '01027', name: "Celebrían's Stone" })],
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // Apply passive abilities
        applyPassiveAbilities(state, 'player1');

        // Check effective willpower
        const effectiveWP = getEffectiveWillpower(state, 'player1', '01001');
        expect(effectiveWP).toBe(4); // 2 base + 2 from stone
    });

    it('Blade of Gondolin adds +1 attack', () => {
        const legolas = makeTestHero({
            code: '01005',
            name: 'Legolas',
            attack: 3,
            attachments: [makeTestAttachment({ code: '01044', name: 'Blade of Gondolin' })],
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [legolas],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // Apply passive abilities
        applyPassiveAbilities(state, 'player1');

        // Check effective attack
        const effectiveAtk = getEffectiveAttack(state, 'player1', '01005');
        expect(effectiveAtk).toBe(4); // 3 base + 1 from blade
    });

    it('multiple attachments stack', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            willpower: 2,
            attack: 3,
            attachments: [
                makeTestAttachment({ code: '01027', name: "Celebrían's Stone" }),
                makeTestAttachment({ code: '01044', name: 'Blade of Gondolin' }),
            ],
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        // Apply passive abilities
        applyPassiveAbilities(state, 'player1');

        expect(getEffectiveWillpower(state, 'player1', '01001')).toBe(4); // 2 + 2
        expect(getEffectiveAttack(state, 'player1', '01001')).toBe(4);    // 3 + 1
    });
});

// ── Blade of Gondolin Response Tests ─────────────────────────────────────────

describe('Blade of Gondolin - Orc Kill Progress', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('condition triggers for Orc enemies', () => {
        const orcEnemy = makeTestEnemy({
            traits: 'Orc. Goblin.',
        });

        // Get the blade ability and test its condition directly
        const bladeAbility = getAbilityById('blade-gondolin-progress');
        expect(bladeAbility).not.toBeUndefined();

        const state = makeTestState();
        const conditionMet = bladeAbility?.condition?.(state, 'player1', {
            destroyedEnemy: orcEnemy,
        });

        expect(conditionMet).toBe(true);
    });

    it('condition does not trigger for non-Orc enemies', () => {
        const spiderEnemy = makeTestEnemy({
            traits: 'Spider. Creature.',
        });

        const bladeAbility = getAbilityById('blade-gondolin-progress');
        expect(bladeAbility).not.toBeUndefined();

        const state = makeTestState();
        const conditionMet = bladeAbility?.condition?.(state, 'player1', {
            destroyedEnemy: spiderEnemy,
        });

        expect(conditionMet).toBe(false);
    });

    it('places 1 progress when activated', () => {
        const state = makeTestState({
            questProgress: 5,
        });

        const result = activateAbility(state, 'player1', 'blade-gondolin-progress');

        expect(result.success).toBe(true);
        expect(result.state.questProgress).toBe(6);
    });
});

// ── Cost Checking Tests ──────────────────────────────────────────────────────

describe('Ability Cost Checking', () => {
    it('canPayAbilityCost returns true when sufficient resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            resources: 2,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const ability = getAbilityById('aragorn-ready')!;
        const result = canPayAbilityCost(state, 'player1', ability, '01001');

        expect(result.canPay).toBe(true);
    });

    it('canPayAbilityCost returns false when insufficient resources', () => {
        const aragorn = makeTestHero({
            code: '01001',
            name: 'Aragorn',
            resources: 0,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [aragorn],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        const ability = getAbilityById('aragorn-ready')!;
        const result = canPayAbilityCost(state, 'player1', ability, '01001');

        expect(result.canPay).toBe(false);
        expect(result.reason).toContain('Not enough resources');
    });
});

// ── Limit Checking Tests ─────────────────────────────────────────────────────

describe('Ability Limit Checking', () => {
    beforeEach(() => {
        resetRoundAbilities();
    });

    it('canUseAbility returns true for unlimited abilities', () => {
        const ability = getAbilityById('legolas-progress')!;
        const result = canUseAbility('player1', ability);

        expect(result.canUse).toBe(true);
    });

    it('canUseAbility returns true for once_per_phase before use', () => {
        const ability = getAbilityById('aragorn-ready')!;
        const result = canUseAbility('player1', ability);

        expect(result.canUse).toBe(true);
    });
});

// ── Effective Stat Calculation Tests ─────────────────────────────────────────

describe('Effective Stat Calculations', () => {
    beforeEach(() => {
        clearStatModifiers('01001');
        clearStatModifiers('01004');
        clearStatModifiers('01005');
    });

    it('getEffectiveAttack returns base attack without modifiers', () => {
        const hero = makeTestHero({
            code: '01001',
            attack: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [hero],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        expect(getEffectiveAttack(state, 'player1', '01001')).toBe(3);
    });

    it('getEffectiveDefense returns base defense without modifiers', () => {
        const hero = makeTestHero({
            code: '01001',
            defense: 2,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [hero],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        expect(getEffectiveDefense(state, 'player1', '01001')).toBe(2);
    });

    it('getEffectiveWillpower returns base willpower without modifiers', () => {
        const hero = makeTestHero({
            code: '01001',
            willpower: 2,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [hero],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        expect(getEffectiveWillpower(state, 'player1', '01001')).toBe(2);
    });

    it('returns 0 for unknown hero', () => {
        const state = makeTestState();

        expect(getEffectiveAttack(state, 'player1', 'unknown')).toBe(0);
        expect(getEffectiveDefense(state, 'player1', 'unknown')).toBe(0);
        expect(getEffectiveWillpower(state, 'player1', 'unknown')).toBe(0);
    });

    it('includes registered stat modifiers', () => {
        const hero = makeTestHero({
            code: '01001',
            attack: 3,
        });

        const state = makeTestState({
            players: [{
                id: 'player1',
                name: 'Test Player',
                threat: 28,
                heroes: [hero],
                allies: [],
                deck: [],
                hand: [],
                discard: [],
                engagedEnemies: [],
            }],
        });

        registerStatModifier('01001', {
            source: 'test-buff',
            stat: 'attack',
            amount: 2,
        });

        expect(getEffectiveAttack(state, 'player1', '01001')).toBe(5);

        // Cleanup
        clearStatModifiers('01001');
    });
});
