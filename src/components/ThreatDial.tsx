import './ThreatDial.css';

interface ThreatDialProps {
    threat: number;
    maxThreat?: number;
    onAdjust?: (delta: number) => void;
}

const R = 38; // arc radius
const CX = 50;
const CY = 50;
const CIRCUMFERENCE = 2 * Math.PI * R;

function getArcColor(threat: number, max: number) {
    const pct = threat / max;
    if (pct >= 1) return '#e53935';
    if (pct >= 0.8) return '#ef5350';
    if (pct >= 0.6) return '#ffa726';
    return '#66bb6a';
}

function getSeverityClass(threat: number, max: number) {
    const pct = threat / max;
    if (pct >= 1) return 'dead';
    if (pct >= 0.8) return 'danger';
    if (pct >= 0.6) return 'warn';
    return 'safe';
}

export function ThreatDial({ threat, maxThreat = 50, onAdjust }: ThreatDialProps) {
    const clamped = Math.max(0, Math.min(threat, maxThreat));
    const progress = clamped / maxThreat;
    const dashOffset = CIRCUMFERENCE * (1 - progress);
    const arcColor = getArcColor(clamped, maxThreat);
    const severityClass = getSeverityClass(clamped, maxThreat);

    return (
        <div className="threat-dial">
            <div className="threat-dial__svg-wrap">
                <svg
                    className="threat-dial__svg"
                    width="100"
                    height="100"
                    viewBox="0 0 100 100"
                >
                    {/* Track */}
                    <circle
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="8"
                    />
                    {/* Progress arc */}
                    <circle
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke={arcColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                        transform={`rotate(-90 ${CX} ${CY})`}
                        style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.4s ease' }}
                    />
                    {/* Max tick marks at 10, 20, 30, 40, 50 */}
                    {[10, 20, 30, 40, 50].map((v) => {
                        const angle = (v / maxThreat) * 360 - 90;
                        const rad = (angle * Math.PI) / 180;
                        const x1 = CX + (R - 6) * Math.cos(rad);
                        const y1 = CY + (R - 6) * Math.sin(rad);
                        const x2 = CX + (R + 1) * Math.cos(rad);
                        const y2 = CY + (R + 1) * Math.sin(rad);
                        return (
                            <line
                                key={v}
                                x1={x1} y1={y1} x2={x2} y2={y2}
                                stroke="rgba(255,255,255,0.2)"
                                strokeWidth="1.5"
                            />
                        );
                    })}
                </svg>

                <div className="threat-dial__number">
                    <span className={`threat-dial__value ${severityClass}`}>{clamped}</span>
                    <span className="threat-dial__slash">/ {maxThreat}</span>
                </div>
            </div>

            {onAdjust && (
                <div className="threat-dial__btns">
                    <button
                        className="threat-dial__btn"
                        onClick={() => onAdjust(-1)}
                        disabled={clamped <= 0}
                        title="Reduce threat"
                    >
                        −
                    </button>
                    <button
                        className="threat-dial__btn"
                        onClick={() => onAdjust(+1)}
                        disabled={clamped >= maxThreat}
                        title="Increase threat"
                    >
                        +
                    </button>
                </div>
            )}
        </div>
    );
}

export default ThreatDial;
