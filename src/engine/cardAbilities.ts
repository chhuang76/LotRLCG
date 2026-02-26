/**
 * Card Ability System
 *
 * Handles player card abilities (heroes, allies, attachments).
 * Each ability has a type, optional cost, target requirements, and effect handler.
 *
 * Ability Types:
 * - Action: Player manually activates during action windows
 * - Response: Triggered after a specific game event
 * - Forced: Automatically triggered when condition is met
 * - Passive: Constant modifier while card is in play
 * - Enter Play: Choice when card enters play (e.g., Gandalf)
 */

import type { GameState, PlayerState, Hero, CharacterRef, EncounterCard } from './types';

// ── Ability Types ────────────────────────────────────────────────────────────

export type AbilityType =
    | 'action'       // Manually activated during action windows
    | 'response'     // Triggered after specific event
    | 'forced'       // Automatic when condition is met
    | 'passive'      // Constant modifier while in play
    | 'enter_play';  // Choice when card enters play

export type AbilityTrigger =
    | 'manual'                    // Player clicks to activate
    | 'after_enemy_destroyed'     // After an enemy is destroyed
    | 'after_orc_destroyed'       // After an Orc enemy is destroyed
    | 'after_damage_taken'        // After this character takes damage
    | 'on_enter_play'             // When card enters play
    | 'constant';                 // Always active while in play

export type AbilityLimit =
    | 'once_per_phase'
    | 'once_per_round'
    | 'unlimited';

// ── Ability Cost ─────────────────────────────────────────────────────────────

export interface AbilityCost {
    exhaustSelf?: boolean;        // Exhaust this card (hero/ally/attachment)
    exhaustCharacter?: boolean;   // Exhaust a chosen character
    resources?: number;           // Pay X resources from this hero/attached hero
    resourcesFromPool?: string;   // Pay from specific hero (by code)
    discardCards?: number;        // Discard X cards from hand
}

// ── Ability Effect ───────────────────────────────────────────────────────────

export type EffectType =
    | 'ready_self'           // Ready this character
    | 'gain_resources'       // Add resources to a hero
    | 'deal_damage'          // Deal damage to an enemy
    | 'heal'                 // Heal damage from a character
    | 'draw_cards'           // Draw cards
    | 'place_progress'       // Place progress on quest
    | 'reduce_threat'        // Reduce player's threat
    | 'stat_modifier'        // Modify stats (attack, defense, willpower)
    | 'choice';              // Player chooses from multiple effects

export interface AbilityEffect {
    type: EffectType;
    amount?: number;
    stat?: 'attack' | 'defense' | 'willpower' | 'health';
    target?: 'self' | 'attached_hero' | 'any_hero' | 'any_enemy' | 'current_quest';
    choices?: AbilityEffect[];  // For 'choice' type effects
    choiceDescriptions?: string[];  // Descriptions for each choice
}

// ── Ability Definition ───────────────────────────────────────────────────────

export interface CardAbility {
    id: string;
    cardCode: string;
    cardName: string;
    type: AbilityType;
    trigger: AbilityTrigger;
    cost?: AbilityCost;
    effect: AbilityEffect;
    limit: AbilityLimit;
    description: string;
    // For response/forced abilities, condition check
    condition?: (state: GameState, playerId: string, context?: AbilityContext) => boolean;
}

// ── Ability Context ──────────────────────────────────────────────────────────

export interface AbilityContext {
    destroyedEnemy?: EncounterCard;     // Enemy that was just destroyed
    attackingCharacter?: CharacterRef;   // Character that made the attack
    damageTaken?: number;                // Amount of damage taken
    sourceHeroCode?: string;             // Hero that triggered the ability
}

// ── Ability Result ───────────────────────────────────────────────────────────

export interface AbilityResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    requiresChoice?: boolean;       // Needs player to choose (e.g., Gandalf)
    choices?: string[];             // Available choices
    choiceCallback?: string;        // Ability ID to call with choice
}

// ── Ability Usage Tracking ───────────────────────────────────────────────────

export interface AbilityUsage {
    abilityId: string;
    usedThisPhase: boolean;
    usedThisRound: boolean;
}

// ── Ability Registry ─────────────────────────────────────────────────────────

const abilityRegistry: Map<string, CardAbility[]> = new Map();

export function registerAbility(ability: CardAbility): void {
    const existing = abilityRegistry.get(ability.cardCode) ?? [];
    existing.push(ability);
    abilityRegistry.set(ability.cardCode, existing);
}

export function getAbilities(cardCode: string): CardAbility[] {
    return abilityRegistry.get(cardCode) ?? [];
}

export function hasAbilities(cardCode: string): boolean {
    return abilityRegistry.has(cardCode) && (abilityRegistry.get(cardCode)?.length ?? 0) > 0;
}

export function getAbilityById(abilityId: string): CardAbility | undefined {
    for (const abilities of abilityRegistry.values()) {
        const found = abilities.find((a) => a.id === abilityId);
        if (found) return found;
    }
    return undefined;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function getPlayer(state: GameState, playerId: string): PlayerState | undefined {
    return state.players.find((p) => p.id === playerId);
}

function updatePlayer(state: GameState, playerId: string, updates: Partial<PlayerState>): GameState {
    return {
        ...state,
        players: state.players.map((p) =>
            p.id === playerId ? { ...p, ...updates } : p
        ),
    };
}

function findHeroByCode(player: PlayerState, heroCode: string): Hero | undefined {
    return player.heroes.find((h) => h.code === heroCode);
}

function updateHero(player: PlayerState, heroCode: string, updates: Partial<Hero>): Hero[] {
    return player.heroes.map((h) =>
        h.code === heroCode ? { ...h, ...updates } : h
    );
}

// ── Ability Cost Checking ────────────────────────────────────────────────────

export function canPayAbilityCost(
    state: GameState,
    playerId: string,
    ability: CardAbility,
    sourceHeroCode?: string
): { canPay: boolean; reason?: string } {
    const player = getPlayer(state, playerId);
    if (!player) return { canPay: false, reason: 'Player not found.' };

    const cost = ability.cost;
    if (!cost) return { canPay: true };

    // Check exhaust self
    if (cost.exhaustSelf) {
        // Check if this is an attachment ability
        const isAttachmentAbility = ability.cardCode !== sourceHeroCode;

        if (isAttachmentAbility && sourceHeroCode) {
            // Find the attachment on the hero
            const hero = findHeroByCode(player, sourceHeroCode);
            const attachment = hero?.attachments?.find((a) => a.code === ability.cardCode);
            if (attachment?.exhausted) {
                return { canPay: false, reason: `${ability.cardName} is already exhausted.` };
            }
        } else if (sourceHeroCode) {
            // It's a hero ability - check if hero is exhausted
            const hero = findHeroByCode(player, sourceHeroCode);
            if (hero?.exhausted) {
                return { canPay: false, reason: `${hero.name} is already exhausted.` };
            }
        }
    }

    // Check resource cost
    if (cost.resources && cost.resources > 0) {
        const heroCode = cost.resourcesFromPool ?? sourceHeroCode;
        if (heroCode) {
            const hero = findHeroByCode(player, heroCode);
            if (!hero || hero.resources < cost.resources) {
                return { canPay: false, reason: `Not enough resources (need ${cost.resources}).` };
            }
        }
    }

    return { canPay: true };
}

// ── Ability Cost Payment ─────────────────────────────────────────────────────

export function payAbilityCost(
    state: GameState,
    playerId: string,
    ability: CardAbility,
    sourceHeroCode?: string
): GameState {
    const player = getPlayer(state, playerId);
    if (!player) return state;

    const cost = ability.cost;
    if (!cost) return state;

    let updatedHeroes = [...player.heroes];

    // Exhaust self
    if (cost.exhaustSelf && sourceHeroCode) {
        const isAttachmentAbility = ability.cardCode !== sourceHeroCode;

        if (isAttachmentAbility) {
            // Exhaust the attachment
            updatedHeroes = updatedHeroes.map((h) => {
                if (h.code !== sourceHeroCode) return h;
                return {
                    ...h,
                    attachments: h.attachments.map((a) =>
                        a.code === ability.cardCode ? { ...a, exhausted: true } : a
                    ),
                };
            });
        } else {
            // Exhaust the hero
            updatedHeroes = updatedHeroes.map((h) =>
                h.code === sourceHeroCode ? { ...h, exhausted: true } : h
            );
        }
    }

    // Pay resources
    if (cost.resources && cost.resources > 0) {
        const heroCode = cost.resourcesFromPool ?? sourceHeroCode;
        if (heroCode) {
            updatedHeroes = updatedHeroes.map((h) =>
                h.code === heroCode ? { ...h, resources: h.resources - cost.resources! } : h
            );
        }
    }

    return updatePlayer(state, playerId, { heroes: updatedHeroes });
}

// ── Ability Limit Checking ───────────────────────────────────────────────────

// Track ability usage (in-memory for now, could be stored in GameState later)
const abilityUsageTracker: Map<string, AbilityUsage> = new Map();

function getUsageKey(playerId: string, abilityId: string): string {
    return `${playerId}:${abilityId}`;
}

export function canUseAbility(
    playerId: string,
    ability: CardAbility
): { canUse: boolean; reason?: string } {
    if (ability.limit === 'unlimited') return { canUse: true };

    const key = getUsageKey(playerId, ability.id);
    const usage = abilityUsageTracker.get(key);

    if (!usage) return { canUse: true };

    if (ability.limit === 'once_per_phase' && usage.usedThisPhase) {
        return { canUse: false, reason: 'Already used this phase.' };
    }

    if (ability.limit === 'once_per_round' && usage.usedThisRound) {
        return { canUse: false, reason: 'Already used this round.' };
    }

    return { canUse: true };
}

export function markAbilityUsed(playerId: string, ability: CardAbility): void {
    const key = getUsageKey(playerId, ability.id);
    abilityUsageTracker.set(key, {
        abilityId: ability.id,
        usedThisPhase: true,
        usedThisRound: true,
    });
}

export function resetPhaseAbilities(): void {
    for (const usage of abilityUsageTracker.values()) {
        usage.usedThisPhase = false;
    }
}

export function resetRoundAbilities(): void {
    abilityUsageTracker.clear();
}

// ── Stat Modifier System ─────────────────────────────────────────────────────

export interface StatModifier {
    source: string;         // Card code that provides the modifier
    stat: 'attack' | 'defense' | 'willpower' | 'health';
    amount: number;
    condition?: (state: GameState, heroCode: string) => boolean;
}

const statModifiers: Map<string, StatModifier[]> = new Map();

export function registerStatModifier(heroCode: string, modifier: StatModifier): void {
    const existing = statModifiers.get(heroCode) ?? [];
    existing.push(modifier);
    statModifiers.set(heroCode, existing);
}

export function clearStatModifiers(heroCode: string): void {
    statModifiers.delete(heroCode);
}

export function getStatModifiers(heroCode: string): StatModifier[] {
    return statModifiers.get(heroCode) ?? [];
}

export function calculateModifiedStat(
    state: GameState,
    heroCode: string,
    baseStat: number,
    statType: 'attack' | 'defense' | 'willpower' | 'health'
): number {
    const modifiers = getStatModifiers(heroCode);
    let total = baseStat;

    for (const mod of modifiers) {
        if (mod.stat !== statType) continue;
        if (mod.condition && !mod.condition(state, heroCode)) continue;
        total += mod.amount;
    }

    return Math.max(0, total);
}

// ── Effect Resolution ────────────────────────────────────────────────────────

export function resolveAbilityEffect(
    state: GameState,
    playerId: string,
    ability: CardAbility,
    context?: AbilityContext,
    choiceIndex?: number
): AbilityResult {
    const player = getPlayer(state, playerId);
    if (!player) {
        return { state, log: [], success: false, error: 'Player not found.' };
    }

    const effect = ability.effect;
    const logs: string[] = [];

    // Handle choice effects
    if (effect.type === 'choice') {
        if (choiceIndex === undefined) {
            // Return choices to UI
            return {
                state,
                log: [],
                success: true,
                requiresChoice: true,
                choices: effect.choiceDescriptions ?? [],
                choiceCallback: ability.id,
            };
        }

        // Resolve the chosen effect
        if (!effect.choices || choiceIndex >= effect.choices.length) {
            return { state, log: [], success: false, error: 'Invalid choice.' };
        }

        const chosenEffect = effect.choices[choiceIndex];
        const chosenAbility: CardAbility = {
            ...ability,
            effect: chosenEffect,
        };
        return resolveAbilityEffect(state, playerId, chosenAbility, context);
    }

    let nextState = state;

    switch (effect.type) {
        case 'ready_self': {
            const heroCode = context?.sourceHeroCode;
            if (heroCode) {
                const updatedHeroes = updateHero(player, heroCode, { exhausted: false });
                nextState = updatePlayer(state, playerId, { heroes: updatedHeroes });
                const hero = findHeroByCode(player, heroCode);
                logs.push(`${ability.cardName}: ${hero?.name ?? 'Hero'} readied.`);
            }
            break;
        }

        case 'gain_resources': {
            const amount = effect.amount ?? 0;
            if (effect.target === 'attached_hero' && context?.sourceHeroCode) {
                const updatedHeroes = player.heroes.map((h) =>
                    h.code === context.sourceHeroCode
                        ? { ...h, resources: h.resources + amount }
                        : h
                );
                nextState = updatePlayer(state, playerId, { heroes: updatedHeroes });
                const hero = findHeroByCode(player, context.sourceHeroCode);
                logs.push(`${ability.cardName}: ${hero?.name ?? 'Hero'} gains ${amount} resources.`);
            }
            break;
        }

        case 'draw_cards': {
            const amount = effect.amount ?? 0;
            const drawnCards = player.deck.slice(0, amount);
            const remainingDeck = player.deck.slice(amount);
            nextState = updatePlayer(state, playerId, {
                hand: [...player.hand, ...drawnCards],
                deck: remainingDeck,
            });
            logs.push(`${ability.cardName}: Draw ${amount} cards.`);
            break;
        }

        case 'deal_damage': {
            const amount = effect.amount ?? 0;
            // For now, handle enemy targeting via context
            if (effect.target === 'any_enemy' && context?.destroyedEnemy) {
                // This would need enemy targeting UI
                logs.push(`${ability.cardName}: Deal ${amount} damage to an enemy.`);
            } else {
                // Deal to first engaged enemy as default
                if (player.engagedEnemies.length > 0) {
                    const updatedEnemies = player.engagedEnemies.map((e, i) =>
                        i === 0 ? { ...e, damage: e.damage + amount } : e
                    );

                    // Check for destruction
                    const enemy = updatedEnemies[0];
                    const enemyHP = enemy.card.health ?? 1;

                    if (enemy.damage >= enemyHP) {
                        logs.push(`${ability.cardName}: Deal ${amount} damage to ${enemy.card.name}. ${enemy.card.name} destroyed!`);
                        nextState = updatePlayer(state, playerId, {
                            engagedEnemies: updatedEnemies.filter((_, i) => i !== 0),
                        });
                        nextState = {
                            ...nextState,
                            encounterDiscard: [...nextState.encounterDiscard, enemy.card],
                        };
                    } else {
                        logs.push(`${ability.cardName}: Deal ${amount} damage to ${enemy.card.name}.`);
                        nextState = updatePlayer(state, playerId, { engagedEnemies: updatedEnemies });
                    }
                }
            }
            break;
        }

        case 'reduce_threat': {
            const amount = effect.amount ?? 0;
            const newThreat = Math.max(0, player.threat - amount);
            nextState = updatePlayer(state, playerId, { threat: newThreat });
            logs.push(`${ability.cardName}: Threat reduced by ${amount} to ${newThreat}.`);
            break;
        }

        case 'place_progress': {
            const amount = effect.amount ?? 0;
            nextState = {
                ...state,
                questProgress: state.questProgress + amount,
            };
            logs.push(`${ability.cardName}: Place ${amount} progress on quest.`);
            break;
        }

        case 'stat_modifier': {
            // Stat modifiers are handled via the modifier system
            // This is for temporary round-based bonuses
            if (context?.sourceHeroCode && effect.stat && effect.amount) {
                registerStatModifier(context.sourceHeroCode, {
                    source: ability.cardCode,
                    stat: effect.stat,
                    amount: effect.amount,
                });
                const hero = findHeroByCode(player, context.sourceHeroCode);
                logs.push(`${ability.cardName}: ${hero?.name ?? 'Hero'} gets +${effect.amount} ${effect.stat}.`);
            }
            break;
        }

        default:
            logs.push(`[${ability.cardName} effect not fully implemented]`);
    }

    return {
        state: nextState,
        log: logs,
        success: true,
    };
}

// ── Main Ability Activation ──────────────────────────────────────────────────

export function activateAbility(
    state: GameState,
    playerId: string,
    abilityId: string,
    sourceHeroCode?: string,
    context?: AbilityContext,
    choiceIndex?: number
): AbilityResult {
    const ability = getAbilityById(abilityId);
    if (!ability) {
        return { state, log: [], success: false, error: 'Ability not found.' };
    }

    // Check limit
    const limitCheck = canUseAbility(playerId, ability);
    if (!limitCheck.canUse) {
        return { state, log: [], success: false, error: limitCheck.reason };
    }

    // Check cost
    const costCheck = canPayAbilityCost(state, playerId, ability, sourceHeroCode);
    if (!costCheck.canPay) {
        return { state, log: [], success: false, error: costCheck.reason };
    }

    // Pay cost
    let nextState = payAbilityCost(state, playerId, ability, sourceHeroCode);

    // Resolve effect
    const result = resolveAbilityEffect(
        nextState,
        playerId,
        ability,
        { ...context, sourceHeroCode },
        choiceIndex
    );

    // Mark as used if successful and not requiring choice
    if (result.success && !result.requiresChoice) {
        markAbilityUsed(playerId, ability);
    }

    return result;
}

// ── Response Ability Checking ────────────────────────────────────────────────

export function getTriggeredAbilities(
    state: GameState,
    playerId: string,
    trigger: AbilityTrigger,
    context?: AbilityContext
): CardAbility[] {
    const player = getPlayer(state, playerId);
    if (!player) return [];

    const triggered: CardAbility[] = [];

    // Check hero abilities
    for (const hero of player.heroes) {
        const abilities = getAbilities(hero.code);
        for (const ability of abilities) {
            if (ability.trigger !== trigger) continue;
            if (ability.condition && !ability.condition(state, playerId, context)) continue;

            const limitCheck = canUseAbility(playerId, ability);
            if (!limitCheck.canUse) continue;

            triggered.push(ability);
        }
    }

    // Check ally abilities (future expansion)
    // Check attachment abilities (future expansion)

    return triggered;
}

// ── Passive Ability Application ──────────────────────────────────────────────

export function applyPassiveAbilities(state: GameState, playerId: string): void {
    const player = getPlayer(state, playerId);
    if (!player) return;

    // Clear existing modifiers and reapply
    for (const hero of player.heroes) {
        clearStatModifiers(hero.code);

        // Check for passive abilities from attachments
        for (const attachment of hero.attachments) {
            const abilities = getAbilities(attachment.code);
            for (const ability of abilities) {
                if (ability.type !== 'passive') continue;

                // Apply stat modifiers
                if (ability.effect.type === 'stat_modifier' && ability.effect.stat && ability.effect.amount) {
                    registerStatModifier(hero.code, {
                        source: attachment.code,
                        stat: ability.effect.stat,
                        amount: ability.effect.amount,
                    });
                }
            }
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// CARD ABILITY DEFINITIONS - Starting Deck
// ══════════════════════════════════════════════════════════════════════════════

// ── Aragorn (01001) ──────────────────────────────────────────────────────────
// Action: Spend 1 resource from Aragorn's pool to ready him. (Limit once per phase.)

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

// ── Gimli (01004) ────────────────────────────────────────────────────────────
// Gimli gets +1 Attack for each damage token on him.
// This is a passive/forced ability that we handle via stat modifiers

registerAbility({
    id: 'gimli-damage-attack',
    cardCode: '01004',
    cardName: 'Gimli',
    type: 'passive',
    trigger: 'constant',
    effect: {
        type: 'stat_modifier',
        stat: 'attack',
        amount: 0, // Calculated dynamically based on damage
    },
    limit: 'unlimited',
    description: 'Gimli gets +1 Attack for each damage token on him.',
});

// ── Legolas (01005) ──────────────────────────────────────────────────────────
// Response: After Legolas participates in an attack that destroys an enemy,
// place 2 progress tokens on the current quest.

registerAbility({
    id: 'legolas-progress',
    cardCode: '01005',
    cardName: 'Legolas',
    type: 'response',
    trigger: 'after_enemy_destroyed',
    effect: {
        type: 'place_progress',
        amount: 2,
        target: 'current_quest',
    },
    limit: 'unlimited',
    description: 'Place 2 progress on the quest after destroying an enemy.',
    condition: (_state, _playerId, context) => {
        // Check if Legolas participated in the attack
        return context?.attackingCharacter?.type === 'hero' &&
               context?.attackingCharacter?.code === '01005';
    },
});

// ── Steward of Gondor (01026) ────────────────────────────────────────────────
// Action: Exhaust Steward of Gondor to add 2 resources to attached hero's pool.

registerAbility({
    id: 'steward-resources',
    cardCode: '01026',
    cardName: 'Steward of Gondor',
    type: 'action',
    trigger: 'manual',
    cost: {
        exhaustSelf: true, // Exhaust the attachment
    },
    effect: {
        type: 'gain_resources',
        amount: 2,
        target: 'attached_hero',
    },
    limit: 'unlimited', // Can use every round once readied
    description: 'Exhaust to add 2 resources to attached hero.',
});

// ── Celebrían's Stone (01027) ────────────────────────────────────────────────
// Attached hero gets +2 Willpower and gains the Spirit trait.

registerAbility({
    id: 'celebrians-stone-willpower',
    cardCode: '01027',
    cardName: "Celebrían's Stone",
    type: 'passive',
    trigger: 'constant',
    effect: {
        type: 'stat_modifier',
        stat: 'willpower',
        amount: 2,
    },
    limit: 'unlimited',
    description: '+2 Willpower to attached hero.',
});

// ── Blade of Gondolin (01044) ────────────────────────────────────────────────
// Attached hero gets +1 Attack.
// Response: After attached hero destroys an Orc enemy, place 1 progress on quest.

registerAbility({
    id: 'blade-gondolin-attack',
    cardCode: '01044',
    cardName: 'Blade of Gondolin',
    type: 'passive',
    trigger: 'constant',
    effect: {
        type: 'stat_modifier',
        stat: 'attack',
        amount: 1,
    },
    limit: 'unlimited',
    description: '+1 Attack to attached hero.',
});

registerAbility({
    id: 'blade-gondolin-progress',
    cardCode: '01044',
    cardName: 'Blade of Gondolin',
    type: 'response',
    trigger: 'after_orc_destroyed',
    effect: {
        type: 'place_progress',
        amount: 1,
        target: 'current_quest',
    },
    limit: 'unlimited',
    description: 'Place 1 progress after destroying an Orc.',
    condition: (_state, _playerId, context) => {
        // Check if destroyed enemy has Orc trait
        const traits = context?.destroyedEnemy?.traits ?? '';
        return traits.toLowerCase().includes('orc');
    },
});

// ── Gandalf (01061) ──────────────────────────────────────────────────────────
// When Gandalf enters play, choose one: draw 3 cards, deal 4 damage to 1 enemy,
// or reduce your threat by 5.

registerAbility({
    id: 'gandalf-enter-play',
    cardCode: '01061',
    cardName: 'Gandalf',
    type: 'enter_play',
    trigger: 'on_enter_play',
    effect: {
        type: 'choice',
        choices: [
            { type: 'draw_cards', amount: 3 },
            { type: 'deal_damage', amount: 4, target: 'any_enemy' },
            { type: 'reduce_threat', amount: 5 },
        ],
        choiceDescriptions: [
            'Draw 3 cards',
            'Deal 4 damage to an enemy',
            'Reduce threat by 5',
        ],
    },
    limit: 'unlimited',
    description: 'Choose: Draw 3, Deal 4 damage, or -5 threat.',
});

// ══════════════════════════════════════════════════════════════════════════════
// GIMLI SPECIAL HANDLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Gimli's attack bonus based on damage tokens.
 * This is called whenever we need Gimli's current attack value.
 */
export function getGimliAttackBonus(state: GameState, playerId: string): number {
    const player = getPlayer(state, playerId);
    if (!player) return 0;

    const gimli = player.heroes.find((h) => h.code === '01004');
    if (!gimli) return 0;

    return gimli.damage ?? 0;
}

/**
 * Get the effective attack value for a hero, including all modifiers.
 */
export function getEffectiveAttack(state: GameState, playerId: string, heroCode: string): number {
    const player = getPlayer(state, playerId);
    if (!player) return 0;

    const hero = findHeroByCode(player, heroCode);
    if (!hero) return 0;

    let baseAttack = hero.attack ?? 0;

    // Gimli special: +1 attack per damage
    if (heroCode === '01004') {
        baseAttack += hero.damage ?? 0;
    }

    // Apply modifiers from attachments
    const modifiers = getStatModifiers(heroCode);
    for (const mod of modifiers) {
        if (mod.stat === 'attack') {
            if (mod.condition && !mod.condition(state, heroCode)) continue;
            baseAttack += mod.amount;
        }
    }

    return Math.max(0, baseAttack);
}

/**
 * Get the effective willpower value for a hero, including all modifiers.
 */
export function getEffectiveWillpower(state: GameState, playerId: string, heroCode: string): number {
    const player = getPlayer(state, playerId);
    if (!player) return 0;

    const hero = findHeroByCode(player, heroCode);
    if (!hero) return 0;

    let baseWillpower = hero.willpower ?? 0;

    // Apply modifiers from attachments
    const modifiers = getStatModifiers(heroCode);
    for (const mod of modifiers) {
        if (mod.stat === 'willpower') {
            if (mod.condition && !mod.condition(state, heroCode)) continue;
            baseWillpower += mod.amount;
        }
    }

    return Math.max(0, baseWillpower);
}

/**
 * Get the effective defense value for a hero, including all modifiers.
 */
export function getEffectiveDefense(state: GameState, playerId: string, heroCode: string): number {
    const player = getPlayer(state, playerId);
    if (!player) return 0;

    const hero = findHeroByCode(player, heroCode);
    if (!hero) return 0;

    let baseDefense = hero.defense ?? 0;

    // Apply modifiers from attachments
    const modifiers = getStatModifiers(heroCode);
    for (const mod of modifiers) {
        if (mod.stat === 'defense') {
            if (mod.condition && !mod.condition(state, heroCode)) continue;
            baseDefense += mod.amount;
        }
    }

    return Math.max(0, baseDefense);
}
