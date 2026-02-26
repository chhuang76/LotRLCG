/**
 * Event Effect Resolution System
 *
 * Handles event card effects from the Core Set.
 * Each event has a type, optional target requirements, and an effect handler.
 *
 * Event Types:
 * - Action: Can be played during any Action window (typically Planning phase)
 * - Combat Action: Can only be played during Combat phase
 * - Response: Triggered after a specific event occurs
 */

import type { GameState, PlayerCard, PlayerState, Ally, Hero, ActiveEnemy, CharacterRef } from './types';

// ── Target Types ─────────────────────────────────────────────────────────────

export type TargetType =
    | 'none'              // No target needed
    | 'ally'              // Target an ally in play
    | 'ally_in_hand'      // Target an ally in hand (for Sneak Attack)
    | 'ally_in_discard'   // Target an ally in any discard pile (for Stand and Fight)
    | 'hero'              // Target a hero
    | 'character'         // Target any character (hero or ally)
    | 'enemy'             // Target an enemy in staging or engaged
    | 'engaged_enemy'     // Target an enemy engaged with a player
    | 'player'            // Target a player
    | 'card_in_discard';  // Target a card in discard pile

export interface TargetRequirement {
    type: TargetType;
    description: string;
    filter?: (target: any, state: GameState, playerId: string) => boolean;
}

// ── Effect Result ────────────────────────────────────────────────────────────

export interface EventEffectResult {
    state: GameState;
    log: string[];
    success: boolean;
    error?: string;
    /** For events that need end-of-phase cleanup (like Sneak Attack) */
    endOfPhaseEffect?: EndOfPhaseEffect;
}

export interface EndOfPhaseEffect {
    type: 'return_ally_to_hand';
    allyCode: string;
    playerId: string;
}

// ── Event Definition ─────────────────────────────────────────────────────────

export type EventTiming = 'action' | 'combat_action' | 'response';

export interface EventDefinition {
    code: string;
    name: string;
    timing: EventTiming;
    target?: TargetRequirement;
    costOverride?: (state: GameState, playerId: string) => number; // For X-cost events
    canPlay?: (state: GameState, playerId: string) => { canPlay: boolean; reason?: string };
    resolve: (
        state: GameState,
        playerId: string,
        target?: EventTarget
    ) => EventEffectResult;
}

export type EventTarget =
    | { type: 'ally'; allyIndex: number }
    | { type: 'ally_in_hand'; cardIndex: number }
    | { type: 'ally_in_discard'; playerId: string; cardIndex: number }
    | { type: 'hero'; heroCode: string }
    | { type: 'character'; ref: CharacterRef }
    | { type: 'enemy'; enemyIndex: number; location: 'staging' | 'engaged' }
    | { type: 'engaged_enemy'; enemyIndex: number }
    | { type: 'player'; playerId: string }
    | { type: 'card_in_discard'; cardIndex: number; sphere?: string };

// ── Event Registry ───────────────────────────────────────────────────────────

const eventRegistry: Map<string, EventDefinition> = new Map();

export function registerEvent(definition: EventDefinition): void {
    eventRegistry.set(definition.code, definition);
}

export function getEventDefinition(code: string): EventDefinition | undefined {
    return eventRegistry.get(code);
}

export function hasEventDefinition(code: string): boolean {
    return eventRegistry.has(code);
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

function readyAlly(ally: Ally): Ally {
    return { ...ally, exhausted: false };
}

function readyHero(hero: Hero): Hero {
    return { ...hero, exhausted: false };
}

// ── Event Effect Handlers ────────────────────────────────────────────────────

/**
 * Ever Vigilant (01020) - Leadership
 * Cost: 1
 * Action: Choose and ready 1 ally card.
 */
registerEvent({
    code: '01020',
    name: 'Ever Vigilant',
    timing: 'action',
    target: {
        type: 'ally',
        description: 'Choose an exhausted ally to ready',
        filter: (ally: Ally) => ally.exhausted,
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'ally') {
            return { state, log: [], success: false, error: 'No ally target specified.' };
        }

        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const ally = player.allies[target.allyIndex];
        if (!ally) {
            return { state, log: [], success: false, error: 'Ally not found.' };
        }

        if (!ally.exhausted) {
            return { state, log: [], success: false, error: 'Ally is not exhausted.' };
        }

        const updatedAllies = player.allies.map((a, i) =>
            i === target.allyIndex ? readyAlly(a) : a
        );

        const newState = updatePlayer(state, playerId, { allies: updatedAllies });
        return {
            state: newState,
            log: [`Ever Vigilant: ${ally.name} readied.`],
            success: true,
        };
    },
});

/**
 * Common Cause (01021) - Leadership
 * Cost: 0
 * Action: Exhaust 1 hero you control to choose and ready a different hero.
 */
registerEvent({
    code: '01021',
    name: 'Common Cause',
    timing: 'action',
    target: {
        type: 'hero',
        description: 'Choose a ready hero to exhaust, then choose an exhausted hero to ready',
    },
    canPlay: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        const readyHeroes = player.heroes.filter((h) => !h.exhausted);
        const exhaustedHeroes = player.heroes.filter((h) => h.exhausted);

        if (readyHeroes.length === 0) {
            return { canPlay: false, reason: 'No ready heroes to exhaust.' };
        }
        if (exhaustedHeroes.length === 0) {
            return { canPlay: false, reason: 'No exhausted heroes to ready.' };
        }
        return { canPlay: true };
    },
    resolve: (state, playerId, _target) => {
        // Since our current system only supports one target, we'll simplify:
        // Auto-exhaust first ready hero, ready first exhausted hero
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const readyHeroIndex = player.heroes.findIndex((h) => !h.exhausted);
        const exhaustedHeroIndex = player.heroes.findIndex((h) => h.exhausted);

        if (readyHeroIndex === -1) {
            return { state, log: [], success: false, error: 'No ready hero to exhaust.' };
        }
        if (exhaustedHeroIndex === -1) {
            return { state, log: [], success: false, error: 'No exhausted hero to ready.' };
        }

        const heroToExhaust = player.heroes[readyHeroIndex];
        const heroToReady = player.heroes[exhaustedHeroIndex];

        const updatedHeroes = player.heroes.map((h, i) => {
            if (i === readyHeroIndex) return { ...h, exhausted: true };
            if (i === exhaustedHeroIndex) return { ...h, exhausted: false };
            return h;
        });

        const newState = updatePlayer(state, playerId, { heroes: updatedHeroes });
        return {
            state: newState,
            log: [`Common Cause: Exhausted ${heroToExhaust.name} to ready ${heroToReady.name}.`],
            success: true,
        };
    },
});

/**
 * Sneak Attack (01023) - Leadership
 * Cost: 1
 * Action: Put 1 ally card into play from your hand.
 * At the end of the phase, if that ally is still in play, return it to your hand.
 */
registerEvent({
    code: '01023',
    name: 'Sneak Attack',
    timing: 'action',
    target: {
        type: 'ally_in_hand',
        description: 'Choose an ally from your hand to put into play',
    },
    canPlay: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        const alliesInHand = player.hand.filter((c) => c.type_code === 'ally');
        if (alliesInHand.length === 0) {
            return { canPlay: false, reason: 'No allies in hand.' };
        }
        return { canPlay: true };
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'ally_in_hand') {
            return { state, log: [], success: false, error: 'No ally target specified.' };
        }

        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const card = player.hand[target.cardIndex];
        if (!card || card.type_code !== 'ally') {
            return { state, log: [], success: false, error: 'Selected card is not an ally.' };
        }

        // Put ally into play (ready, no damage)
        const newAlly: Ally = {
            ...card,
            exhausted: false,
            damage: 0,
        };

        // Remove from hand, add to allies
        const updatedHand = player.hand.filter((_, i) => i !== target.cardIndex);
        const updatedAllies = [...player.allies, newAlly];

        const newState = updatePlayer(state, playerId, {
            hand: updatedHand,
            allies: updatedAllies,
        });

        return {
            state: newState,
            log: [`Sneak Attack: ${card.name} put into play. Will return to hand at end of phase.`],
            success: true,
            endOfPhaseEffect: {
                type: 'return_ally_to_hand',
                allyCode: card.code,
                playerId,
            },
        };
    },
});

/**
 * Grim Resolve (01025) - Leadership
 * Cost: 5
 * Action: Ready all character cards in play.
 */
registerEvent({
    code: '01025',
    name: 'Grim Resolve',
    timing: 'action',
    resolve: (state, _playerId) => {
        const logs: string[] = [];
        let readiedCount = 0;

        const updatedPlayers = state.players.map((player) => {
            const updatedHeroes = player.heroes.map((h) => {
                if (h.exhausted) {
                    readiedCount++;
                    return readyHero(h);
                }
                return h;
            });

            const updatedAllies = player.allies.map((a) => {
                if (a.exhausted) {
                    readiedCount++;
                    return readyAlly(a);
                }
                return a;
            });

            return {
                ...player,
                heroes: updatedHeroes,
                allies: updatedAllies,
            };
        });

        logs.push(`Grim Resolve: Readied ${readiedCount} characters.`);

        return {
            state: { ...state, players: updatedPlayers },
            log: logs,
            success: true,
        };
    },
});

/**
 * Blade Mastery (01032) - Tactics
 * Cost: 1
 * Action: Choose a character. Until the end of the phase, that character gains +1 Attack and +1 Defense.
 */
registerEvent({
    code: '01032',
    name: 'Blade Mastery',
    timing: 'action',
    target: {
        type: 'character',
        description: 'Choose a character to gain +1 Attack and +1 Defense',
    },
    resolve: (state, playerId, target) => {
        // For simplicity, we'll just log the effect (stat bonuses would need a modifier system)
        // In a full implementation, we'd track temporary modifiers
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        if (!target || target.type !== 'character') {
            // Default to first hero if no target
            const hero = player.heroes[0];
            if (!hero) {
                return { state, log: [], success: false, error: 'No character to target.' };
            }
            return {
                state,
                log: [`Blade Mastery: ${hero.name} gains +1 Attack and +1 Defense until end of phase.`],
                success: true,
            };
        }

        const ref = target.ref;
        let characterName = 'Unknown';

        if (ref.type === 'hero') {
            const hero = player.heroes.find((h) => h.code === ref.code);
            characterName = hero?.name ?? 'Unknown Hero';
        } else {
            const ally = player.allies[ref.index];
            characterName = ally?.name ?? 'Unknown Ally';
        }

        return {
            state,
            log: [`Blade Mastery: ${characterName} gains +1 Attack and +1 Defense until end of phase.`],
            success: true,
        };
    },
});

/**
 * Feint (01034) - Tactics
 * Cost: 1
 * Combat Action: Choose an enemy engaged with a player. That enemy cannot attack that player this phase.
 */
registerEvent({
    code: '01034',
    name: 'Feint',
    timing: 'combat_action',
    target: {
        type: 'engaged_enemy',
        description: 'Choose an engaged enemy to prevent from attacking',
    },
    canPlay: (state, playerId) => {
        // Can only play during combat phase
        if (state.phase !== 'combat' && state.phase !== 'combat_defend') {
            return { canPlay: false, reason: 'Can only play during combat phase.' };
        }

        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        if (player.engagedEnemies.length === 0) {
            return { canPlay: false, reason: 'No engaged enemies.' };
        }
        return { canPlay: true };
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'engaged_enemy') {
            return { state, log: [], success: false, error: 'No enemy target specified.' };
        }

        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const enemy = player.engagedEnemies[target.enemyIndex];
        if (!enemy) {
            return { state, log: [], success: false, error: 'Enemy not found.' };
        }

        // Mark enemy as "feinted" (cannot attack this phase)
        // We'll add a flag to the enemy for this
        const updatedEnemies = player.engagedEnemies.map((e, i) =>
            i === target.enemyIndex ? { ...e, feinted: true } : e
        );

        const newState = updatePlayer(state, playerId, { engagedEnemies: updatedEnemies as ActiveEnemy[] });

        return {
            state: newState,
            log: [`Feint: ${enemy.card.name} cannot attack this phase.`],
            success: true,
        };
    },
});

/**
 * Quick Strike (01035) - Tactics
 * Cost: 1
 * Action: Exhaust a character you control to immediately declare it as an attacker
 * (and resolve its attack) against any eligible enemy target.
 */
registerEvent({
    code: '01035',
    name: 'Quick Strike',
    timing: 'action',
    target: {
        type: 'character',
        description: 'Choose a ready character to attack an enemy',
    },
    canPlay: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        const readyCharacters = [
            ...player.heroes.filter((h) => !h.exhausted),
            ...player.allies.filter((a) => !a.exhausted),
        ];

        if (readyCharacters.length === 0) {
            return { canPlay: false, reason: 'No ready characters.' };
        }

        if (player.engagedEnemies.length === 0) {
            return { canPlay: false, reason: 'No enemies to attack.' };
        }

        return { canPlay: true };
    },
    resolve: (state, playerId, _target) => {
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        // Find the first engaged enemy attacking
        let attacker: Hero | Ally | undefined;
        let attackerIndex = -1;
        let isHero = false;

        for (let i = 0; i < player.heroes.length; i++) {
            if (!player.heroes[i].exhausted) {
                attacker = player.heroes[i];
                attackerIndex = i;
                isHero = true;
                break;
            }
        }

        if (!attacker) {
            for (let i = 0; i < player.allies.length; i++) {
                if (!player.allies[i].exhausted) {
                    attacker = player.allies[i];
                    attackerIndex = i;
                    break;
                }
            }
        }

        if (!attacker) {
            return { state, log: [], success: false, error: 'No ready character to attack with.' };
        }

        // Attack first engaged enemy
        const enemy = player.engagedEnemies[0];
        if (!enemy) {
            return { state, log: [], success: false, error: 'No enemy to attack.' };
        }

        const attackValue = attacker.attack ?? 0;
        const defenseValue = enemy.card.defense ?? 0;
        const damageDealt = Math.max(0, attackValue - defenseValue);

        // Exhaust the attacker
        let updatedHeroes = player.heroes;
        let updatedAllies = player.allies;

        if (isHero) {
            updatedHeroes = player.heroes.map((h, i) =>
                i === attackerIndex ? { ...h, exhausted: true } : h
            );
        } else {
            updatedAllies = player.allies.map((a, i) =>
                i === attackerIndex ? { ...a, exhausted: true } : a
            );
        }

        // Deal damage to enemy
        const updatedEnemies = player.engagedEnemies.map((e, i) =>
            i === 0 ? { ...e, damage: e.damage + damageDealt } : e
        );

        const logs: string[] = [];
        logs.push(`Quick Strike: ${attacker.name} attacks ${enemy.card.name}!`);
        logs.push(`Attack ${attackValue} vs Defense ${defenseValue}: ${damageDealt} damage dealt.`);

        // Check if enemy is destroyed
        const updatedEnemy = updatedEnemies[0];
        const enemyHP = updatedEnemy.card.health ?? 1;
        let finalEnemies = updatedEnemies;
        let updatedEncounterDiscard = state.encounterDiscard;

        if (updatedEnemy.damage >= enemyHP) {
            logs.push(`${enemy.card.name} destroyed!`);
            finalEnemies = updatedEnemies.filter((_, i) => i !== 0);
            updatedEncounterDiscard = [...state.encounterDiscard, enemy.card];
        }

        const newState = {
            ...updatePlayer(state, playerId, {
                heroes: updatedHeroes,
                allies: updatedAllies,
                engagedEnemies: finalEnemies,
            }),
            encounterDiscard: updatedEncounterDiscard,
        };

        return {
            state: newState,
            log: logs,
            success: true,
        };
    },
});

/**
 * Swift Strike (01037) - Tactics
 * Cost: 2
 * Response: After a character is declared as a defender, deal 2 damage to the attacking enemy.
 */
registerEvent({
    code: '01037',
    name: 'Swift Strike',
    timing: 'response',
    canPlay: (state, _playerId) => {
        // Can only play during combat defense
        if (state.phase !== 'combat_defend') {
            return { canPlay: false, reason: 'Can only play after declaring a defender.' };
        }

        if (!state.combatState || state.combatState.selectedDefender === null) {
            return { canPlay: false, reason: 'No defender has been selected.' };
        }

        return { canPlay: true };
    },
    resolve: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        if (!state.combatState) {
            return { state, log: [], success: false, error: 'Not in combat.' };
        }

        const enemyIndex = state.combatState.currentEnemyIndex;
        const enemy = player.engagedEnemies[enemyIndex];
        if (!enemy) {
            return { state, log: [], success: false, error: 'No attacking enemy.' };
        }

        // Deal 2 damage to the attacking enemy
        const updatedEnemies = player.engagedEnemies.map((e, i) =>
            i === enemyIndex ? { ...e, damage: e.damage + 2 } : e
        );

        const logs: string[] = [];
        logs.push(`Swift Strike: Dealt 2 damage to ${enemy.card.name}.`);

        // Check if enemy is destroyed
        const updatedEnemy = updatedEnemies[enemyIndex];
        const enemyHP = updatedEnemy.card.health ?? 1;
        let finalEnemies = updatedEnemies;
        let updatedEncounterDiscard = state.encounterDiscard;

        if (updatedEnemy.damage >= enemyHP) {
            logs.push(`${enemy.card.name} destroyed!`);
            finalEnemies = updatedEnemies.filter((_, i) => i !== enemyIndex);
            updatedEncounterDiscard = [...state.encounterDiscard, enemy.card];
        }

        const newState = {
            ...updatePlayer(state, playerId, { engagedEnemies: finalEnemies }),
            encounterDiscard: updatedEncounterDiscard,
        };

        return {
            state: newState,
            log: logs,
            success: true,
        };
    },
});

/**
 * The Galadhrim's Greeting (01046) - Spirit
 * Cost: 3
 * Action: Reduce one player's threat by 6, or reduce each player's threat by 2.
 */
registerEvent({
    code: '01046',
    name: "The Galadhrim's Greeting",
    timing: 'action',
    resolve: (state, playerId) => {
        // Default to reducing current player's threat by 6
        // A more complete implementation would let the player choose
        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const newThreat = Math.max(0, player.threat - 6);
        const newState = updatePlayer(state, playerId, { threat: newThreat });

        return {
            state: newState,
            log: [`The Galadhrim's Greeting: ${player.name}'s threat reduced by 6 to ${newThreat}.`],
            success: true,
        };
    },
});

/**
 * Hasty Stroke (01048) - Spirit
 * Cost: 1
 * Response: Cancel a shadow effect just triggered during combat.
 */
registerEvent({
    code: '01048',
    name: 'Hasty Stroke',
    timing: 'response',
    canPlay: (state, _playerId) => {
        if (state.phase !== 'combat_defend') {
            return { canPlay: false, reason: 'Can only play during combat defense.' };
        }

        if (!state.combatState || !state.combatState.shadowRevealed) {
            return { canPlay: false, reason: 'No shadow effect to cancel.' };
        }

        return { canPlay: true };
    },
    resolve: (state, _playerId) => {
        // Cancel the shadow effect (in practice, we'd need to track which shadow is active)
        return {
            state,
            log: ['Hasty Stroke: Shadow effect cancelled!'],
            success: true,
        };
    },
});

/**
 * A Test of Will (01050) - Spirit
 * Cost: 1
 * Response: Cancel the "when revealed" effects of a card that was just revealed.
 */
registerEvent({
    code: '01050',
    name: 'A Test of Will',
    timing: 'response',
    canPlay: (state, _playerId) => {
        if (state.phase !== 'quest_staging') {
            return { canPlay: false, reason: 'Can only play during staging.' };
        }
        return { canPlay: true };
    },
    resolve: (state, _playerId) => {
        return {
            state,
            log: ['A Test of Will: "When Revealed" effect cancelled!'],
            success: true,
        };
    },
});

/**
 * Stand and Fight (01051) - Spirit
 * Cost: X (where X is the ally's printed cost)
 * Action: Choose an ally with a printed cost of X in any player's discard pile.
 * Put that ally into play under your control.
 */
registerEvent({
    code: '01051',
    name: 'Stand and Fight',
    timing: 'action',
    target: {
        type: 'ally_in_discard',
        description: 'Choose an ally from any discard pile',
    },
    canPlay: (state, _playerId) => {
        // Check if any player has allies in discard
        const alliesInDiscard = state.players.some((p) =>
            p.discard.some((c) => c.type_code === 'ally')
        );

        if (!alliesInDiscard) {
            return { canPlay: false, reason: 'No allies in any discard pile.' };
        }

        return { canPlay: true };
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'ally_in_discard') {
            return { state, log: [], success: false, error: 'No ally target specified.' };
        }

        const sourcePlayer = getPlayer(state, target.playerId);
        if (!sourcePlayer) {
            return { state, log: [], success: false, error: 'Source player not found.' };
        }

        const card = sourcePlayer.discard[target.cardIndex];
        if (!card || card.type_code !== 'ally') {
            return { state, log: [], success: false, error: 'Selected card is not an ally.' };
        }

        // Remove ally from source discard
        const updatedSourceDiscard = sourcePlayer.discard.filter((_, i) => i !== target.cardIndex);

        // Create the ally
        const newAlly: Ally = {
            ...card,
            exhausted: false,
            damage: 0,
        };

        // Add to current player's allies
        const currentPlayer = getPlayer(state, playerId);
        if (!currentPlayer) {
            return { state, log: [], success: false, error: 'Current player not found.' };
        }

        let newState = updatePlayer(state, target.playerId, { discard: updatedSourceDiscard });
        newState = updatePlayer(newState, playerId, {
            allies: [...currentPlayer.allies, newAlly],
        });

        return {
            state: newState,
            log: [`Stand and Fight: ${card.name} put into play from discard.`],
            success: true,
        };
    },
});

/**
 * A Light in the Dark (01052) - Spirit
 * Cost: 2
 * Action: Choose an enemy engaged with a player. Return that enemy to the staging area.
 */
registerEvent({
    code: '01052',
    name: 'A Light in the Dark',
    timing: 'action',
    target: {
        type: 'engaged_enemy',
        description: 'Choose an engaged enemy to return to staging',
    },
    canPlay: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        if (player.engagedEnemies.length === 0) {
            return { canPlay: false, reason: 'No engaged enemies.' };
        }
        return { canPlay: true };
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'engaged_enemy') {
            return { state, log: [], success: false, error: 'No enemy target specified.' };
        }

        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const enemy = player.engagedEnemies[target.enemyIndex];
        if (!enemy) {
            return { state, log: [], success: false, error: 'Enemy not found.' };
        }

        // Remove from engaged, add to staging
        const updatedEnemies = player.engagedEnemies.filter((_, i) => i !== target.enemyIndex);
        const updatedStaging = [...state.stagingArea, enemy.card];

        const newState = {
            ...updatePlayer(state, playerId, { engagedEnemies: updatedEnemies }),
            stagingArea: updatedStaging,
        };

        return {
            state: newState,
            log: [`A Light in the Dark: ${enemy.card.name} returned to staging area.`],
            success: true,
        };
    },
});

/**
 * Dwarven Tomb (01053) - Spirit
 * Cost: 1
 * Action: Return 1 Spirit card from your discard pile to your hand.
 */
registerEvent({
    code: '01053',
    name: 'Dwarven Tomb',
    timing: 'action',
    target: {
        type: 'card_in_discard',
        description: 'Choose a Spirit card from your discard to return to hand',
    },
    canPlay: (state, playerId) => {
        const player = getPlayer(state, playerId);
        if (!player) return { canPlay: false, reason: 'Player not found.' };

        const spiritCards = player.discard.filter((c) => c.sphere_code === 'spirit');
        if (spiritCards.length === 0) {
            return { canPlay: false, reason: 'No Spirit cards in discard pile.' };
        }
        return { canPlay: true };
    },
    resolve: (state, playerId, target) => {
        if (!target || target.type !== 'card_in_discard') {
            // Default to first Spirit card
            const player = getPlayer(state, playerId);
            if (!player) {
                return { state, log: [], success: false, error: 'Player not found.' };
            }

            const spiritIndex = player.discard.findIndex((c) => c.sphere_code === 'spirit');
            if (spiritIndex === -1) {
                return { state, log: [], success: false, error: 'No Spirit cards in discard.' };
            }

            const card = player.discard[spiritIndex];
            const updatedDiscard = player.discard.filter((_, i) => i !== spiritIndex);
            const updatedHand = [...player.hand, card];

            const newState = updatePlayer(state, playerId, {
                discard: updatedDiscard,
                hand: updatedHand,
            });

            return {
                state: newState,
                log: [`Dwarven Tomb: ${card.name} returned to hand.`],
                success: true,
            };
        }

        const player = getPlayer(state, playerId);
        if (!player) {
            return { state, log: [], success: false, error: 'Player not found.' };
        }

        const card = player.discard[target.cardIndex];
        if (!card) {
            return { state, log: [], success: false, error: 'Card not found.' };
        }

        if (card.sphere_code !== 'spirit') {
            return { state, log: [], success: false, error: 'Card is not a Spirit card.' };
        }

        const updatedDiscard = player.discard.filter((_, i) => i !== target.cardIndex);
        const updatedHand = [...player.hand, card];

        const newState = updatePlayer(state, playerId, {
            discard: updatedDiscard,
            hand: updatedHand,
        });

        return {
            state: newState,
            log: [`Dwarven Tomb: ${card.name} returned to hand.`],
            success: true,
        };
    },
});

// ── Main Resolution Function ─────────────────────────────────────────────────

/**
 * Resolve an event card effect.
 * Returns the updated game state and logs.
 */
export function resolveEventEffect(
    state: GameState,
    eventCard: PlayerCard,
    playerId: string,
    target?: EventTarget
): EventEffectResult {
    const definition = getEventDefinition(eventCard.code);

    if (!definition) {
        // Unknown event - just discard with a message
        return {
            state,
            log: [`[Event "${eventCard.name}" resolved - effect not implemented]`],
            success: true,
        };
    }

    // Check if event can be played
    if (definition.canPlay) {
        const canPlayResult = definition.canPlay(state, playerId);
        if (!canPlayResult.canPlay) {
            return {
                state,
                log: [],
                success: false,
                error: canPlayResult.reason ?? 'Cannot play this event now.',
            };
        }
    }

    // Check timing restrictions
    if (definition.timing === 'combat_action') {
        if (state.phase !== 'combat' && state.phase !== 'combat_defend' && state.phase !== 'combat_attack') {
            return {
                state,
                log: [],
                success: false,
                error: 'Combat Actions can only be played during combat.',
            };
        }
    }

    // Resolve the effect
    return definition.resolve(state, playerId, target);
}

/**
 * Get valid targets for an event card.
 */
export function getEventTargets(
    state: GameState,
    eventCard: PlayerCard,
    playerId: string
): { type: TargetType; targets: any[] } | null {
    const definition = getEventDefinition(eventCard.code);

    if (!definition || !definition.target) {
        return null;
    }

    const player = getPlayer(state, playerId);
    if (!player) return null;

    const targetType = definition.target.type;
    const filter = definition.target.filter;

    switch (targetType) {
        case 'ally': {
            let allies = player.allies.map((a, i) => ({ ally: a, index: i }));
            if (filter) {
                allies = allies.filter((a) => filter(a.ally, state, playerId));
            }
            return { type: 'ally', targets: allies };
        }

        case 'ally_in_hand': {
            const allies = player.hand
                .map((c, i) => ({ card: c, index: i }))
                .filter((c) => c.card.type_code === 'ally');
            return { type: 'ally_in_hand', targets: allies };
        }

        case 'ally_in_discard': {
            const allAllies: { playerId: string; card: PlayerCard; index: number }[] = [];
            for (const p of state.players) {
                p.discard.forEach((c, i) => {
                    if (c.type_code === 'ally') {
                        allAllies.push({ playerId: p.id, card: c, index: i });
                    }
                });
            }
            return { type: 'ally_in_discard', targets: allAllies };
        }

        case 'hero': {
            let heroes = player.heroes.map((h) => ({ hero: h, code: h.code }));
            if (filter) {
                heroes = heroes.filter((h) => filter(h.hero, state, playerId));
            }
            return { type: 'hero', targets: heroes };
        }

        case 'character': {
            const characters: CharacterRef[] = [
                ...player.heroes.map((h) => ({ type: 'hero' as const, index: 0, code: h.code })),
                ...player.allies.map((_, i) => ({ type: 'ally' as const, index: i, code: '' })),
            ];
            return { type: 'character', targets: characters };
        }

        case 'engaged_enemy': {
            const enemies = player.engagedEnemies.map((e, i) => ({ enemy: e, index: i }));
            return { type: 'engaged_enemy', targets: enemies };
        }

        default:
            return null;
    }
}

/**
 * Check if an event requires a target.
 */
export function eventRequiresTarget(eventCard: PlayerCard): boolean {
    const definition = getEventDefinition(eventCard.code);
    return definition?.target !== undefined;
}

/**
 * Get the target description for an event.
 */
export function getEventTargetDescription(eventCard: PlayerCard): string | null {
    const definition = getEventDefinition(eventCard.code);
    return definition?.target?.description ?? null;
}
