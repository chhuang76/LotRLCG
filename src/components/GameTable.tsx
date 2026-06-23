import { useCallback, useState } from 'react';
import type { EncounterCard, PlayerCard } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import CardDisplay from './CardDisplay';
import HeroCard from './HeroCard';
import AllyCard from './AllyCard';
import EngagedEnemyCard from './EngagedEnemyCard';
import StagingArea, { StagingLocationCard } from './StagingArea';
import ThreatDial from './ThreatDial';
import PhaseControlBar from './PhaseControlBar';
import LogPanel from './LogPanel';
import MulliganModal from './MulliganModal';
import QuestPreview from './QuestPreview';
import CombatPreview from './CombatPreview';
import ChoiceModal from './ChoiceModal';
import TargetSelectionModal, { buildEnemyTargets } from './TargetSelectionModal';
import type { TargetType } from './TargetSelectionModal';
import { getEnemyTotalAttack } from '../engine/enemyAbilities';
import './GameTable.css';

// State for enter_play ability choices (e.g., Gandalf)
interface PendingChoice {
    abilityId: string;
    choices: string[];
    cardName: string;
}

// State for target selection (e.g., Gandalf's damage ability)
interface PendingTarget {
    abilityId: string;
    choiceIndex: number;
    targetType: TargetType;
    cardName: string;
    effectDescription: string;
}

export function GameTable() {
    const {
        gameState,
        log,
        showMulliganModal,
        nextPhase,
        adjustThreat,
        exhaustHero,
        readyHero,
        playCard,
        addToLog,
        exhaustAlly,
        readyAlly,
        takeMulligan,
        keepHand,
        // Combat actions
        selectDefender,
        setCurrentEnemy,
        confirmDefense,
        skipDefense,
        toggleAttacker,
        confirmAttack,
        skipAttack,
        // Quest actions
        startQuestCommit,
        toggleQuestCommit,
        confirmQuestCommit,
        revealStaging,
        resolveQuest,
        // Travel actions
        travelToLocation,
        skipTravel,
    } = useGameStore();

    // State for attachment targeting
    const [pendingAttachment, setPendingAttachment] = useState<{ cardIndex: number; card: PlayerCard } | null>(null);

    // State for enter_play ability choices (e.g., Gandalf)
    const [pendingChoice, setPendingChoice] = useState<PendingChoice | null>(null);

    // State for target selection (e.g., Gandalf's damage ability)
    const [pendingTarget, setPendingTarget] = useState<PendingTarget | null>(null);

    // Get the activateCardAbility function for resolving choices
    const activateCardAbility = useGameStore((state) => state.activateCardAbility);

    const player = gameState.players?.[0];
    if (!player) return null;

    const { activeLocation, currentQuest, questProgress, stagingArea, encounterDeck } = gameState;
    const isPlanningPhase = gameState.phase === 'planning';

    // Staging area — only bare EncounterCards (non-engaged enemies + locations)
    const stagingCards: EncounterCard[] = stagingArea.filter(
        (item): item is EncounterCard => !('engagedPlayerId' in item)
    );

    const isQuestCommit = gameState.phase === 'quest_commit';
    const isQuestPhase = gameState.phase.startsWith('quest');
    const stagingThreat = stagingCards.reduce((s, c) => s + (c.threat ?? 0), 0);

    // Eligible to commit: ready and not defeated.
    const canCommit = (exhausted: boolean, damage: number, health?: number): boolean =>
        !exhausted && damage < (health ?? 99);

    // Total willpower of currently committed characters.
    const questCommitWillpower = gameState.questCommitment.reduce((sum, ref) => {
        if (ref.type === 'hero') {
            const hero = player.heroes.find((h) => h.code === ref.code);
            return sum + (hero?.willpower ?? 0);
        }
        const ally = player.allies[ref.index];
        return sum + (ally?.willpower ?? 0);
    }, 0);

    const locationQP = activeLocation?.card.quest_points ?? 1;
    const locationPct = locationQP > 0
        ? Math.min(((activeLocation?.progress ?? 0) / locationQP) * 100, 100)
        : 0;

    const questQP = currentQuest?.quest_points ?? 1;
    const questPct = questQP > 0
        ? Math.min((questProgress / questQP) * 100, 100)
        : 0;

    // ── Combat derivations ───────────────────────────────────────
    const combatState = gameState.combatState;
    const isDefendStep = gameState.phase === 'combat_defend';
    const isAttackStep = gameState.phase === 'combat_attack';
    const isCombat = isDefendStep || isAttackStep;

    const currentEnemy = combatState
        ? player.engagedEnemies[combatState.currentEnemyIndex]
        : undefined;
    const enemyAttack = currentEnemy ? getEnemyTotalAttack(currentEnemy) : 0;
    const enemyDefense = currentEnemy?.card.defense ?? 0;
    const enemyHealth = currentEnemy?.card.health ?? 1;

    const selectedDefenderRef = combatState?.selectedDefender ?? null;
    const selectedAttackers = combatState?.selectedAttackers ?? [];

    // Total attack power of selected attackers.
    const totalAttackPower = selectedAttackers.reduce((sum, ref) => {
        if (ref.type === 'hero') {
            const hero = player.heroes.find((h) => h.code === ref.code);
            return sum + (hero?.attack ?? 0);
        }
        const ally = player.allies[ref.index];
        return sum + (ally?.attack ?? 0);
    }, 0);

    // Defender preview stats.
    const defenderStats = (() => {
        if (!selectedDefenderRef) return null;
        if (selectedDefenderRef.type === 'hero') {
            const hero = player.heroes.find((h) => h.code === selectedDefenderRef.code);
            return hero ? { name: hero.name, defense: hero.defense ?? 0 } : null;
        }
        const ally = player.allies[selectedDefenderRef.index];
        return ally ? { name: ally.name, defense: ally.defense ?? 0 } : null;
    })();

    const predictedDamageToDefender = defenderStats
        ? Math.max(0, enemyAttack - defenderStats.defense)
        : enemyAttack;
    const predictedDamageToEnemy = Math.max(0, totalAttackPower - enemyDefense);
    const willDestroy = currentEnemy
        ? currentEnemy.damage + predictedDamageToEnemy >= enemyHealth
        : false;

    const handleExhaust = useCallback((heroCode: string) => {
        const hero = player.heroes.find((h) => h.code === heroCode);
        if (hero?.exhausted) readyHero(player.id, heroCode);
        else exhaustHero(player.id, heroCode);
    }, [player, exhaustHero, readyHero]);

    // Check if a card can be played (has enough resources)
    const canPlayCard = useCallback((card: PlayerCard): boolean => {
        if (!isPlanningPhase) return false;
        const cost = card.cost ?? 0;
        const sphere = card.sphere_code;

        const availableResources = player.heroes
            .filter((h) => sphere === 'neutral' || h.sphere_code === sphere)
            .reduce((sum, h) => sum + h.resources, 0);

        return availableResources >= cost;
    }, [isPlanningPhase, player.heroes]);

    // Handle clicking a card in hand
    const handleHandCardClick = useCallback((cardIndex: number) => {
        if (!isPlanningPhase) {
            addToLog('Cards can only be played during the Planning phase.', 'info');
            return;
        }

        const card = player.hand[cardIndex];
        if (!card) return;

        // If it's an attachment, we need to select a target first
        if (card.type_code === 'attachment') {
            if (!canPlayCard(card)) {
                addToLog(`Not enough resources to play ${card.name}.`, 'info');
                return;
            }
            setPendingAttachment({ cardIndex, card });
            addToLog(`Select a hero to attach ${card.name} to.`, 'info');
            return;
        }

        // For allies and events, play directly
        const result = playCard(player.id, cardIndex);
        if (!result.success && result.error) {
            addToLog(result.error, 'info');
        } else if (result.requiresChoice && result.choices && result.choiceCallback) {
            // Card has an enter_play ability that requires a choice (e.g., Gandalf)
            setPendingChoice({
                abilityId: result.choiceCallback,
                choices: result.choices,
                cardName: card.name,
            });
        }
    }, [isPlanningPhase, player, playCard, canPlayCard, addToLog]);

    // Handle clicking a hero (for attachment targeting)
    const handleHeroClickForAttachment = useCallback((heroCode: string) => {
        if (!pendingAttachment) return;

        const result = playCard(player.id, pendingAttachment.cardIndex, heroCode);
        if (!result.success && result.error) {
            addToLog(result.error, 'info');
        }
        setPendingAttachment(null);
    }, [pendingAttachment, player.id, playCard, addToLog]);

    // Cancel attachment targeting
    const cancelAttachment = useCallback(() => {
        setPendingAttachment(null);
        addToLog('Attachment cancelled.', 'info');
    }, [addToLog]);

    return (
        <div className="game-table">
            {/* Threat Dial Zone */}
            <div className="zone-panel zone--threat">
                <span className="zone-panel__label">Threat</span>
                <ThreatDial
                    threat={player.threat}
                    onAdjust={(d) => adjustThreat(player.id, d)}
                />
            </div>

            {/* Quest Zone */}
            <div className="zone-panel zone--quest">
                <span className="zone-panel__label">Quest</span>
                <div className="quest-zone__deck">
                    {currentQuest ? (
                        <CardDisplay card={currentQuest} showCardImage hideCostBadge />
                    ) : (
                        <div className="quest-zone__card-back">🗺</div>
                    )}
                    <div className="zone-progress">
                        <div className="zone-progress__label">
                            <span>Progress</span>
                            <span>{questProgress} / {currentQuest?.quest_points ?? '?'}</span>
                        </div>
                        <div className="zone-progress__bar-bg">
                            <div className="zone-progress__bar-fill" style={{ width: `${questPct}%` }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Location */}
            <div className="zone-panel zone--location">
                <span className="zone-panel__label">Location</span>
                {activeLocation ? (
                    <>
                        <div className="active-location__card">
                            <StagingLocationCard card={activeLocation.card} />
                        </div>
                        <div className="zone-progress">
                            <div className="zone-progress__label">
                                <span>Progress</span>
                                <span>{activeLocation.progress} / {locationQP}</span>
                            </div>
                            <div className="zone-progress__bar-bg">
                                <div className="zone-progress__bar-fill" style={{ width: `${locationPct}%` }} />
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="active-location__empty">None</div>
                )}
            </div>

            {/* Staging Area */}
            <div className="zone-panel zone--staging">
                <StagingArea
                    cards={stagingCards}
                    onCardClick={(card) => travelToLocation(card)}
                    isTravelPhase={gameState.phase === 'travel'}
                    hasActiveLocation={!!activeLocation}
                />
            </div>

            {/* Encounter Deck */}
            <div className="zone-panel zone--encounter">
                <span className="zone-panel__label">Encounter</span>
                <div className="encounter-deck-zone">
                    <div className="encounter-deck-zone__card-back">🌑</div>
                    <span className="encounter-deck-zone__count">{encounterDeck.length} cards</span>
                </div>
            </div>

            {/* Player Zone */}
            <div className="zone-panel zone--player">
                <span className="zone-panel__label">
                    Player Zone — {player.name}
                </span>

                {isQuestPhase && (
                    <QuestPreview
                        committedWillpower={questCommitWillpower}
                        stagingThreat={stagingThreat}
                    />
                )}

                {isCombat && currentEnemy && (
                    <CombatPreview
                        step={isAttackStep ? 'attack' : 'defend'}
                        enemyName={currentEnemy.card.name}
                        enemyAttack={enemyAttack}
                        defenderName={defenderStats?.name}
                        defenderDefense={defenderStats?.defense}
                        predictedDamageToDefender={predictedDamageToDefender}
                        totalAttackPower={totalAttackPower}
                        enemyDefense={enemyDefense}
                        predictedDamageToEnemy={predictedDamageToEnemy}
                        willDestroy={willDestroy}
                        shadowRevealed={combatState?.shadowRevealed ?? false}
                    />
                )}

                {/* Engaged enemies (FIRST per TDD diagram) */}
                <div className="player-zone__engaged">
                    <span className="player-zone__engaged-label">
                        ⚔ Engaged ({player.engagedEnemies.length})
                    </span>
                    {player.engagedEnemies.length > 0 ? (
                        <div className="player-zone__engaged-list">
                            {player.engagedEnemies.map((ae, i) => (
                                <EngagedEnemyCard
                                    key={`${ae.card.code}-${i}`}
                                    enemy={ae}
                                    active={isCombat && i === combatState?.currentEnemyIndex}
                                    resolved={isCombat && !!ae.combatResolved}
                                    selectable={isDefendStep && !ae.combatResolved}
                                    onClick={() => setCurrentEnemy(i)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="player-zone__engaged-empty">No engaged enemies</div>
                    )}
                </div>

                {/* Heroes & Allies */}
                <div className="player-zone__heroes">
                    {player.heroes.map((hero, index) => {
                        const heroEligible = canCommit(hero.exhausted, hero.damage, hero.health);
                        const isSelectedDefender = isDefendStep && selectedDefenderRef?.type === 'hero'
                            && selectedDefenderRef.code === hero.code;
                        const isSelectedAttacker = isAttackStep && selectedAttackers.some(
                            (a) => a.type === 'hero' && a.code === hero.code
                        );
                        return (
                            <HeroCard
                                key={hero.code}
                                card={hero}
                                resources={hero.resources}
                                damage={hero.damage}
                                exhausted={hero.exhausted}
                                onExhaustToggle={() => handleExhaust(hero.code)}
                                highlighted={!!pendingAttachment && !isQuestCommit && !isCombat}
                                committable={isQuestCommit && heroEligible}
                                committed={isQuestCommit && gameState.questCommitment.some(
                                    (r) => r.type === 'hero' && r.code === hero.code
                                )}
                                selectable={isCombat && heroEligible}
                                selected={isSelectedDefender || isSelectedAttacker}
                                selectVariant={isAttackStep ? 'attack' : 'defend'}
                                onClick={() => {
                                    if (isDefendStep) {
                                        selectDefender({ type: 'hero', index, code: hero.code });
                                    } else if (isAttackStep) {
                                        toggleAttacker({ type: 'hero', index, code: hero.code });
                                    } else if (isQuestCommit) {
                                        toggleQuestCommit({ type: 'hero', index, code: hero.code });
                                    } else {
                                        handleHeroClickForAttachment(hero.code);
                                    }
                                }}
                            />
                        );
                    })}
                    {player.allies.map((ally, index) => {
                        const allyEligible = canCommit(ally.exhausted, ally.damage, ally.health);
                        const isSelectedDefender = isDefendStep && selectedDefenderRef?.type === 'ally'
                            && selectedDefenderRef.index === index;
                        const isSelectedAttacker = isAttackStep && selectedAttackers.some(
                            (a) => a.type === 'ally' && a.index === index
                        );
                        return (
                            <AllyCard
                                key={`${ally.code}-${index}`}
                                ally={ally}
                                onExhaustToggle={() =>
                                    ally.exhausted
                                        ? readyAlly(player.id, index)
                                        : exhaustAlly(player.id, index)
                                }
                                committable={isQuestCommit && allyEligible}
                                committed={isQuestCommit && gameState.questCommitment.some(
                                    (r) => r.type === 'ally' && r.code === ally.code && r.index === index
                                )}
                                selectable={isCombat && allyEligible}
                                selected={isSelectedDefender || isSelectedAttacker}
                                selectVariant={isAttackStep ? 'attack' : 'defend'}
                                onClick={() => {
                                    if (isDefendStep) {
                                        selectDefender({ type: 'ally', index, code: ally.code });
                                    } else if (isAttackStep) {
                                        toggleAttacker({ type: 'ally', index, code: ally.code });
                                    } else {
                                        toggleQuestCommit({ type: 'ally', index, code: ally.code });
                                    }
                                }}
                            />
                        );
                    })}
                </div>

                {/* Hand */}
                {player.hand.length > 0 && (
                    <div className="player-zone__hand-section">
                        <span className="player-zone__hand-label">Hand ({player.hand.length})</span>
                        {pendingAttachment && (
                            <div className="hand__attachment-prompt">
                                <span>Select a hero for {pendingAttachment.card.name}</span>
                                <button onClick={cancelAttachment}>Cancel</button>
                            </div>
                        )}
                        <div className="player-zone__hand">
                            {player.hand.map((c, i) => {
                                const playable = canPlayCard(c);
                                return (
                                    <div
                                        key={`${c.code}-${i}`}
                                        className={`hand-card-wrapper ${playable && isPlanningPhase ? 'playable' : ''} ${!playable && isPlanningPhase ? 'unplayable' : ''}`}
                                        onClick={() => handleHandCardClick(i)}
                                        title={isPlanningPhase ? (playable ? `Click to play ${c.name}` : `Not enough resources for ${c.name}`) : c.name}
                                    >
                                        <CardDisplay card={c} showCardImage={true} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Phase Bar */}
            <PhaseControlBar
                phase={gameState.phase}
                round={gameState.round}
                onAdvancePhase={nextPhase}
                questActions={{
                    onStartCommit: startQuestCommit,
                    onConfirmCommit: confirmQuestCommit,
                    onRevealStaging: revealStaging,
                    onResolveQuest: resolveQuest,
                }}
                travelActions={{
                    onSkipTravel: skipTravel,
                }}
                combatActions={{
                    onConfirmDefense: () => (selectedDefenderRef ? confirmDefense() : skipDefense()),
                    onConfirmAttack: () => (selectedAttackers.length ? confirmAttack() : skipAttack()),
                }}
                combatAttackPower={totalAttackPower}
                combatDefenderSelected={!!selectedDefenderRef}
                hasActiveLocation={!!activeLocation}
                hasLocationsInStaging={stagingCards.some((c) => c.type_code === 'location')}
                questCommitWillpower={questCommitWillpower}
            />

            {/* Log - below phase bar, collapsed by default */}
            <div className="zone--log">
                <LogPanel entries={log} />
            </div>

            {/* Mulligan Modal */}
            {showMulliganModal && (
                <MulliganModal
                    hand={player.hand}
                    onKeepHand={keepHand}
                    onMulligan={() => takeMulligan(player.id)}
                />
            )}

            {/* Choice Modal - for enter_play abilities like Gandalf */}
            {pendingChoice && (
                <ChoiceModal
                    title={`${pendingChoice.cardName} enters play`}
                    description="Choose one effect:"
                    choices={pendingChoice.choices}
                    onSelect={(choiceIndex) => {
                        // Check if choice 1 (index 1) is "Deal 4 damage to an enemy" - needs target
                        const choiceText = pendingChoice.choices[choiceIndex]?.toLowerCase() ?? '';
                        if (choiceText.includes('damage') && choiceText.includes('enemy')) {
                            // This choice requires enemy targeting
                            setPendingTarget({
                                abilityId: pendingChoice.abilityId,
                                choiceIndex,
                                targetType: 'enemy',
                                cardName: pendingChoice.cardName,
                                effectDescription: pendingChoice.choices[choiceIndex],
                            });
                            setPendingChoice(null);
                        } else {
                            // No target needed, activate directly
                            activateCardAbility(player.id, pendingChoice.abilityId, undefined, choiceIndex);
                            setPendingChoice(null);
                        }
                    }}
                />
            )}

            {/* Target Selection Modal - for abilities that need a target */}
            {pendingTarget && (
                <TargetSelectionModal
                    title={pendingTarget.cardName}
                    description={pendingTarget.effectDescription}
                    targetType={pendingTarget.targetType}
                    targets={
                        pendingTarget.targetType === 'enemy'
                            ? buildEnemyTargets(player.engagedEnemies)
                            : []
                    }
                    onSelect={(targetId) => {
                        // Parse target index from ID (e.g., "enemy-0" -> 0)
                        const targetIndex = parseInt(targetId.split('-')[1], 10);

                        // Activate the ability with the target
                        activateCardAbility(
                            player.id,
                            pendingTarget.abilityId,
                            undefined,
                            pendingTarget.choiceIndex,
                            targetIndex
                        );
                        setPendingTarget(null);
                    }}
                    onCancel={() => {
                        addToLog(`${pendingTarget.cardName} effect cancelled.`, 'info');
                        setPendingTarget(null);
                    }}
                />
            )}
        </div>
    );
}

export default GameTable;
