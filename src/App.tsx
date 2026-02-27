import { useEffect } from 'react';
import GameTable from './components/GameTable';
import { useGameStore } from './store/gameStore';
import { STARTER_DECK } from './data/decks';
import './App.css';

// ── App ────────────────────────────────────────────────────────────────────

export default function App() {
  const initGame = useGameStore((s) => s.initGame);
  const gameState = useGameStore((s) => s.gameState);

  useEffect(() => {
    // Load heroes and deck from the centralized card registry
    const heroes = STARTER_DECK.getHeroes();
    const playerDeck = STARTER_DECK.buildDeck();
    initGame(heroes, playerDeck);
  }, [initGame]);

  if (!gameState.players?.length) {
    return (
      <div style={{ background: '#0b0d0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5d76e', fontFamily: 'Palatino Linotype, serif', fontSize: 24 }}>
        Loading Passage Through Mirkwood…
      </div>
    );
  }

  return (
    <div className="game-wrapper">
      <GameTable />
    </div>
  );
}
