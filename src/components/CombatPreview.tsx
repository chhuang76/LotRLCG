import './CombatPreview.css';

interface CombatPreviewProps {
    step: 'defend' | 'attack';
    enemyName: string;
    enemyAttack: number;
    defenderName?: string;
    defenderDefense?: number;
    predictedDamageToDefender: number;
    totalAttackPower: number;
    enemyDefense: number;
    predictedDamageToEnemy: number;
    willDestroy: boolean;
    shadowRevealed: boolean;
}

/**
 * CombatPreview - overlay anchored middle-right of the player zone during the
 * combat_defend / combat_attack steps. Mirrors QuestPreview's style/anchor.
 */
export function CombatPreview({
    step,
    enemyName,
    enemyAttack,
    defenderName,
    defenderDefense,
    predictedDamageToDefender,
    totalAttackPower,
    enemyDefense,
    predictedDamageToEnemy,
    willDestroy,
    shadowRevealed,
}: CombatPreviewProps) {
    if (step === 'defend') {
        const undefended = !defenderName;
        const resultClass = undefended ? 'negative' : predictedDamageToDefender > 0 ? 'negative' : 'positive';
        return (
            <div className="combat-preview">
                <div className="combat-preview__title">Defend · {enemyName}</div>
                <div className="combat-preview__row">
                    <span>Enemy Attack</span>
                    <span className="combat-preview__atk">⚔ {enemyAttack}</span>
                </div>
                {undefended ? (
                    <div className="combat-preview__result negative">
                        Undefended: {predictedDamageToDefender} to a hero
                    </div>
                ) : (
                    <>
                        <div className="combat-preview__row">
                            <span>Defense</span>
                            <span className="combat-preview__def">🛡 {defenderDefense ?? 0}</span>
                        </div>
                        <div className={`combat-preview__result ${resultClass}`}>
                            {defenderName} takes {predictedDamageToDefender}
                        </div>
                    </>
                )}
                {!shadowRevealed && (
                    <div className="combat-preview__hint">🌑 Shadow hidden</div>
                )}
            </div>
        );
    }

    const resultClass = willDestroy ? 'positive' : predictedDamageToEnemy > 0 ? 'positive' : 'neutral';
    return (
        <div className="combat-preview">
            <div className="combat-preview__title">Attack · {enemyName}</div>
            <div className="combat-preview__row">
                <span>Attack Power</span>
                <span className="combat-preview__atk">⚔ {totalAttackPower}</span>
            </div>
            <div className="combat-preview__row">
                <span>Enemy Defense</span>
                <span className="combat-preview__def">🛡 {enemyDefense}</span>
            </div>
            <div className={`combat-preview__result ${resultClass}`}>
                Deals {predictedDamageToEnemy}
            </div>
            {willDestroy && (
                <div className="combat-preview__hint combat-preview__hint--lethal">
                    💀 Destroys {enemyName}!
                </div>
            )}
        </div>
    );
}

export default CombatPreview;
