/**
 * Zustand game store — bridges the pure engine with React components.
 *
 * Holds the full GameState and exposes actions that call the engine.
 */

import { create } from 'zustand';
import type { GameState, GamePhase, EncounterCard, PlayerCard, Hero, CombatState, CharacterRef, PlayerState } from '../engine/types';
import { advancePhase, shuffle, optionalEngagement } from '../engine/gameEngine';
import { resolveTreachery, isTreacheryCard } from '../engine/treacheryEffects';
import {
    resolveQuestStageTransition,
    getEncounterCardsToReveal,
    checkVictoryCondition,
} from '../engine/questStageEffects';
import { resolveKeywords } from '../engine/keywords';
import { resolveEventEffect, eventRequiresTarget, getEventDefinition, type EventTarget } from '../engine/eventEffects';
import {
    canPayTravelCost,
    resolveTravelCost,
    resolveAfterTraveling,
    hasWhileActiveEffect,
    getWhileActiveEffectDescription,
} from '../engine/locationAbilities';
import { resolveEnemyWhenRevealed } from '../engine/enemyAbilities';
import {
    activateAbility,
    getAbilities,
    getAbilityById,
    canPayAbilityCost,
    canUseAbility,
    applyPassiveAbilities,
} from '../engine/cardAbilities';
import type { LogEntry } from '../components/LogPanel';
import { createLogEntry } from '../components/LogPanel';
import { QUEST_STAGES, MIRKWOOD_ENCOUNTER_DECK } from '../data/mirkwoodScenario';

// ── Store shape ────────────────────────────────────────────────────────────

interface PlayCardResult {
    success: boolean;
    error?: string;
    /** For events that need targeting, return targeting info instead of resolving immediately */
    requiresTarget?: boolean;
    targetType?: string;
    targetDescription?: string;
    /** For enter_play abilities that require a choice (e.g., Gandalf) */
    requiresChoice?: boolean;
    choices?: string[];
    choiceCallback?: string;  // Ability ID to call with the chosen index
    playedCardCode?: string;  // Card code that was just played
}

interface GameStore {
    gameState: GameState;
    log: LogEntry[];
    mulliganAvailable: boolean;  // Tracks if mulligan can still be taken
    showMulliganModal: boolean;  // Controls modal visibility

    // Actions
    initGame: (heroes: PlayerCard[], playerDeck: PlayerCard[]) => void;
    nextPhase: () => void;
    adjustThreat: (playerId: string, delta: number) => void;
    exhaustHero: (playerId: string, heroCode: string) => void;
    readyHero: (playerId: string, heroCode: string) => void;
    spendResource: (playerId: string, heroCode: string, amount: number) => void;
    gainResource: (playerId: string, heroCode: string, amount: number) => void;
    travelToLocation: (location: EncounterCard) => void;
    skipTravel: () => void;
    // Combat actions
    placeProgress: (amount: number) => void;
    addToLog: (msg: string, type?: LogEntry['type']) => void;
    playCard: (playerId: string, cardIndex: number, targetHeroCode?: string, eventTarget?: EventTarget) => PlayCardResult;
    // Ally actions
    exhaustAlly: (playerId: string, allyIndex: number) => void;
    readyAlly: (playerId: string, allyIndex: number) => void;
    damageAlly: (playerId: string, allyIndex: number, amount: number) => void;
    healAlly: (playerId: string, allyIndex: number, amount: number) => void;
    // Mulligan actions
    takeMulligan: (playerId: string) => void;
    keepHand: () => void;
    // Combat actions
    startCombat: () => void;
    selectDefender: (ref: CharacterRef) => void;
    confirmDefense: () => void;
    skipDefense: () => void;
    toggleAttacker: (ref: CharacterRef) => void;
    confirmAttack: () => void;
    skipAttack: () => void;
    // Quest actions
    startQuestCommit: () => void;
    toggleQuestCommit: (ref: CharacterRef) => void;
    confirmQuestCommit: () => void;
    revealStaging: () => void;
    resolveQuest: () => void;
    // Engagement actions
    optionallyEngageEnemy: (enemyIndex: number) => void;
    // Card ability actions
    activateCardAbility: (playerId: string, abilityId: string, sourceHeroCode?: string, choiceIndex?: number, targetIndex?: number) => void;
    getAvailableAbilities: (playerId: string, heroCode: string) => { id: string; name: string; description: string; canActivate: boolean; reason?: string }[];
    // Attachment actions
    toggleAttachmentExhaust: (playerId: string, heroCode: string, attachmentIndex: number) => void;
}

// ── Setup helper ───────────────────────────────────────────────────────────

function buildHero(card: PlayerCard, id: string): Hero {
    return {
        ...card,
        type_code: 'hero' as const,
        currentHealth: card.health ?? 0,
        damage: 0,
        exhausted: false,
        resources: 0,
        attachments: [],
        id,
    } as Hero;
}

function setupGame(heroes: PlayerCard[], playerDeck: PlayerCard[]): GameState {
    // Shuffle encounter deck and expand by quantity
    const expandedEncounter: EncounterCard[] = MIRKWOOD_ENCOUNTER_DECK.flatMap((c) =>
        Array.from({ length: c.quantity }, () => ({ ...c }))
    );
    const shuffledEncounter = shuffle(expandedEncounter);

    // Quest deck: stages 2 and 3 (stage 1 is the current quest)
    const [firstQuest, ...remainingQuests] = QUEST_STAGES;

    // Starting threat = sum of hero threat costs
    const startingThreat = heroes.reduce((s, h) => s + (h.threat ?? 0), 0);

    const player = {
        id: 'player1',
        name: 'Player 1',
        threat: startingThreat,
        hand: [],
        deck: shuffle(playerDeck.flatMap((c) => Array.from({ length: Math.min(c.quantity, 3) }, () => ({ ...c })))),
        discard: [],
        heroes: heroes.map((h, i) => buildHero(h, `hero-${i}`)),
        allies: [],
        engagedEnemies: [],
    };

    return {
        phase: 'setup' as GamePhase,
        round: 0,
        players: [player],
        encounterDeck: shuffledEncounter,
        encounterDiscard: [],
        stagingArea: [],
        activeLocation: null,
        questDeck: remainingQuests,
        currentQuest: firstQuest,
        questProgress: 0,
        firstPlayerId: 'player1',
        combatState: null,
        questCommitment: [],
    };
}

function runSetup(state: GameState): { state: GameState; log: string[] } {
    const logs: string[] = ['Setting up Passage Through Mirkwood…'];

    // Find and stage 1 Forest Spider + 1 Old Forest Road
    let deck = [...state.encounterDeck];
    const staged: EncounterCard[] = [];

    const spiderIdx = deck.findIndex((c) => c.name === 'Forest Spider');
    if (spiderIdx !== -1) { staged.push(deck[spiderIdx]); deck.splice(spiderIdx, 1); }

    const roadIdx = deck.findIndex((c) => c.name === 'Old Forest Road');
    if (roadIdx !== -1) { staged.push(deck[roadIdx]); deck.splice(roadIdx, 1); }

    deck = shuffle(deck); // reshuffle after search

    staged.forEach((c) => logs.push(`Setup: ${c.name} added to staging area.`));

    // Draw 6 cards into each player's starting hand (per rules section 5)
    const STARTING_HAND_SIZE = 6;
    const players = state.players.map((p) => {
        const cardsToDraw = Math.min(STARTING_HAND_SIZE, p.deck.length);
        const drawnCards = p.deck.slice(0, cardsToDraw);
        const remainingDeck = p.deck.slice(cardsToDraw);
        logs.push(`${p.name} draws ${cardsToDraw} cards for starting hand.`);
        return {
            ...p,
            hand: drawnCards,
            deck: remainingDeck,
        };
    });

    logs.push('Encounter deck shuffled. Round 1 begins.');

    return {
        state: {
            ...state,
            players,
            encounterDeck: deck,
            stagingArea: staged,
            phase: 'resource',
            round: 1,
        },
        log: logs,
    };
}

// ── Store ──────────────────────────────────────────────────────────────────

let _logSeq = 0;
function makeLog(state: GameState, msg: string, type: LogEntry['type'] = 'info'): LogEntry {
    return { ...createLogEntry(state.round, state.phase, msg, type), id: `lg-${++_logSeq}` };
}

export const useGameStore = create<GameStore>((set, get) => ({
    gameState: {} as GameState, // will be populated by initGame
    log: [],
    mulliganAvailable: true,  // Can take mulligan at start
    showMulliganModal: false, // Hidden by default

    initGame: (heroes, playerDeck) => {
        const raw = setupGame(heroes, playerDeck);
        const { state, log } = runSetup(raw);
        set({
            gameState: state,
            log: log.map((msg, i) =>
                createLogEntry(state.round, state.phase, msg, i === 0 ? 'setup' : 'phase')
            ),
            mulliganAvailable: true,
            showMulliganModal: true, // Show mulligan modal after setup
        });
    },

    nextPhase: () => {
        const { gameState, log } = get();

        // If entering combat phase, use manual combat instead of automatic
        if (gameState.phase === 'encounter') {
            // First run the encounter phase to engage enemies
            const { state: nextState, log: newLogs } = advancePhase(gameState);
            const newEntries = newLogs.map((msg) => {
                const type: LogEntry['type'] =
                    msg.includes('threat') ? 'threat' :
                        msg.includes('resource') ? 'resource' :
                            msg.includes('damage') || msg.includes('attacked') || msg.includes('defeated') ? 'damage' :
                                msg.includes('phase') || msg.includes('stage') ? 'phase' : 'info';
                return makeLog(nextState, msg, type);
            });
            set({ gameState: nextState, log: [...log, ...newEntries] });

            // Now start manual combat
            get().startCombat();
            return;
        }

        // Skip automatic combat phase - it's handled manually
        if (gameState.phase === 'combat' || gameState.phase === 'combat_defend' || gameState.phase === 'combat_attack') {
            return; // Combat is handled by the CombatPanel
        }

        const { state: next, log: newLogs } = advancePhase(gameState);
        const newEntries = newLogs.map((msg) => {
            const type: LogEntry['type'] =
                msg.includes('threat') ? 'threat' :
                    msg.includes('resource') ? 'resource' :
                        msg.includes('damage') || msg.includes('attacked') || msg.includes('defeated') ? 'damage' :
                            msg.includes('phase') || msg.includes('stage') ? 'phase' : 'info';
            return makeLog(next, msg, type);
        });
        set({ gameState: next, log: [...log, ...newEntries] });

        // Auto-skip Travel phase if there's nothing to do
        if (next.phase === 'travel') {
            const hasActiveLocation = !!next.activeLocation;
            const hasLocationsInStaging = next.stagingArea.some(
                (item) => !('engagedPlayerId' in item) && (item as EncounterCard).type_code === 'location'
            );

            if (hasActiveLocation || !hasLocationsInStaging) {
                const reason = hasActiveLocation
                    ? 'Auto-skipped Travel (active location exists).'
                    : 'Auto-skipped Travel (no locations in staging).';

                // Use setTimeout to avoid state update during render
                setTimeout(() => {
                    get().skipTravel();
                    const currentLog = get().log;
                    set({ log: [...currentLog.slice(0, -1), { ...currentLog[currentLog.length - 1], message: reason }] });
                }, 0);
            }
        }
    },

    adjustThreat: (playerId, delta) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id === playerId
                ? { ...p, threat: Math.max(0, Math.min(50, p.threat + delta)) }
                : p
        );
        const next = { ...gameState, players };
        const msg = `Threat ${delta > 0 ? 'raised' : 'reduced'} by ${Math.abs(delta)} (now ${players.find((p) => p.id === playerId)?.threat}).`;
        set({ gameState: next, log: [...log, makeLog(next, msg, 'threat')] });
    },

    exhaustHero: (playerId, heroCode) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                heroes: p.heroes.map((h) =>
                    h.code === heroCode ? { ...h, exhausted: true } : h
                ),
            }
        );
        const hero = players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === heroCode);
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${hero?.name} exhausted.`)] });
    },

    readyHero: (playerId, heroCode) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                heroes: p.heroes.map((h) =>
                    h.code === heroCode ? { ...h, exhausted: false } : h
                ),
            }
        );
        const hero = players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === heroCode);
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${hero?.name} readied.`)] });
    },

    spendResource: (playerId, heroCode, amount) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                heroes: p.heroes.map((h) =>
                    h.code === heroCode ? { ...h, resources: Math.max(0, h.resources - amount) } : h
                ),
            }
        );
        const hero = players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === heroCode);
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${hero?.name} spent ${amount} resource (${hero?.resources} left).`, 'resource')] });
    },

    gainResource: (playerId, heroCode, amount) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                heroes: p.heroes.map((h) =>
                    h.code === heroCode ? { ...h, resources: h.resources + amount } : h
                ),
            }
        );
        const hero = players.find((p) => p.id === playerId)?.heroes.find((h) => h.code === heroCode);
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${hero?.name} gained ${amount} resource.`, 'resource')] });
    },

    travelToLocation: (location) => {
        const { gameState, log } = get();
        const msgs: string[] = [];
        const playerId = gameState.firstPlayerId;

        // Validate: must be in travel phase
        if (gameState.phase !== 'travel') {
            msgs.push('Can only travel during Travel phase.');
            set({ log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))] });
            return;
        }

        // Validate: cannot travel if there's already an active location
        if (gameState.activeLocation) {
            msgs.push(`Cannot travel: ${gameState.activeLocation.card.name} is already the active location.`);
            set({ log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))] });
            return;
        }

        // Validate: location must be in staging area
        const locationIndex = gameState.stagingArea.findIndex(
            (item) => !('engagedPlayerId' in item) && (item as EncounterCard).code === location.code
        );
        if (locationIndex === -1) {
            msgs.push('Location not found in staging area.');
            set({ log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))] });
            return;
        }

        // Check if travel cost can be paid
        const canPay = canPayTravelCost(gameState, location, playerId);
        if (!canPay.canPay) {
            msgs.push(`Cannot travel to ${location.name}: ${canPay.reason}`);
            set({ log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))] });
            return;
        }

        // Resolve travel cost (if any)
        let updatedState = gameState;
        const travelCostResult = resolveTravelCost(updatedState, location, playerId);
        if (!travelCostResult.success) {
            msgs.push(travelCostResult.error ?? 'Failed to pay travel cost.');
            set({ log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))] });
            return;
        }
        updatedState = travelCostResult.state;
        msgs.push(...travelCostResult.log);

        // Remove location from staging area
        const newStaging = updatedState.stagingArea.filter((_, i) => i !== locationIndex);

        msgs.push(`🚶 Traveled to ${location.name}.`);

        // Set location as active
        let next: GameState = {
            ...updatedState,
            stagingArea: newStaging,
            activeLocation: { card: location, progress: 0 },
            phase: 'encounter' as GamePhase,
        };

        // Resolve "after traveling" effects (Response abilities)
        const afterTravelingResult = resolveAfterTraveling(next, location, playerId);
        if (afterTravelingResult.success) {
            next = afterTravelingResult.state;
            msgs.push(...afterTravelingResult.log);
        }

        // Check for "while active" effects and log them
        if (hasWhileActiveEffect(next)) {
            const whileActiveDesc = getWhileActiveEffectDescription(next);
            if (whileActiveDesc) {
                msgs.push(`⚠️ While ${location.name} is active: ${whileActiveDesc}`);
            }
        }

        set({ gameState: next, log: [...log, ...msgs.map((m) => makeLog(next, m, 'info'))] });
    },

    skipTravel: () => {
        const { gameState, log } = get();
        const { state: next, log: newLogs } = advancePhase(gameState);
        set({
            gameState: next,
            log: [...log, ...newLogs.map((m) => makeLog(next, m, 'info')), makeLog(next, 'Skipped travel phase.', 'info')],
        });
    },

    placeProgress: (amount) => {
        const { gameState, log } = get();
        let { questProgress, activeLocation, currentQuest, questDeck, encounterDiscard } = gameState;

        const msgs: string[] = [];

        // Progress fills active location first
        if (activeLocation) {
            const remaining = (activeLocation.card.quest_points ?? 0) - activeLocation.progress;
            const toLocation = Math.min(amount, remaining);
            activeLocation = { ...activeLocation, progress: activeLocation.progress + toLocation };
            amount -= toLocation;
            msgs.push(`Placed ${toLocation} progress on ${activeLocation.card.name} (${activeLocation.progress}/${activeLocation.card.quest_points}).`);

            if (activeLocation.progress >= (activeLocation.card.quest_points ?? 0)) {
                msgs.push(`${activeLocation.card.name} explored!`);
                encounterDiscard = [...encounterDiscard, activeLocation.card];
                activeLocation = null;
            }
        }

        // Remaining goes to quest
        if (amount > 0) {
            questProgress += amount;
            msgs.push(`Placed ${amount} progress on quest (${questProgress}/${currentQuest?.quest_points ?? '?'}).`);

            if (currentQuest && questProgress >= (currentQuest.quest_points ?? 0)) {
                msgs.push(`Quest stage "${currentQuest.name}" complete!`);
                questProgress = 0;
                if (questDeck.length > 0) {
                    currentQuest = questDeck[0];
                    questDeck = questDeck.slice(1);
                    msgs.push(`Now on: ${currentQuest.name} (Stage ${currentQuest.stage}).`);
                }
            }
        }

        const next = { ...gameState, questProgress, activeLocation, currentQuest, questDeck, encounterDiscard };
        set({ gameState: next, log: [...log, ...msgs.map((m) => makeLog(next, m, 'info'))] });
    },

    addToLog: (msg, type = 'info') => {
        const { gameState, log } = get();
        set({ log: [...log, makeLog(gameState, msg, type)] });
    },

    playCard: (playerId, cardIndex, targetHeroCode, eventTarget) => {
        const { gameState, log } = get();

        // Validate phase - can only play cards during Planning phase
        if (gameState.phase !== 'planning') {
            return { success: false, error: 'Cards can only be played during the Planning phase.' };
        }

        // Find the player
        const player = gameState.players.find((p) => p.id === playerId);
        if (!player) {
            return { success: false, error: 'Player not found.' };
        }

        // Find the card in hand
        const card = player.hand[cardIndex];
        if (!card) {
            return { success: false, error: 'Card not found in hand.' };
        }

        const cost = card.cost ?? 0;
        const sphere = card.sphere_code;

        // Calculate available resources from matching sphere heroes (or any hero for neutral)
        const getAvailableResources = (): { total: number; heroesWithResources: Hero[] } => {
            const matchingHeroes = player.heroes.filter((h) => {
                if (sphere === 'neutral') return true; // Neutral cards can use any resources
                return h.sphere_code === sphere;
            });
            const total = matchingHeroes.reduce((sum, h) => sum + h.resources, 0);
            return { total, heroesWithResources: matchingHeroes.filter((h) => h.resources > 0) };
        };

        const { total: availableResources } = getAvailableResources();

        // Validate resources
        if (availableResources < cost) {
            return {
                success: false,
                error: `Not enough resources. Need ${cost} ${sphere} resources, have ${availableResources}.`,
            };
        }

        // Spend resources (from matching sphere heroes, starting with highest resources)
        let remainingCost = cost;
        const updatedHeroes = player.heroes.map((h) => {
            if (remainingCost <= 0) return h;
            if (sphere !== 'neutral' && h.sphere_code !== sphere) return h;

            const toSpend = Math.min(h.resources, remainingCost);
            remainingCost -= toSpend;
            return { ...h, resources: h.resources - toSpend };
        });

        // Remove card from hand
        const updatedHand = player.hand.filter((_, i) => i !== cardIndex);

        // Handle card by type
        const msgs: string[] = [];
        let updatedAllies = [...player.allies];
        let updatedDiscard = [...player.discard];

        switch (card.type_code) {
            case 'ally': {
                // Add ally to play
                const newAlly = {
                    ...card,
                    exhausted: false,
                    damage: 0,
                };
                updatedAllies = [...updatedAllies, newAlly];
                msgs.push(`${player.name} plays ${card.name} (Ally) for ${cost} resources.`);

                // Check for enter_play abilities (e.g., Gandalf)
                const enterPlayAbilities = getAbilities(card.code).filter(
                    (a) => a.type === 'enter_play' && a.trigger === 'on_enter_play'
                );

                if (enterPlayAbilities.length > 0) {
                    const ability = enterPlayAbilities[0]; // Take first enter_play ability

                    // If it requires a choice, return that info
                    if (ability.effect.type === 'choice') {
                        // Update the game state first (ally is in play)
                        const playersWithAlly = gameState.players.map((p) =>
                            p.id !== playerId
                                ? p
                                : {
                                      ...p,
                                      hand: updatedHand,
                                      allies: updatedAllies,
                                      discard: updatedDiscard,
                                  }
                        );

                        const nextState = { ...gameState, players: playersWithAlly };
                        set({
                            gameState: nextState,
                            log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'info'))],
                        });

                        return {
                            success: true,
                            requiresChoice: true,
                            choices: ability.effect.choiceDescriptions ?? [],
                            choiceCallback: ability.id,
                            playedCardCode: card.code,
                        };
                    }
                }
                break;
            }

            case 'attachment': {
                // Attachments require a target hero
                if (!targetHeroCode) {
                    return { success: false, error: 'Attachment requires a target hero.' };
                }

                const targetHero = updatedHeroes.find((h) => h.code === targetHeroCode);
                if (!targetHero) {
                    return { success: false, error: 'Target hero not found.' };
                }

                // Add full attachment card to hero (for display)
                const attachedCard = { ...card, exhausted: false };
                const heroesWithAttachment = updatedHeroes.map((h) =>
                    h.code === targetHeroCode
                        ? { ...h, attachments: [...h.attachments, attachedCard] }
                        : h
                );

                msgs.push(`${player.name} attaches ${card.name} to ${targetHero.name} for ${cost} resources.`);

                // Update players with attachment
                const playersWithAttachment = gameState.players.map((p) =>
                    p.id !== playerId
                        ? p
                        : {
                            ...p,
                            hand: updatedHand,
                            heroes: heroesWithAttachment,
                            discard: updatedDiscard,
                        }
                );

                const nextState = { ...gameState, players: playersWithAttachment };
                set({
                    gameState: nextState,
                    log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'info'))],
                });
                return { success: true };
            }

            case 'event': {
                // Check if event requires a target and we don't have one yet
                const eventDef = getEventDefinition(card.code);

                // First, check if the event can be played at all
                if (eventDef && eventDef.canPlay) {
                    const canPlayResult = eventDef.canPlay(gameState, playerId);
                    if (!canPlayResult.canPlay) {
                        return { success: false, error: canPlayResult.reason ?? 'Cannot play this event now.' };
                    }
                }

                // If event requires target and we don't have one yet
                if (eventRequiresTarget(card) && !eventTarget) {
                    const targetDef = eventDef?.target;
                    if (targetDef) {
                        return {
                            success: false,
                            requiresTarget: true,
                            targetType: targetDef.type,
                            targetDescription: targetDef.description,
                        };
                    }
                }

                // Resolve the event effect
                const eventResult = resolveEventEffect(gameState, card, playerId, eventTarget);

                if (!eventResult.success) {
                    return { success: false, error: eventResult.error ?? 'Event failed.' };
                }

                // Apply the event effect result to state
                const stateAfterEvent = eventResult.state;
                const eventPlayer = stateAfterEvent.players.find((p: PlayerState) => p.id === playerId);
                if (eventPlayer) {
                    updatedHeroes.length = 0;
                    updatedHeroes.push(...eventPlayer.heroes);
                    updatedAllies.length = 0;
                    updatedAllies.push(...eventPlayer.allies);
                }

                // Events go to discard after playing
                updatedDiscard = [...updatedDiscard, card];
                msgs.push(`${player.name} plays ${card.name} (Event) for ${cost} resources.`);
                msgs.push(...eventResult.log);

                // Handle end-of-phase effects (like Sneak Attack)
                // TODO: Track these for end-of-phase cleanup

                // Update with event result state
                const playersAfterEvent = stateAfterEvent.players.map((p: PlayerState) =>
                    p.id !== playerId
                        ? p
                        : {
                            ...p,
                            hand: updatedHand,
                            heroes: updatedHeroes.length > 0 ? updatedHeroes : p.heroes,
                            allies: updatedAllies.length > 0 ? updatedAllies : p.allies,
                            discard: updatedDiscard,
                            engagedEnemies: p.engagedEnemies,
                        }
                );

                const nextStateAfterEvent = {
                    ...stateAfterEvent,
                    players: playersAfterEvent,
                };
                set({
                    gameState: nextStateAfterEvent,
                    log: [...log, ...msgs.map((m) => makeLog(nextStateAfterEvent, m, 'info'))],
                });
                return { success: true };
            }

            default:
                return { success: false, error: `Cannot play card of type: ${card.type_code}` };
        }

        // Update player state
        const updatedPlayers = gameState.players.map((p) =>
            p.id !== playerId
                ? p
                : {
                    ...p,
                    hand: updatedHand,
                    heroes: updatedHeroes,
                    allies: updatedAllies,
                    discard: updatedDiscard,
                }
        );

        const nextState = { ...gameState, players: updatedPlayers };
        set({
            gameState: nextState,
            log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'info'))],
        });

        return { success: true };
    },

    exhaustAlly: (playerId, allyIndex) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                allies: p.allies.map((a, i) =>
                    i === allyIndex ? { ...a, exhausted: true } : a
                ),
            }
        );
        const ally = players.find((p) => p.id === playerId)?.allies[allyIndex];
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${ally?.name} exhausted.`)] });
    },

    readyAlly: (playerId, allyIndex) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                allies: p.allies.map((a, i) =>
                    i === allyIndex ? { ...a, exhausted: false } : a
                ),
            }
        );
        const ally = players.find((p) => p.id === playerId)?.allies[allyIndex];
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${ally?.name} readied.`)] });
    },

    damageAlly: (playerId, allyIndex, amount) => {
        const { gameState, log } = get();
        const player = gameState.players.find((p) => p.id === playerId);
        if (!player) return;

        const ally = player.allies[allyIndex];
        if (!ally) return;

        const newDamage = ally.damage + amount;
        const maxHp = ally.health ?? 1;
        const isDestroyed = newDamage >= maxHp;

        let updatedAllies = player.allies.map((a, i) =>
            i === allyIndex ? { ...a, damage: newDamage } : a
        );

        const msgs: string[] = [`${ally.name} takes ${amount} damage (${newDamage}/${maxHp}).`];

        // If ally is destroyed, remove from play and add to discard
        let updatedDiscard = [...player.discard];
        if (isDestroyed) {
            msgs.push(`${ally.name} is destroyed!`);
            updatedAllies = updatedAllies.filter((_, i) => i !== allyIndex);
            updatedDiscard = [...updatedDiscard, ally];
        }

        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                allies: updatedAllies,
                discard: updatedDiscard,
            }
        );

        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, ...msgs.map((m) => makeLog(next, m, 'damage'))] });
    },

    healAlly: (playerId, allyIndex, amount) => {
        const { gameState, log } = get();
        const players = gameState.players.map((p) =>
            p.id !== playerId ? p : {
                ...p,
                allies: p.allies.map((a, i) =>
                    i === allyIndex ? { ...a, damage: Math.max(0, a.damage - amount) } : a
                ),
            }
        );
        const ally = players.find((p) => p.id === playerId)?.allies[allyIndex];
        const next = { ...gameState, players };
        set({ gameState: next, log: [...log, makeLog(next, `${ally?.name} healed ${amount} damage (${ally?.damage} remaining).`)] });
    },

    takeMulligan: (playerId) => {
        const { gameState, log, mulliganAvailable } = get();

        if (!mulliganAvailable) {
            return; // Can only mulligan once
        }

        const player = gameState.players.find((p) => p.id === playerId);
        if (!player) return;

        // Shuffle hand back into deck
        const combinedDeck = shuffle([...player.deck, ...player.hand]);

        // Draw 6 new cards
        const STARTING_HAND_SIZE = 6;
        const newHand = combinedDeck.slice(0, STARTING_HAND_SIZE);
        const newDeck = combinedDeck.slice(STARTING_HAND_SIZE);

        const updatedPlayers = gameState.players.map((p) =>
            p.id !== playerId ? p : { ...p, hand: newHand, deck: newDeck }
        );

        const next = { ...gameState, players: updatedPlayers };
        const msg = `${player.name} takes a mulligan - shuffles hand back and draws ${STARTING_HAND_SIZE} new cards.`;

        set({
            gameState: next,
            log: [...log, makeLog(next, msg, 'info')],
            mulliganAvailable: false, // Disable further mulligans
            showMulliganModal: false, // Close the modal
        });
    },

    keepHand: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        const msg = `${player?.name ?? 'Player'} keeps their starting hand.`;

        set({
            log: [...log, makeLog(gameState, msg, 'info')],
            mulliganAvailable: false, // Disable mulligan option
            showMulliganModal: false, // Close the modal
        });
    },

    // ══════════════════════════════════════════════════════════════════════════
    // Combat Actions
    // ══════════════════════════════════════════════════════════════════════════

    startCombat: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];

        if (!player || player.engagedEnemies.length === 0) {
            // No enemies engaged, skip to refresh
            const next = { ...gameState, phase: 'refresh' as GamePhase, combatState: null };
            set({
                gameState: next,
                log: [...log, makeLog(next, 'No enemies engaged. Skipping combat phase.', 'phase')],
            });
            return;
        }

        // Deal shadow cards to all engaged enemies
        const msgs: string[] = ['--- Combat Phase Begin ---', '--- Dealing Shadow Cards ---'];
        let encounterDeck = [...gameState.encounterDeck];
        let encounterDiscard = [...gameState.encounterDiscard];

        const enemiesWithShadow = player.engagedEnemies.map((enemy) => {
            if (encounterDeck.length === 0 && encounterDiscard.length > 0) {
                // Reshuffle discard into deck
                encounterDeck = shuffle(encounterDiscard);
                encounterDiscard = [];
                msgs.push('Encounter discard reshuffled into deck.');
            }

            if (encounterDeck.length > 0) {
                const [shadowCard, ...rest] = encounterDeck;
                encounterDeck = rest;
                msgs.push(`Shadow card dealt to ${enemy.card.name}.`);
                return { ...enemy, shadowCards: [...enemy.shadowCards, shadowCard] };
            } else {
                msgs.push(`No shadow card available for ${enemy.card.name}.`);
                return enemy;
            }
        });

        const updatedPlayer = { ...player, engagedEnemies: enemiesWithShadow };
        const combatState: CombatState = {
            currentEnemyIndex: 0,
            phase: 'enemy_attacks',
            selectedDefender: null,
            selectedAttackers: [],
            shadowRevealed: false,
            enemiesResolved: [],
        };

        const next: GameState = {
            ...gameState,
            phase: 'combat_defend',
            encounterDeck,
            encounterDiscard,
            players: gameState.players.map((p) => (p.id === player.id ? updatedPlayer : p)),
            combatState,
        };

        set({
            gameState: next,
            log: [...log, ...msgs.map((m) => makeLog(next, m, 'info'))],
        });
    },

    selectDefender: (ref: CharacterRef) => {
        const { gameState } = get();
        if (!gameState.combatState) return;

        const next: GameState = {
            ...gameState,
            combatState: {
                ...gameState.combatState,
                selectedDefender: ref,
            },
        };
        set({ gameState: next });
    },

    confirmDefense: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        const combatState = gameState.combatState;
        if (!player || !combatState) return;

        const enemyIndex = combatState.currentEnemyIndex;
        const enemy = player.engagedEnemies[enemyIndex];
        if (!enemy) return;

        const msgs: string[] = [];
        let nextState = { ...gameState };

        // Reveal shadow card
        const shadowCard = enemy.shadowCards[0];
        let attackBonus = 0;
        let directDamage = 0;

        if (shadowCard?.shadow) {
            msgs.push(`Shadow revealed (${shadowCard.name}): "${shadowCard.shadow}"`);
            // Parse shadow effects
            const attackMatch = shadowCard.shadow.match(/\+(\d+)\s*(?:\[?attack\]?|Attack)/i);
            if (attackMatch) attackBonus = parseInt(attackMatch[1], 10);
            const damageMatch = shadowCard.shadow.match(/deals?\s+(\d+)\s+damage/i);
            if (damageMatch) directDamage = parseInt(damageMatch[1], 10);
            if (attackBonus > 0) msgs.push(`Shadow effect: +${attackBonus} Attack`);
            if (directDamage > 0) msgs.push(`Shadow effect: ${directDamage} direct damage`);
        } else if (shadowCard) {
            msgs.push(`Shadow card (${shadowCard.name}) has no shadow effect.`);
        }

        const defender = combatState.selectedDefender;
        const enemyAttack = (enemy.card.attack ?? 0) + attackBonus;

        if (defender) {
            // Defended attack
            let defenderDefense = 0;
            let defenderName = '';
            let defenderHealth = 0;
            let defenderDamage = 0;

            if (defender.type === 'hero') {
                const hero = player.heroes.find((h) => h.code === defender.code);
                if (hero) {
                    defenderDefense = hero.defense ?? 0;
                    defenderName = hero.name;
                    defenderHealth = hero.health ?? 0;
                    defenderDamage = hero.damage;
                }
            } else {
                const ally = player.allies[defender.index];
                if (ally) {
                    defenderDefense = ally.defense ?? 0;
                    defenderName = ally.name;
                    defenderHealth = ally.health ?? 0;
                    defenderDamage = ally.damage;
                }
            }

            const damage = Math.max(0, enemyAttack - defenderDefense) + directDamage;
            const newDamage = defenderDamage + damage;
            const isDefeated = newDamage >= defenderHealth;

            msgs.push(`${enemy.card.name} attacks ${defenderName}: ${enemyAttack} ATK vs ${defenderDefense} DEF = ${damage} damage.`);

            // Apply damage and exhaust defender
            if (defender.type === 'hero') {
                const updatedHeroes = player.heroes.map((h) =>
                    h.code === defender.code ? { ...h, damage: newDamage, exhausted: true } : h
                );
                nextState = {
                    ...nextState,
                    players: nextState.players.map((p) =>
                        p.id === player.id ? { ...p, heroes: updatedHeroes } : p
                    ),
                };
                if (isDefeated) msgs.push(`${defenderName} is defeated!`);
            } else {
                let updatedAllies = player.allies.map((a, i) =>
                    i === defender.index ? { ...a, damage: newDamage, exhausted: true } : a
                );
                let updatedDiscard = [...player.discard];
                if (isDefeated) {
                    msgs.push(`${defenderName} is destroyed!`);
                    const destroyedAlly = updatedAllies[defender.index];
                    updatedAllies = updatedAllies.filter((_, i) => i !== defender.index);
                    if (destroyedAlly) updatedDiscard = [...updatedDiscard, destroyedAlly];
                }
                nextState = {
                    ...nextState,
                    players: nextState.players.map((p) =>
                        p.id === player.id ? { ...p, allies: updatedAllies, discard: updatedDiscard } : p
                    ),
                };
            }
        } else {
            // Undefended attack - damage goes to first hero
            const targetHero = player.heroes[0];
            if (targetHero) {
                const damage = enemyAttack + directDamage;
                const newDamage = targetHero.damage + damage;
                const isDefeated = newDamage >= (targetHero.health ?? 0);

                msgs.push(`Undefended! ${enemy.card.name} deals ${damage} damage to ${targetHero.name}.`);
                if (isDefeated) msgs.push(`${targetHero.name} is defeated!`);

                nextState = {
                    ...nextState,
                    players: nextState.players.map((p) =>
                        p.id === player.id
                            ? {
                                ...p,
                                heroes: p.heroes.map((h) =>
                                    h.code === targetHero.code ? { ...h, damage: newDamage } : h
                                ),
                            }
                            : p
                    ),
                };
            }
        }

        // Transition to player attack phase for this enemy
        nextState = {
            ...nextState,
            phase: 'combat_attack',
            combatState: {
                ...combatState,
                phase: 'player_attacks',
                selectedDefender: null,
                selectedAttackers: [],
                shadowRevealed: true,
            },
        };

        set({
            gameState: nextState,
            log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'damage'))],
        });
    },

    skipDefense: () => {
        const { gameState } = get();
        // Set no defender and confirm (will result in undefended attack)
        const next: GameState = {
            ...gameState,
            combatState: gameState.combatState
                ? { ...gameState.combatState, selectedDefender: null }
                : null,
        };
        set({ gameState: next });
        get().confirmDefense();
    },

    toggleAttacker: (ref: CharacterRef) => {
        const { gameState } = get();
        if (!gameState.combatState) return;

        const currentAttackers = gameState.combatState.selectedAttackers;
        const isSelected = currentAttackers.some(
            (a) => a.type === ref.type && a.code === ref.code
        );

        const newAttackers = isSelected
            ? currentAttackers.filter((a) => !(a.type === ref.type && a.code === ref.code))
            : [...currentAttackers, ref];

        const next: GameState = {
            ...gameState,
            combatState: {
                ...gameState.combatState,
                selectedAttackers: newAttackers,
            },
        };
        set({ gameState: next });
    },

    confirmAttack: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        const combatState = gameState.combatState;
        if (!player || !combatState) return;

        const enemyIndex = combatState.currentEnemyIndex;
        let enemy = player.engagedEnemies[enemyIndex];
        if (!enemy) return;

        const msgs: string[] = [];

        // Calculate total attack
        let totalAttack = 0;
        const attackerNames: string[] = [];

        for (const ref of combatState.selectedAttackers) {
            if (ref.type === 'hero') {
                const hero = player.heroes.find((h) => h.code === ref.code);
                if (hero) {
                    totalAttack += hero.attack ?? 0;
                    attackerNames.push(hero.name);
                }
            } else {
                const ally = player.allies[ref.index];
                if (ally) {
                    totalAttack += ally.attack ?? 0;
                    attackerNames.push(ally.name);
                }
            }
        }

        const enemyDefense = enemy.card.defense ?? 0;
        const damage = Math.max(0, totalAttack - enemyDefense);
        const newEnemyDamage = enemy.damage + damage;
        const enemyHealth = enemy.card.health ?? 1;
        const isDestroyed = newEnemyDamage >= enemyHealth;

        msgs.push(`${attackerNames.join(', ')} attack ${enemy.card.name}: ${totalAttack} ATK vs ${enemyDefense} DEF = ${damage} damage.`);

        let nextState = { ...gameState };
        let encounterDiscard = [...nextState.encounterDiscard];
        let updatedEnemies = [...player.engagedEnemies];

        // Exhaust all attackers
        let updatedHeroes = player.heroes.map((h) => {
            const isAttacker = combatState.selectedAttackers.some(
                (a) => a.type === 'hero' && a.code === h.code
            );
            return isAttacker ? { ...h, exhausted: true } : h;
        });

        let updatedAllies = player.allies.map((a, i) => {
            const isAttacker = combatState.selectedAttackers.some(
                (att) => att.type === 'ally' && att.index === i
            );
            return isAttacker ? { ...a, exhausted: true } : a;
        });

        // Discard shadow cards from this enemy
        const shadowCardsToDiscard = enemy.shadowCards;
        encounterDiscard = [...encounterDiscard, ...shadowCardsToDiscard];

        if (isDestroyed) {
            msgs.push(`${enemy.card.name} is destroyed!`);
            encounterDiscard = [...encounterDiscard, enemy.card];
            updatedEnemies = updatedEnemies.filter((_, i) => i !== enemyIndex);
        } else {
            updatedEnemies = updatedEnemies.map((e, i) =>
                i === enemyIndex ? { ...e, damage: newEnemyDamage, shadowCards: [] } : e
            );
        }

        // Move to next enemy or end combat
        const nextEnemyIndex = isDestroyed ? enemyIndex : enemyIndex + 1;
        const hasMoreEnemies = nextEnemyIndex < updatedEnemies.length;

        if (hasMoreEnemies) {
            nextState = {
                ...nextState,
                phase: 'combat_defend',
                encounterDiscard,
                players: nextState.players.map((p) =>
                    p.id === player.id
                        ? { ...p, heroes: updatedHeroes, allies: updatedAllies, engagedEnemies: updatedEnemies }
                        : p
                ),
                combatState: {
                    currentEnemyIndex: isDestroyed ? enemyIndex : enemyIndex + 1 - 1, // Adjust if enemy removed
                    phase: 'enemy_attacks',
                    selectedDefender: null,
                    selectedAttackers: [],
                    shadowRevealed: false,
                    enemiesResolved: [...combatState.enemiesResolved, enemyIndex],
                },
            };
            // Actually we need to recalculate index after removing destroyed enemy
            nextState = {
                ...nextState,
                combatState: {
                    ...nextState.combatState!,
                    currentEnemyIndex: isDestroyed ? enemyIndex : enemyIndex,
                },
            };
            if (!isDestroyed) {
                nextState = {
                    ...nextState,
                    combatState: {
                        ...nextState.combatState!,
                        currentEnemyIndex: enemyIndex + 1,
                    },
                };
            }
        } else {
            // Combat ends
            msgs.push('--- Combat Phase End ---');
            nextState = {
                ...nextState,
                phase: 'refresh',
                encounterDiscard,
                players: nextState.players.map((p) =>
                    p.id === player.id
                        ? { ...p, heroes: updatedHeroes, allies: updatedAllies, engagedEnemies: updatedEnemies }
                        : p
                ),
                combatState: null,
            };
        }

        // Check for game over
        const allHeroesDefeated = nextState.players[0]?.heroes.every(
            (h) => h.damage >= (h.health ?? 99)
        );
        if (allHeroesDefeated) {
            msgs.push('All heroes are defeated — the players lose!');
            nextState = { ...nextState, phase: 'game_over' };
        }

        set({
            gameState: nextState,
            log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'damage'))],
        });
    },

    skipAttack: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        const combatState = gameState.combatState;
        if (!player || !combatState) return;

        const enemyIndex = combatState.currentEnemyIndex;
        const enemy = player.engagedEnemies[enemyIndex];
        if (!enemy) return;

        const msgs: string[] = [`No attack declared against ${enemy.card.name}.`];

        // Discard shadow cards
        let encounterDiscard = [...gameState.encounterDiscard, ...enemy.shadowCards];
        let updatedEnemies = player.engagedEnemies.map((e, i) =>
            i === enemyIndex ? { ...e, shadowCards: [] } : e
        );

        // Move to next enemy or end combat
        const nextEnemyIndex = enemyIndex + 1;
        const hasMoreEnemies = nextEnemyIndex < updatedEnemies.length;

        let nextState: GameState;

        if (hasMoreEnemies) {
            nextState = {
                ...gameState,
                phase: 'combat_defend',
                encounterDiscard,
                players: gameState.players.map((p) =>
                    p.id === player.id ? { ...p, engagedEnemies: updatedEnemies } : p
                ),
                combatState: {
                    currentEnemyIndex: nextEnemyIndex,
                    phase: 'enemy_attacks',
                    selectedDefender: null,
                    selectedAttackers: [],
                    shadowRevealed: false,
                    enemiesResolved: [...combatState.enemiesResolved, enemyIndex],
                },
            };
        } else {
            msgs.push('--- Combat Phase End ---');
            nextState = {
                ...gameState,
                phase: 'refresh',
                encounterDiscard,
                players: gameState.players.map((p) =>
                    p.id === player.id ? { ...p, engagedEnemies: updatedEnemies } : p
                ),
                combatState: null,
            };
        }

        set({
            gameState: nextState,
            log: [...log, ...msgs.map((m) => makeLog(nextState, m, 'info'))],
        });
    },

    // ─────────────────────────────────────────────────────────────────
    // QUEST ACTIONS
    // ─────────────────────────────────────────────────────────────────

    startQuestCommit: () => {
        const { gameState, log } = get();
        set({
            gameState: { ...gameState, phase: 'quest_commit', questCommitment: [] },
            log: [...log, makeLog(gameState, '🗺️ Quest Phase: Choose characters to commit.', 'phase')],
        });
    },

    toggleQuestCommit: (ref: CharacterRef) => {
        const { gameState } = get();
        const current = gameState.questCommitment;
        const exists = current.some((c) => c.type === ref.type && c.code === ref.code);

        const updated = exists
            ? current.filter((c) => !(c.type === ref.type && c.code === ref.code))
            : [...current, ref];

        set({
            gameState: { ...gameState, questCommitment: updated },
        });
    },

    confirmQuestCommit: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        if (!player) return;

        const commitment = gameState.questCommitment;
        const msgs: string[] = [];

        // Exhaust all committed characters
        const updatedHeroes = player.heroes.map((hero) => {
            const isCommitted = commitment.some(
                (c) => c.type === 'hero' && c.code === hero.code
            );
            if (isCommitted && !hero.exhausted) {
                msgs.push(`${hero.name} commits to the quest (exhausted).`);
                return { ...hero, exhausted: true };
            }
            return hero;
        });

        const updatedAllies = player.allies.map((ally, index) => {
            const isCommitted = commitment.some(
                (c) => c.type === 'ally' && c.code === ally.code && c.index === index
            );
            if (isCommitted && !ally.exhausted) {
                msgs.push(`${ally.name} commits to the quest (exhausted).`);
                return { ...ally, exhausted: true };
            }
            return ally;
        });

        // Calculate total willpower for logging
        const totalWP = commitment.reduce((sum, ref) => {
            if (ref.type === 'hero') {
                const hero = player.heroes.find((h) => h.code === ref.code);
                return sum + (hero?.willpower ?? 0);
            } else {
                const ally = player.allies[ref.index];
                return sum + (ally?.willpower ?? 0);
            }
        }, 0);

        msgs.push(`Total committed willpower: ${totalWP} 🌟`);

        set({
            gameState: {
                ...gameState,
                phase: 'quest_staging',
                players: gameState.players.map((p) =>
                    p.id === player.id
                        ? { ...p, heroes: updatedHeroes, allies: updatedAllies }
                        : p
                ),
            },
            log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))],
        });
    },

    revealStaging: () => {
        const { gameState, log } = get();
        const msgs: string[] = [];

        // Determine how many cards to reveal based on current quest stage
        const cardsToReveal = getEncounterCardsToReveal(gameState);
        let newStagingArea = [...gameState.stagingArea];
        let encounterDiscard = [...gameState.encounterDiscard];
        let encounterDeck = [...gameState.encounterDeck];
        let updatedState = gameState;
        let surgeCount = 0; // Track cards with Surge to reveal additional cards

        if (cardsToReveal > 1) {
            msgs.push(`Stage 3 Special: Revealing ${cardsToReveal} encounter cards.`);
        }

        // Helper function to reveal a single card and handle keywords
        const revealSingleCard = (): boolean => {
            if (encounterDeck.length === 0) {
                // Check victory condition for Stage 3
                const victoryCheck = checkVictoryCondition({
                    ...updatedState,
                    encounterDeck,
                    encounterDiscard,
                });
                if (victoryCheck.victory) {
                    msgs.push(victoryCheck.reason);
                    set({
                        gameState: { ...updatedState, phase: 'game_over', encounterDeck, encounterDiscard, stagingArea: newStagingArea },
                        log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))],
                    });
                    return false; // Signal to stop revealing
                }
                msgs.push('No cards left in encounter deck.');
                return false;
            }

            const [revealed, ...restEncounter] = encounterDeck;
            encounterDeck = restEncounter;
            updatedState = { ...updatedState, encounterDeck };

            msgs.push(`Revealed: ${revealed.name} (${revealed.type_code})`);

            // Resolve keywords (Doomed, Surge) before other effects
            const keywordResult = resolveKeywords(updatedState, revealed);
            updatedState = keywordResult.state;
            msgs.push(...keywordResult.log);
            if (keywordResult.surge) {
                surgeCount++;
            }

            // Check if game ended due to keyword effects (e.g., threat elimination)
            if (updatedState.phase === 'game_over') {
                return false;
            }

            if (isTreacheryCard(revealed)) {
                // Resolve treachery effect using the treachery resolution system
                const result = resolveTreachery(updatedState, revealed);
                updatedState = result.state;
                newStagingArea = [...updatedState.stagingArea]; // Update from treachery effects
                msgs.push(...result.log.slice(1)); // Skip first log (already logged "Revealed: ...")

                if (result.discard) {
                    encounterDiscard.push(revealed);
                }
                // If not discarded, it was attached (e.g., condition attachments)
            } else if (revealed.type_code === 'enemy' || revealed.type_code === 'location') {
                newStagingArea.push(revealed);
                msgs.push(`Added ${revealed.name} to staging area (threat: ${revealed.threat ?? 0}).`);

                // Resolve enemy "When Revealed" effects (e.g., King Spider, Ungoliant's Spawn)
                if (revealed.type_code === 'enemy') {
                    const playerId = updatedState.players[0]?.id ?? 'player1';
                    const enemyResult = resolveEnemyWhenRevealed(updatedState, revealed, playerId);
                    updatedState = enemyResult.state;
                    msgs.push(...enemyResult.log);
                }
            } else {
                newStagingArea.push(revealed);
            }

            // Check for game over after each treachery
            if (updatedState.phase === 'game_over') {
                return false;
            }

            return true; // Continue revealing
        };

        // Reveal the main cards
        for (let i = 0; i < cardsToReveal; i++) {
            if (!revealSingleCard()) {
                break;
            }
        }

        // Handle Surge: reveal additional cards for each surge
        while (surgeCount > 0 && updatedState.phase !== 'game_over') {
            surgeCount--;
            if (!revealSingleCard()) {
                break;
            }
        }

        // Final victory check after all cards revealed
        const finalVictoryCheck = checkVictoryCondition({
            ...updatedState,
            encounterDeck,
            encounterDiscard,
        });
        if (finalVictoryCheck.victory) {
            msgs.push(finalVictoryCheck.reason);
            set({
                gameState: { ...updatedState, phase: 'game_over', encounterDeck, encounterDiscard, stagingArea: newStagingArea },
                log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))],
            });
            return;
        }

        set({
            gameState: {
                ...updatedState,
                phase: updatedState.phase === 'game_over' ? 'game_over' : 'quest_resolve',
                encounterDiscard,
                encounterDeck,
                stagingArea: newStagingArea,
            },
            log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))],
        });
    },

    resolveQuest: () => {
        const { gameState, log } = get();
        const player = gameState.players[0];
        if (!player) return;

        const msgs: string[] = [];
        const commitment = gameState.questCommitment;

        // Calculate total willpower
        const totalWillpower = commitment.reduce((sum, ref) => {
            if (ref.type === 'hero') {
                const hero = player.heroes.find((h) => h.code === ref.code);
                return sum + (hero?.willpower ?? 0);
            } else {
                const ally = player.allies[ref.index];
                return sum + (ally?.willpower ?? 0);
            }
        }, 0);

        // Calculate staging area threat
        const stagingThreat = gameState.stagingArea.reduce((sum, item) => {
            if ('engagedPlayerId' in item) return sum;
            return sum + (item.threat ?? 0);
        }, 0);

        const net = totalWillpower - stagingThreat;

        msgs.push(`Quest resolution: ${totalWillpower} WP vs ${stagingThreat} Threat = ${net >= 0 ? '+' : ''}${net}`);

        let newQuestProgress = gameState.questProgress;
        let newThreat = player.threat;
        let newCurrentQuest = gameState.currentQuest;
        let newQuestDeck = gameState.questDeck;
        let newActiveLocation = gameState.activeLocation;
        let newStagingArea = gameState.stagingArea;
        let isVictory = false;

        if (net > 0) {
            // Progress to location first, then quest
            let progressRemaining = net;

            if (newActiveLocation) {
                const locQP = newActiveLocation.card.quest_points ?? 1;
                const locProgress = newActiveLocation.progress + progressRemaining;

                if (locProgress >= locQP) {
                    msgs.push(`🏰 ${newActiveLocation.card.name} explored!`);
                    progressRemaining = locProgress - locQP;
                    newActiveLocation = null;
                } else {
                    newActiveLocation = { ...newActiveLocation, progress: locProgress };
                    progressRemaining = 0;
                }
            }

            if (progressRemaining > 0 && newCurrentQuest) {
                newQuestProgress += progressRemaining;
                msgs.push(`+${progressRemaining} progress on quest (${newQuestProgress}/${newCurrentQuest.quest_points ?? '?'}).`);

                const questQP = newCurrentQuest.quest_points ?? 999;
                if (newQuestProgress >= questQP) {
                    msgs.push(`✅ Quest stage complete!`);
                    if (newQuestDeck.length > 0) {
                        const [nextQuest, ...restQuests] = newQuestDeck;
                        newCurrentQuest = nextQuest;
                        newQuestDeck = restQuests;
                        newQuestProgress = 0;
                        msgs.push(`Advancing to next quest stage: ${nextQuest.name}`);

                        // Handle quest stage transition effects
                        const transitionState: GameState = {
                            ...gameState,
                            currentQuest: nextQuest,
                            questDeck: restQuests,
                            questProgress: 0,
                            activeLocation: newActiveLocation,
                            stagingArea: gameState.stagingArea,
                        };
                        const transitionResult = resolveQuestStageTransition(transitionState, nextQuest);
                        msgs.push(...transitionResult.log);

                        // Update staging area from transition effects (e.g., Stage 2 adds Caught in a Web)
                        if (transitionResult.state.stagingArea !== transitionState.stagingArea) {
                            newStagingArea = transitionResult.state.stagingArea;
                        }
                    } else {
                        msgs.push('🎉 VICTORY! All quest stages complete!');
                        isVictory = true;
                    }
                }
            }
        } else if (net < 0) {
            const threatRaise = Math.abs(net);
            newThreat = player.threat + threatRaise;
            msgs.push(`📈 Threat raised by ${threatRaise} (now ${newThreat}).`);

            if (newThreat >= 50) {
                msgs.push('💀 Threat elimination! Game Over.');
            }
        } else {
            msgs.push('Quest resulted in a tie. No progress or threat change.');
        }

        // Determine final phase
        let finalPhase: GamePhase = 'travel';
        if (newThreat >= 50) {
            finalPhase = 'game_over';
        } else if (isVictory) {
            finalPhase = 'game_over'; // Game over with victory
        }

        set({
            gameState: {
                ...gameState,
                phase: finalPhase,
                questProgress: newQuestProgress,
                currentQuest: newCurrentQuest,
                questDeck: newQuestDeck,
                activeLocation: newActiveLocation,
                stagingArea: newStagingArea,
                questCommitment: [],
                players: gameState.players.map((p) =>
                    p.id === player.id ? { ...p, threat: newThreat } : p
                ),
            },
            log: [...log, ...msgs.map((m) => makeLog(gameState, m, 'info'))],
        });

        // Auto-skip Travel phase if there's nothing to do (and not game over)
        if (finalPhase === 'travel') {
            const hasActiveLocation = !!newActiveLocation;
            const hasLocationsInStaging = gameState.stagingArea.some(
                (item) => !('engagedPlayerId' in item) && (item as EncounterCard).type_code === 'location'
            );

            if (hasActiveLocation || !hasLocationsInStaging) {
                const reason = hasActiveLocation
                    ? 'Auto-skipped Travel (active location exists).'
                    : 'Auto-skipped Travel (no locations in staging).';

                setTimeout(() => {
                    const currentState = get();
                    if (currentState.gameState.phase === 'travel') {
                        get().skipTravel();
                        set({
                            log: [...get().log, makeLog(get().gameState, reason, 'info')],
                        });
                    }
                }, 50);
            }
        }
    },

    optionallyEngageEnemy: (enemyIndex: number) => {
        const { gameState, log } = get();
        const player = gameState.players[0];

        if (!player) {
            return;
        }

        const result = optionalEngagement(gameState, enemyIndex, player.id);

        set({
            gameState: result.state,
            log: [...log, ...result.log.map((m: string) => makeLog(gameState, m, 'info'))],
        });
    },

    activateCardAbility: (playerId: string, abilityId: string, sourceHeroCode?: string, choiceIndex?: number, targetIndex?: number) => {
        const { gameState, log } = get();
        const player = gameState.players.find((p) => p.id === playerId);

        // Build context with target information
        const context: import('../engine/cardAbilities').AbilityContext = {};

        // If targetIndex is provided and it's for an enemy, add the enemy to context
        if (targetIndex !== undefined && player) {
            const targetEnemy = player.engagedEnemies[targetIndex];
            if (targetEnemy) {
                context.destroyedEnemy = targetEnemy.card;  // Reusing this field for target
            }
        }

        const result = activateAbility(gameState, playerId, abilityId, sourceHeroCode, context, choiceIndex);

        if (result.success) {
            let nextState = result.state;

            // If we have a target for the deal_damage effect, apply it now
            if (targetIndex !== undefined && player) {
                const ability = getAbilityById(abilityId);
                const effect = ability?.effect;

                // Handle choice effects
                if (effect?.type === 'choice' && choiceIndex !== undefined && effect.choices) {
                    const chosenEffect = effect.choices[choiceIndex];
                    if (chosenEffect?.type === 'deal_damage' && chosenEffect.target === 'any_enemy') {
                        const amount = chosenEffect.amount ?? 0;
                        const updatedPlayer = nextState.players.find((p) => p.id === playerId);

                        if (updatedPlayer && updatedPlayer.engagedEnemies[targetIndex]) {
                            const enemy = updatedPlayer.engagedEnemies[targetIndex];
                            const newDamage = enemy.damage + amount;
                            const enemyHP = enemy.card.health ?? 1;

                            if (newDamage >= enemyHP) {
                                // Enemy destroyed
                                const newLogs = [...result.log, `${ability?.cardName ?? 'Ability'}: Dealt ${amount} damage to ${enemy.card.name}. ${enemy.card.name} destroyed!`];
                                nextState = {
                                    ...nextState,
                                    players: nextState.players.map((p) =>
                                        p.id !== playerId
                                            ? p
                                            : {
                                                  ...p,
                                                  engagedEnemies: p.engagedEnemies.filter((_, i) => i !== targetIndex),
                                              }
                                    ),
                                    encounterDiscard: [...nextState.encounterDiscard, enemy.card],
                                };

                                applyPassiveAbilities(nextState, playerId);
                                set({
                                    gameState: nextState,
                                    log: [...log, ...newLogs.map((m: string) => makeLog(gameState, m, 'ability'))],
                                });
                                return;
                            } else {
                                // Enemy damaged but not destroyed
                                const newLogs = [...result.log, `${ability?.cardName ?? 'Ability'}: Dealt ${amount} damage to ${enemy.card.name}.`];
                                nextState = {
                                    ...nextState,
                                    players: nextState.players.map((p) =>
                                        p.id !== playerId
                                            ? p
                                            : {
                                                  ...p,
                                                  engagedEnemies: p.engagedEnemies.map((e, i) =>
                                                      i !== targetIndex ? e : { ...e, damage: newDamage }
                                                  ),
                                              }
                                    ),
                                };

                                applyPassiveAbilities(nextState, playerId);
                                set({
                                    gameState: nextState,
                                    log: [...log, ...newLogs.map((m: string) => makeLog(gameState, m, 'ability'))],
                                });
                                return;
                            }
                        }
                    }
                }
            }

            // Apply passive abilities after any ability activation
            applyPassiveAbilities(nextState, playerId);

            set({
                gameState: nextState,
                log: [...log, ...result.log.map((m: string) => makeLog(gameState, m, 'ability'))],
            });
        } else if (result.error) {
            set({
                log: [...log, makeLog(gameState, `Cannot activate ability: ${result.error}`, 'error')],
            });
        }
    },

    getAvailableAbilities: (playerId: string, heroCode: string) => {
        const { gameState } = get();
        const player = gameState.players.find((p) => p.id === playerId);
        if (!player) return [];

        // Get abilities from the hero itself
        const heroAbilities = getAbilities(heroCode);

        // Get abilities from attachments on this hero
        const hero = player.heroes.find((h) => h.code === heroCode);
        const attachmentAbilities: ReturnType<typeof getAbilities> = [];
        if (hero?.attachments) {
            for (const attachment of hero.attachments) {
                const attAbilities = getAbilities(attachment.code);
                attachmentAbilities.push(...attAbilities);
            }
        }

        const allAbilities = [...heroAbilities, ...attachmentAbilities];

        return allAbilities
            .filter((a) => a.type === 'action' && a.trigger === 'manual')
            .map((ability) => {
                const costCheck = canPayAbilityCost(gameState, playerId, ability, heroCode);
                const limitCheck = canUseAbility(playerId, ability);
                const canActivate = costCheck.canPay && limitCheck.canUse;
                const reason = !costCheck.canPay ? costCheck.reason : !limitCheck.canUse ? limitCheck.reason : undefined;

                return {
                    id: ability.id,
                    name: ability.cardName,
                    description: ability.description,
                    canActivate,
                    reason,
                };
            });
    },

    toggleAttachmentExhaust: (playerId: string, heroCode: string, attachmentIndex: number) => {
        const { gameState, log } = get();
        const player = gameState.players.find((p) => p.id === playerId);
        if (!player) return;

        const hero = player.heroes.find((h) => h.code === heroCode);
        if (!hero || !hero.attachments[attachmentIndex]) return;

        const attachment = hero.attachments[attachmentIndex];
        const newExhausted = !attachment.exhausted;
        const actionText = newExhausted ? 'exhausted' : 'readied';

        const updatedHeroes = player.heroes.map((h) => {
            if (h.code !== heroCode) return h;
            return {
                ...h,
                attachments: h.attachments.map((att, i) =>
                    i === attachmentIndex ? { ...att, exhausted: newExhausted } : att
                ),
            };
        });

        const nextState = {
            ...gameState,
            players: gameState.players.map((p) =>
                p.id !== playerId ? p : { ...p, heroes: updatedHeroes }
            ),
        };

        set({
            gameState: nextState,
            log: [...log, makeLog(nextState, `${attachment.name} manually ${actionText}.`, 'info')],
        });
    },
}));
