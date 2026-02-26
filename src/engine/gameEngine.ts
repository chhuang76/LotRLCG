/**
 * Pure game engine — all phase-step logic with no React dependency.
 *
 * Called by the Zustand store to advance game state.
 */

import type {
    GameState,
    GamePhase,
    EncounterCard,
    ActiveEnemy,
} from './types';

import { checkStage2ForcedEffect } from './questStageEffects';
import {
    resolveWhenEngaged,
    clearRoundBasedModifiers,
} from './enemyAbilities';

// ── Utilities ──────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/** Draw the top card of the encounter deck, cycling the discard if empty. */
function drawEncounterCard(state: GameState): [EncounterCard | null, GameState] {
    if (state.encounterDeck.length === 0) {
        if (state.encounterDiscard.length === 0) return [null, state];
        // Reshuffle discard
        state = {
            ...state,
            encounterDeck: shuffle(state.encounterDiscard),
            encounterDiscard: [],
        };
    }
    const [top, ...rest] = state.encounterDeck;
    return [top, { ...state, encounterDeck: rest }];
}

/** Total threat in the staging area (locations + enemies). */
export function stagingThreat(state: GameState): number {
    return state.stagingArea.reduce((sum, item) => {
        const card = 'card' in item ? item.card : item;
        return sum + (card.threat ?? 0);
    }, 0);
}


// ── Phase step handlers ────────────────────────────────────────────────────

/** RESOURCE PHASE: collect 1 resource per hero, draw 1 card. */
export function stepResource(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];
    const players = state.players.map((p) => {
        const heroes = p.heroes.map((h) => {
            const gained = 1;
            logs.push(`${h.name} gains ${gained} resource (now ${h.resources + gained}).`);
            return { ...h, resources: h.resources + gained };
        });

        // Draw one card
        let hand = [...p.hand];
        let deck = [...p.deck];
        if (deck.length > 0) {
            hand = [...hand, deck[0]];
            deck = deck.slice(1);
            logs.push(`${p.name} draws a card (${hand.length} in hand).`);
        } else {
            logs.push(`${p.name}: deck empty — cannot draw.`);
        }

        return { ...p, heroes, hand, deck };
    });

    return {
        state: { ...state, players, phase: 'planning' },
        log: logs,
    };
}

/** PLANNING PHASE: no automatic engine steps, players play cards manually. */
export function stepPlanning(state: GameState): { state: GameState; log: string[] } {
    return {
        state: { ...state, phase: 'quest' },
        log: ['Planning phase ended.'],
    };
}

/**
 * QUEST PHASE: auto-commit all ready heroes to the quest, then resolve.
 * Net progress = total Willpower − staging area threat.
 */
export function stepQuest(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];

    // Exhaust all ready heroes as "committed to quest"
    const players = state.players.map((p) => ({
        ...p,
        heroes: p.heroes.map((h) => {
            if (!h.exhausted) {
                logs.push(`${h.name} commits to the quest (WP: ${h.willpower ?? 0}).`);
                return { ...h, exhausted: true };
            }
            return h;
        }),
    }));

    const totalWP = players.flatMap((p) => p.heroes).reduce((s, h) => s + (h.willpower ?? 0), 0);

    // Reveal one encounter card per player (Encounter sub-step of Quest)
    let nextState: GameState = { ...state, players };
    const stagingAdditions: EncounterCard[] = [];

    state.players.forEach((_p, _i) => {
        let card: EncounterCard | null;
        [card, nextState] = drawEncounterCard(nextState);
        if (card) {
            stagingAdditions.push(card);
            logs.push(`Encounter revealed: ${card.name} (${card.type_code}).`);
            // Surge: treat enemies with "surge" text by revealing another card (simplified: not implemented here)
        }
    });

    const newStaging = [...nextState.stagingArea, ...stagingAdditions];
    nextState = { ...nextState, stagingArea: newStaging };

    const threat = stagingThreat(nextState);
    const net = totalWP - threat;
    logs.push(`Quest resolution: ${totalWP} WP vs ${threat} threat → net ${net >= 0 ? '+' : ''}${net}.`);

    let questProgress = nextState.questProgress;
    if (net > 0) {
        questProgress = Math.min(questProgress + net, (nextState.currentQuest?.quest_points ?? 99));
        logs.push(`Progress placed: ${net}. Total progress: ${questProgress}/${nextState.currentQuest?.quest_points ?? '?'}.`);
    } else if (net < 0) {
        // Threat raise for each player
        const threatRaise = Math.abs(net);
        nextState = {
            ...nextState,
            players: nextState.players.map((p) => {
                logs.push(`${p.name}'s threat rises by ${threatRaise} (now ${p.threat + threatRaise}).`);
                return { ...p, threat: p.threat + threatRaise };
            }),
        };
    }

    // Check quest completion
    const qp = nextState.currentQuest?.quest_points ?? 0;
    let currentQuest = nextState.currentQuest;
    let questDeck = nextState.questDeck;
    if (qp > 0 && questProgress >= qp) {
        logs.push(`Quest stage complete! Advancing to next stage.`);
        questProgress = 0;
        if (questDeck.length > 0) {
            currentQuest = questDeck[0];
            questDeck = questDeck.slice(1);
            logs.push(`Now on: ${currentQuest.name} (Stage ${currentQuest.stage}).`);
        } else {
            logs.push('All quest stages complete — the players win!');
        }
    }

    return {
        state: {
            ...nextState,
            questProgress,
            currentQuest,
            questDeck,
            phase: 'travel',
        },
        log: logs,
    };
}

/** TRAVEL PHASE: auto-travel to first location in staging area if no active location. */
export function stepTravel(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];

    if (!state.activeLocation) {
        // Find the first location in staging area
        const idx = state.stagingArea.findIndex(
            (item): item is EncounterCard =>
                !('card' in item) && item.type_code === 'location'
        );
        if (idx !== -1) {
            const loc = state.stagingArea[idx] as EncounterCard;
            const newStaging = state.stagingArea.filter((_, i) => i !== idx);
            logs.push(`Traveling to ${loc.name}.`);
            return {
                state: {
                    ...state,
                    stagingArea: newStaging,
                    activeLocation: { card: loc, progress: 0 },
                    phase: 'encounter',
                },
                log: logs,
            };
        }
        logs.push('No location to travel to — skipping Travel phase.');
    } else {
        logs.push(`Active location: ${state.activeLocation.card.name} — no new travel.`);
    }

    return { state: { ...state, phase: 'encounter' }, log: logs };
}

// ── Engagement Helpers ─────────────────────────────────────────────────────

/**
 * "When Engaged" effect result type for compatibility.
 */
export interface EngagementEffect {
    state: GameState;
    log: string[];
}

/**
 * Find the enemy in staging area with the highest engagement cost
 * that is <= the player's threat.
 */
function findHighestQualifyingEnemy(
    stagingArea: GameState['stagingArea'],
    playerThreat: number
): { enemy: EncounterCard; index: number } | null {
    let highestCostEnemy: EncounterCard | null = null;
    let highestCost = -1;
    let highestIndex = -1;

    stagingArea.forEach((item, index) => {
        // Check if it's an enemy (not an ActiveEnemy which has 'card' property)
        if (!('card' in item) && item.type_code === 'enemy') {
            const enemy = item as EncounterCard;
            const cost = enemy.engagement_cost ?? 999;
            if (cost <= playerThreat && cost > highestCost) {
                highestCost = cost;
                highestCostEnemy = enemy;
                highestIndex = index;
            }
        }
    });

    if (highestCostEnemy && highestIndex >= 0) {
        return { enemy: highestCostEnemy, index: highestIndex };
    }
    return null;
}

/**
 * Engage a single enemy with a player.
 * Returns the updated state and log messages.
 */
export function engageEnemy(
    state: GameState,
    enemy: EncounterCard,
    enemyIndex: number,
    playerId: string
): { state: GameState; log: string[] } {
    const logs: string[] = [];
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
        return { state, log: ['Error: Player not found.'] };
    }

    logs.push(`${enemy.name} engages ${player.name}! (Engagement: ${enemy.engagement_cost ?? '?'}, Threat: ${player.threat})`);

    // Create ActiveEnemy and add to player's engaged enemies
    const activeEnemy: ActiveEnemy = {
        card: enemy,
        damage: 0,
        shadowCards: [],
        engagedPlayerId: playerId,
        exhausted: false,
    };

    // Remove enemy from staging area
    const newStagingArea = state.stagingArea.filter((_, i) => i !== enemyIndex);

    // Add enemy to player's engaged enemies
    let nextState: GameState = {
        ...state,
        stagingArea: newStagingArea,
        players: state.players.map((p) =>
            p.id === playerId
                ? { ...p, engagedEnemies: [...p.engagedEnemies, activeEnemy] }
                : p
        ),
    };

    // Resolve "When Engaged" effect using the enemy abilities module
    const engagementEffect = resolveWhenEngaged(nextState, enemy, playerId);
    nextState = engagementEffect.state;
    logs.push(...engagementEffect.log);

    return { state: nextState, log: logs };
}

/**
 * Perform optional engagement - player voluntarily engages an enemy.
 * This ignores the engagement cost check.
 */
export function optionalEngagement(
    state: GameState,
    enemyIndex: number,
    playerId: string
): { state: GameState; log: string[] } {
    const item = state.stagingArea[enemyIndex];
    if (!item || 'card' in item || item.type_code !== 'enemy') {
        return { state, log: ['Error: Invalid enemy selection.'] };
    }

    const enemy = item as EncounterCard;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) {
        return { state, log: ['Error: Player not found.'] };
    }

    const logs: string[] = [];
    logs.push(`${player.name} optionally engages ${enemy.name}.`);

    const result = engageEnemy(state, enemy, enemyIndex, playerId);
    return { state: result.state, log: [...logs, ...result.log.slice(1)] }; // Skip duplicate engage message
}

/** ENCOUNTER PHASE: enemy engagement checks (rules-compliant). */
export function stepEncounter(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];
    let nextState = { ...state };

    const player = nextState.players[0]; // single-player for now
    if (!player) return { state: nextState, log: logs };

    // Step 1: Optional Engagement (handled separately via UI action, not automatic)
    // Players can optionally engage enemies before mandatory engagement checks
    // This is done via the optionalEngagement function called from the UI

    // Step 2: Engagement Checks - engage enemies ITERATIVELY, highest cost first
    logs.push('--- Engagement Checks ---');

    let engagementCount = 0;
    let continueEngagement = true;

    while (continueEngagement) {
        // Find the highest cost enemy that qualifies for engagement
        const qualifying = findHighestQualifyingEnemy(nextState.stagingArea, nextState.players[0].threat);

        if (qualifying) {
            const { enemy, index } = qualifying;
            const result = engageEnemy(nextState, enemy, index, player.id);
            nextState = result.state;
            logs.push(...result.log);
            engagementCount++;
        } else {
            continueEngagement = false;
        }
    }

    if (engagementCount === 0) {
        logs.push('No enemies engaged this round.');
    } else {
        logs.push(`${engagementCount} enemy/enemies engaged this round.`);
    }

    // Stage 2 Forced Effect: If no enemies in play, reveal an encounter card
    if (checkStage2ForcedEffect(nextState)) {
        logs.push('Stage 2 Forced: No enemies in play - revealing an encounter card.');
        let revealedCard: EncounterCard | null;
        [revealedCard, nextState] = drawEncounterCard(nextState);
        if (revealedCard) {
            logs.push(`Revealed: ${revealedCard.name} (${revealedCard.type_code})`);
            if (revealedCard.type_code === 'enemy' || revealedCard.type_code === 'location') {
                nextState = {
                    ...nextState,
                    stagingArea: [...nextState.stagingArea, revealedCard],
                };
                logs.push(`Added ${revealedCard.name} to staging area.`);
            } else if (revealedCard.type_code === 'treachery') {
                // For now, just add to discard - treachery resolution is handled by gameStore
                logs.push(`Treachery ${revealedCard.name} revealed (effect logged but not fully resolved here).`);
                nextState = {
                    ...nextState,
                    encounterDiscard: [...nextState.encounterDiscard, revealedCard],
                };
            }
        } else {
            logs.push('Encounter deck empty - no card to reveal.');
        }
    }

    // Check game over: all heroes defeated (from When Engaged effects like Hummerhorns)
    const allDefeated = nextState.players.every((p) =>
        p.heroes.every((h) => h.damage >= (h.health ?? 99))
    );
    if (allDefeated) {
        logs.push('All heroes are defeated — the players lose!');
        return { state: { ...nextState, phase: 'game_over' }, log: logs };
    }

    return { state: { ...nextState, phase: 'combat' }, log: logs };
}

// ── Shadow Card Helpers ────────────────────────────────────────────────────

/** Parse shadow effect text for attack bonus (e.g., "+1 Attack", "+2 [attack]") */
function parseShadowAttackBonus(shadowText: string | undefined): number {
    if (!shadowText) return 0;

    // Match patterns like "+1 Attack", "+2 [attack]", "gets +3 Attack"
    const match = shadowText.match(/\+(\d+)\s*(?:\[?attack\]?|Attack)/i);
    if (match) {
        return parseInt(match[1], 10);
    }
    return 0;
}

/** Check if shadow effect deals direct damage to defender */
function parseShadowDirectDamage(shadowText: string | undefined): number {
    if (!shadowText) return 0;

    // Match patterns like "deal 1 damage", "deals 2 damage to the defending character"
    const match = shadowText.match(/deals?\s+(\d+)\s+damage/i);
    if (match) {
        return parseInt(match[1], 10);
    }
    return 0;
}

/** COMBAT PHASE: automated attack resolution with shadow cards. */
export function stepCombat(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];
    let nextState = { ...state };

    const player = nextState.players[0];
    if (!player) return { state: nextState, log: logs };

    // ── Step 1: Deal shadow cards to each engaged enemy ──
    logs.push('--- Dealing Shadow Cards ---');
    const enemiesWithShadow: ActiveEnemy[] = [];

    for (const enemy of player.engagedEnemies) {
        let shadowCard: EncounterCard | null;
        [shadowCard, nextState] = drawEncounterCard(nextState);

        if (shadowCard) {
            logs.push(`Shadow card dealt to ${enemy.card.name}.`);
            enemiesWithShadow.push({
                ...enemy,
                shadowCards: [...enemy.shadowCards, shadowCard],
            });
        } else {
            logs.push(`No shadow card available for ${enemy.card.name}.`);
            enemiesWithShadow.push(enemy);
        }
    }

    // Update player's engaged enemies with shadow cards
    nextState = {
        ...nextState,
        players: nextState.players.map((p) =>
            p.id !== player.id ? p : { ...p, engagedEnemies: enemiesWithShadow }
        ),
    };

    // ── Step 2: Enemy attacks with shadow card resolution ──
    logs.push('--- Enemy Attacks ---');
    const aliveHeroes = nextState.players[0].heroes.filter((h) => h.damage < (h.health ?? 99));

    let survivingEnemies: ActiveEnemy[] = [];
    const shadowCardsToDiscard: EncounterCard[] = [];

    for (const enemy of enemiesWithShadow) {
        // Reveal and resolve shadow card
        const shadowCard = enemy.shadowCards[0];
        let attackBonus = 0;
        let directDamage = 0;

        if (shadowCard) {
            const shadowText = shadowCard.shadow;
            if (shadowText) {
                logs.push(`Shadow revealed (${shadowCard.name}): "${shadowText}"`);
                attackBonus = parseShadowAttackBonus(shadowText);
                directDamage = parseShadowDirectDamage(shadowText);

                if (attackBonus > 0) {
                    logs.push(`Shadow effect: ${enemy.card.name} gains +${attackBonus} Attack this attack.`);
                }
                if (directDamage > 0) {
                    logs.push(`Shadow effect: Deals ${directDamage} direct damage to defender.`);
                }
            } else {
                logs.push(`Shadow card (${shadowCard.name}) has no shadow effect.`);
            }
            shadowCardsToDiscard.push(shadowCard);
        }

        // Enemy attacks: damage = (attack + shadow bonus) - defender defense (min 1)
        const defender = aliveHeroes.find((h) => !h.exhausted) ?? aliveHeroes[0];
        if (defender) {
            const baseAttack = enemy.card.attack ?? 1;
            const totalAttack = baseAttack + attackBonus;
            const dmg = Math.max(1, totalAttack - (defender.defense ?? 0)) + directDamage;

            if (attackBonus > 0 || directDamage > 0) {
                logs.push(`${enemy.card.name} attacks ${defender.name}: ${baseAttack}${attackBonus > 0 ? `+${attackBonus}` : ''} ATK vs ${defender.defense ?? 0} DEF${directDamage > 0 ? ` + ${directDamage} direct` : ''} = ${dmg} damage.`);
            } else {
                logs.push(`${enemy.card.name} attacks ${defender.name} for ${dmg} damage.`);
            }

            const newDefenderDamage = defender.damage + dmg;
            const defeated = newDefenderDamage >= (defender.health ?? 99);
            if (defeated) {
                logs.push(`${defender.name} is defeated!`);
            }

            // Update hero in player state
            nextState = {
                ...nextState,
                players: nextState.players.map((p) => {
                    if (p.id !== player.id) return p;
                    return {
                        ...p,
                        heroes: p.heroes.map((h) =>
                            h.code === defender.code
                                ? { ...h, damage: newDefenderDamage, exhausted: true }
                                : h
                        ),
                    };
                }),
            };
        }

        // Player counter-attack: first ready hero attacks enemy
        const attacker = nextState.players[0].heroes.find((h) => !h.exhausted);
        if (attacker) {
            const dmgToEnemy = Math.max(0, (attacker.attack ?? 0) - (enemy.card.defense ?? 0));
            const newEnemyDamage = enemy.damage + dmgToEnemy;
            logs.push(`${attacker.name} attacks ${enemy.card.name} for ${dmgToEnemy} damage.`);

            if (newEnemyDamage >= (enemy.card.health ?? 99)) {
                logs.push(`${enemy.card.name} is destroyed!`);
                nextState = {
                    ...nextState,
                    encounterDiscard: [...nextState.encounterDiscard, enemy.card],
                };
                // Do NOT push to survivingEnemies
            } else {
                // Clear shadow cards from surviving enemy (they're discarded)
                survivingEnemies.push({ ...enemy, damage: newEnemyDamage, shadowCards: [] });
            }

            // Exhaust the attacker
            nextState = {
                ...nextState,
                players: nextState.players.map((p) => {
                    if (p.id !== player.id) return p;
                    return {
                        ...p,
                        heroes: p.heroes.map((h) =>
                            h.code === attacker.code ? { ...h, exhausted: true } : h
                        ),
                    };
                }),
            };
        } else {
            // No attacker — enemy stays (clear shadow cards)
            survivingEnemies.push({ ...enemy, shadowCards: [] });
            logs.push(`No available hero to attack ${enemy.card.name}.`);
        }
    }

    // ── Step 3: Discard all shadow cards ──
    if (shadowCardsToDiscard.length > 0) {
        logs.push(`${shadowCardsToDiscard.length} shadow card(s) discarded.`);
        nextState = {
            ...nextState,
            encounterDiscard: [...nextState.encounterDiscard, ...shadowCardsToDiscard],
        };
    }

    // Update surviving enemies
    nextState = {
        ...nextState,
        players: nextState.players.map((p) => {
            if (p.id !== player.id) return p;
            return { ...p, engagedEnemies: survivingEnemies };
        }),
    };

    // Check game over: all heroes defeated
    const allDefeated = nextState.players.every((p) =>
        p.heroes.every((h) => h.damage >= (h.health ?? 99))
    );
    if (allDefeated) {
        logs.push('All heroes are defeated — the players lose!');
        return { state: { ...nextState, phase: 'game_over' }, log: logs };
    }

    return { state: { ...nextState, phase: 'refresh' }, log: logs };
}

/** REFRESH PHASE: ready all exhausted characters and attachments, raise threat by 1, clear round-based modifiers. */
export function stepRefresh(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = [];

    // Clear round-based attack modifiers from engaged enemies (e.g., Forest Spider +1)
    let nextState = clearRoundBasedModifiers(state);

    // Progress active location
    let activeLocation = nextState.activeLocation;
    let encounterDiscard = [...nextState.encounterDiscard];

    if (activeLocation) {
        const qp = activeLocation.card.quest_points ?? 1;
        // Location explored when progress >= quest_points
        if (activeLocation.progress >= qp) {
            logs.push(`${activeLocation.card.name} fully explored and removed.`);
            encounterDiscard = [...encounterDiscard, activeLocation.card];
            activeLocation = null;
        }
    }

    const players = state.players.map((p) => {
        const newThreat = Math.min(50, p.threat + 1);
        logs.push(`${p.name}'s threat raised to ${newThreat}.`);

        // Ready heroes and their attachments
        const readiedHeroes = p.heroes.map((h) => {
            // Ready all attachments on this hero
            const readiedAttachments = h.attachments.map((att) => {
                if (att.exhausted) {
                    logs.push(`${att.name} (on ${h.name}) readied.`);
                    return { ...att, exhausted: false };
                }
                return att;
            });

            return {
                ...h,
                exhausted: false,
                attachments: readiedAttachments,
            };
        });

        return {
            ...p,
            threat: newThreat,
            heroes: readiedHeroes,
            allies: p.allies.map((a) => ({ ...a, exhausted: false })),
        };
    });

    // Check defeat: any player at threat 50
    const threatened = players.filter((p) => p.threat >= 50);
    if (threatened.length > 0) {
        logs.push(`${threatened.map((p) => p.name).join(', ')} eliminated by threat!`);
        return {
            state: { ...state, players, phase: 'game_over', activeLocation, encounterDiscard },
            log: logs,
        };
    }

    logs.push('All characters and attachments readied. Round complete.');
    return {
        state: {
            ...state,
            players,
            phase: 'resource',
            round: state.round + 1,
            activeLocation,
            encounterDiscard,
        },
        log: logs,
    };
}

// ── Main dispatch ──────────────────────────────────────────────────────────

const PHASE_HANDLERS: Partial<
    Record<GamePhase, (s: GameState) => { state: GameState; log: string[] }>
> = {
    resource: stepResource,
    planning: stepPlanning,
    quest: stepQuest,
    travel: stepTravel,
    encounter: stepEncounter,
    combat: stepCombat,
    refresh: stepRefresh,
};

export function advancePhase(state: GameState): { state: GameState; log: string[] } {
    const handler = PHASE_HANDLERS[state.phase];
    if (!handler) return { state, log: [`No handler for phase: ${state.phase}`] };
    return handler(state);
}

export { shuffle };
