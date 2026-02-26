import { useState, useRef, useEffect } from 'react';
import './LogPanel.css';

export type LogEntryType = 'phase' | 'damage' | 'resource' | 'threat' | 'setup' | 'info' | 'ability' | 'error';

export interface LogEntry {
    id: string;
    round: number;
    phase: string;
    message: string;
    type: LogEntryType;
    timestamp: number;
}

interface LogPanelProps {
    entries: LogEntry[];
    defaultOpen?: boolean;
}

function formatTime(ts: number): string {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function LogPanel({ entries, defaultOpen = false }: LogPanelProps) {
    const [open, setOpen] = useState(defaultOpen);
    const bodyRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to newest entry
    useEffect(() => {
        if (open && bodyRef.current) {
            bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        }
    }, [entries, open]);

    return (
        <div className="log-panel">
            <button className="log-panel__toggle" onClick={() => setOpen((v) => !v)}>
                <span>📜 Game Log {entries.length > 0 ? `(${entries.length})` : ''}</span>
                <span className={`log-panel__chevron${open ? ' open' : ''}`}>▲</span>
            </button>

            {open && (
                <div className="log-panel__body" ref={bodyRef}>
                    {entries.length === 0 ? (
                        <div className="log-panel__empty">No events yet.</div>
                    ) : (
                        entries.map((e) => (
                            <div key={e.id} className={`log-panel__entry type-${e.type}`}>
                                <span className="log-panel__time">{formatTime(e.timestamp)}</span>
                                <span className="log-panel__msg">{e.message}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

// ── Builder helper used by game engine / store ──────────────────────────────

let _seq = 0;
export function createLogEntry(
    round: number,
    phase: string,
    message: string,
    type: LogEntryType = 'info'
): LogEntry {
    return {
        id: `log-${++_seq}`,
        round,
        phase,
        message,
        type,
        timestamp: Date.now(),
    };
}

export default LogPanel;
