import type { ActiveEnemy, Hero, Ally, CharacterRef, CombatState } from '../engine/types';
import CardDisplay from './CardDisplay';
import './CombatPanel.css';

interface CombatPanelProps {
    combatState: CombatState;
    currentEnemy: ActiveEnemy;
    heroes: Hero[];
    allies: Ally[];
    onSelectDefender: (ref: CharacterRef) => void;
    onConfirmDefense: () => void;
    onSkipDefense: () => void;
    onToggleAttacker: (ref: CharacterRef) => void;
    onConfirmAttack: () => void;
    onSkipAttack: () => void;
}

/**
 * CombatPanel - Displays combat UI for defender/attacker selection
 * Shows the current enemy, available characters, and action buttons
 */
export function CombatPanel({
    combatState,
    currentEnemy,
    heroes,
    allies,
    onSelectDefender,
    onConfirmDefense,
    onSkipDefense,
    onToggleAttacker,
    onConfirmAttack,
    onSkipAttack,
}: CombatPanelProps) {
    const isDefendPhase = combatState.phase === 'enemy_attacks';
    const isAttackPhase = combatState.phase === 'player_attacks';

    // Get character name from ref
    const getCharacterName = (ref: CharacterRef): string => {
        if (ref.type === 'hero') {
            const hero = heroes.find(h => h.code === ref.code);
            return hero?.name ?? 'Unknown Hero';
        } else {
            const ally = allies[ref.index];
            return ally?.name ?? 'Unknown Ally';
        }
    };

    // Check if a character can defend (not exhausted, alive)
    const canDefend = (type: 'hero' | 'ally', hero?: Hero, ally?: Ally): boolean => {
        if (type === 'hero' && hero) {
            return !hero.exhausted && hero.damage < (hero.health ?? 99);
        }
        if (type === 'ally' && ally) {
            return !ally.exhausted && ally.damage < (ally.health ?? 99);
        }
        return false;
    };

    // Check if a character can attack (not exhausted, alive)
    const canAttack = (type: 'hero' | 'ally', hero?: Hero, ally?: Ally): boolean => {
        if (type === 'hero' && hero) {
            return !hero.exhausted && hero.damage < (hero.health ?? 99);
        }
        if (type === 'ally' && ally) {
            return !ally.exhausted && ally.damage < (ally.health ?? 99);
        }
        return false;
    };

    // Check if a character is selected as defender
    const isSelectedDefender = (ref: CharacterRef): boolean => {
        if (!combatState.selectedDefender) return false;
        return combatState.selectedDefender.type === ref.type &&
               combatState.selectedDefender.code === ref.code;
    };

    // Check if a character is selected as attacker
    const isSelectedAttacker = (ref: CharacterRef): boolean => {
        return combatState.selectedAttackers.some(
            a => a.type === ref.type && a.code === ref.code
        );
    };

    // Calculate total attack power of selected attackers
    const totalAttackPower = combatState.selectedAttackers.reduce((sum, ref) => {
        if (ref.type === 'hero') {
            const hero = heroes.find(h => h.code === ref.code);
            return sum + (hero?.attack ?? 0);
        } else {
            const ally = allies[ref.index];
            return sum + (ally?.attack ?? 0);
        }
    }, 0);

    // Get enemy stats
    const enemyAttack = currentEnemy.card.attack ?? 0;
    const enemyDefense = currentEnemy.card.defense ?? 0;
    const enemyHealth = currentEnemy.card.health ?? 1;

    // Get defender stats for damage preview
    const getDefenderStats = () => {
        if (!combatState.selectedDefender) return null;
        const ref = combatState.selectedDefender;
        if (ref.type === 'hero') {
            const hero = heroes.find(h => h.code === ref.code);
            return hero ? { defense: hero.defense ?? 0, name: hero.name } : null;
        } else {
            const ally = allies[ref.index];
            return ally ? { defense: ally.defense ?? 0, name: ally.name } : null;
        }
    };

    const defenderStats = getDefenderStats();
    const predictedDamageToDefender = defenderStats
        ? Math.max(0, enemyAttack - defenderStats.defense)
        : enemyAttack;
    const predictedDamageToEnemy = Math.max(0, totalAttackPower - enemyDefense);

    // Shadow card info
    const shadowCard = currentEnemy.shadowCards[0];
    const shadowText = shadowCard?.shadow;

    return (
        <div className="combat-panel">
            <div className="combat-panel__header">
                <h2 className="combat-panel__title">
                    ⚔️ Combat - {isDefendPhase ? 'Enemy Attack' : 'Player Attack'}
                </h2>
                <span className="combat-panel__enemy-count">
                    Enemy {combatState.currentEnemyIndex + 1}
                </span>
            </div>

            <div className="combat-panel__main">
                {/* Enemy Section */}
                <div className="combat-panel__enemy-section">
                    <h3 className="combat-panel__section-title">
                        {isDefendPhase ? 'Attacking Enemy' : 'Target Enemy'}
                    </h3>
                    <div className="combat-panel__enemy-card">
                        <CardDisplay card={currentEnemy.card} damage={currentEnemy.damage} disableZoom />
                    </div>
                    <div className="combat-panel__enemy-stats">
                        <span>⚔ ATK: {enemyAttack}</span>
                        <span>🛡 DEF: {enemyDefense}</span>
                        <span>❤ HP: {enemyHealth - currentEnemy.damage}/{enemyHealth}</span>
                    </div>

                    {/* Shadow Card Display */}
                    {isDefendPhase && shadowCard && (
                        <div className={`combat-panel__shadow ${combatState.shadowRevealed ? 'revealed' : ''}`}>
                            <span className="combat-panel__shadow-label">Shadow Card</span>
                            {combatState.shadowRevealed ? (
                                <>
                                    <span className="combat-panel__shadow-name">{shadowCard.name}</span>
                                    {shadowText && (
                                        <span className="combat-panel__shadow-text">"{shadowText}"</span>
                                    )}
                                </>
                            ) : (
                                <span className="combat-panel__shadow-hidden">🌑 Hidden</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Character Selection Section */}
                <div className="combat-panel__characters-section">
                    <h3 className="combat-panel__section-title">
                        {isDefendPhase ? 'Choose Defender' : 'Choose Attackers'}
                    </h3>

                    {/* Heroes */}
                    <div className="combat-panel__character-group">
                        <span className="combat-panel__group-label">Heroes</span>
                        <div className="combat-panel__character-list">
                            {heroes.map((hero, index) => {
                                const ref: CharacterRef = { type: 'hero', index, code: hero.code };
                                const available = isDefendPhase
                                    ? canDefend('hero', hero)
                                    : canAttack('hero', hero);
                                const selected = isDefendPhase
                                    ? isSelectedDefender(ref)
                                    : isSelectedAttacker(ref);

                                return (
                                    <div
                                        key={hero.code}
                                        className={`combat-panel__character ${selected ? 'selected' : ''} ${!available ? 'unavailable' : ''}`}
                                        onClick={() => {
                                            if (!available) return;
                                            if (isDefendPhase) {
                                                onSelectDefender(ref);
                                            } else {
                                                onToggleAttacker(ref);
                                            }
                                        }}
                                    >
                                        <span className="combat-panel__character-name">{hero.name}</span>
                                        <span className="combat-panel__character-stats">
                                            {isDefendPhase ? `🛡 ${hero.defense ?? 0}` : `⚔ ${hero.attack ?? 0}`}
                                        </span>
                                        {hero.exhausted && <span className="combat-panel__character-status">Exhausted</span>}
                                        {!available && !hero.exhausted && (
                                            <span className="combat-panel__character-status">Defeated</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Allies */}
                    {allies.length > 0 && (
                        <div className="combat-panel__character-group">
                            <span className="combat-panel__group-label">Allies</span>
                            <div className="combat-panel__character-list">
                                {allies.map((ally, index) => {
                                    const ref: CharacterRef = { type: 'ally', index, code: ally.code };
                                    const available = isDefendPhase
                                        ? canDefend('ally', undefined, ally)
                                        : canAttack('ally', undefined, ally);
                                    const selected = isDefendPhase
                                        ? isSelectedDefender(ref)
                                        : isSelectedAttacker(ref);

                                    return (
                                        <div
                                            key={`${ally.code}-${index}`}
                                            className={`combat-panel__character ${selected ? 'selected' : ''} ${!available ? 'unavailable' : ''}`}
                                            onClick={() => {
                                                if (!available) return;
                                                if (isDefendPhase) {
                                                    onSelectDefender(ref);
                                                } else {
                                                    onToggleAttacker(ref);
                                                }
                                            }}
                                        >
                                            <span className="combat-panel__character-name">{ally.name}</span>
                                            <span className="combat-panel__character-stats">
                                                {isDefendPhase ? `🛡 ${ally.defense ?? 0}` : `⚔ ${ally.attack ?? 0}`}
                                            </span>
                                            {ally.exhausted && <span className="combat-panel__character-status">Exhausted</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Combat Preview Section */}
                <div className="combat-panel__preview-section">
                    <h3 className="combat-panel__section-title">Combat Preview</h3>

                    {isDefendPhase && (
                        <div className="combat-panel__preview">
                            {combatState.selectedDefender ? (
                                <>
                                    <div className="combat-panel__preview-row">
                                        <span>Enemy Attack:</span>
                                        <span>{enemyAttack}</span>
                                    </div>
                                    <div className="combat-panel__preview-row">
                                        <span>{defenderStats?.name} Defense:</span>
                                        <span>-{defenderStats?.defense ?? 0}</span>
                                    </div>
                                    <div className="combat-panel__preview-row combat-panel__preview-result">
                                        <span>Damage to Defender:</span>
                                        <span className={predictedDamageToDefender > 0 ? 'damage' : 'blocked'}>
                                            {predictedDamageToDefender}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div className="combat-panel__preview-empty">
                                    <p>Select a defender or skip to take undefended damage</p>
                                    <p className="combat-panel__preview-warning">
                                        ⚠️ Undefended: {enemyAttack} damage to a hero
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {isAttackPhase && (
                        <div className="combat-panel__preview">
                            {combatState.selectedAttackers.length > 0 ? (
                                <>
                                    <div className="combat-panel__preview-row">
                                        <span>Total Attack ({combatState.selectedAttackers.length} chars):</span>
                                        <span>{totalAttackPower}</span>
                                    </div>
                                    <div className="combat-panel__preview-row">
                                        <span>Enemy Defense:</span>
                                        <span>-{enemyDefense}</span>
                                    </div>
                                    <div className="combat-panel__preview-row combat-panel__preview-result">
                                        <span>Damage to Enemy:</span>
                                        <span className={predictedDamageToEnemy > 0 ? 'damage' : 'blocked'}>
                                            {predictedDamageToEnemy}
                                        </span>
                                    </div>
                                    {currentEnemy.damage + predictedDamageToEnemy >= enemyHealth && (
                                        <div className="combat-panel__preview-kill">
                                            💀 This will destroy {currentEnemy.card.name}!
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="combat-panel__preview-empty">
                                    <p>Select attackers or skip to deal no damage</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="combat-panel__actions">
                {isDefendPhase && (
                    <>
                        <button
                            className="combat-panel__btn combat-panel__btn--skip"
                            onClick={onSkipDefense}
                        >
                            Skip Defense (Undefended)
                        </button>
                        <button
                            className="combat-panel__btn combat-panel__btn--confirm"
                            onClick={onConfirmDefense}
                            disabled={!combatState.selectedDefender}
                        >
                            Confirm Defender
                        </button>
                    </>
                )}

                {isAttackPhase && (
                    <>
                        <button
                            className="combat-panel__btn combat-panel__btn--skip"
                            onClick={onSkipAttack}
                        >
                            Skip Attack
                        </button>
                        <button
                            className="combat-panel__btn combat-panel__btn--confirm"
                            onClick={onConfirmAttack}
                            disabled={combatState.selectedAttackers.length === 0}
                        >
                            Attack! ({totalAttackPower} ATK)
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

export default CombatPanel;
