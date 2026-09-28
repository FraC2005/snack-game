import { useState, useEffect, useCallback, useRef } from 'react';

type Position = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type GameState = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type Difficulty = 'easy' | 'medium' | 'hard';

const GRID_SIZE = 20;
const DIFFICULTY_SPEEDS: Record<Difficulty, number> = {
  easy: 180,
  medium: 120,
  hard: 70,
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Facile',
  medium: 'Medio',
  hard: 'Difficile',
};

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

function getRandomFood(snake: Position[]): Position {
  let food: Position;
  do {
    food = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(seg => seg.x === food.x && seg.y === food.y));
  return food;
}

export default function App() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomFood(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showSettings, setShowSettings] = useState(false);

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('IDLE');
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Sync refs
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Save high score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  const resetGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomFood(initialSnake));
    setDirection('RIGHT');
    directionRef.current = 'RIGHT';
    setScore(0);
    setGameState('IDLE');
  }, []);

  const startGame = useCallback(() => {
    if (gameState === 'GAME_OVER' || gameState === 'IDLE') {
      const initialSnake = getInitialSnake();
      setSnake(initialSnake);
      setFood(getRandomFood(initialSnake));
      setDirection('RIGHT');
      directionRef.current = 'RIGHT';
      setScore(0);
    }
    setGameState('PLAYING');
  }, [gameState]);

  const togglePause = useCallback(() => {
    if (gameState === 'PLAYING') {
      setGameState('PAUSED');
    } else if (gameState === 'PAUSED') {
      setGameState('PLAYING');
    }
  }, [gameState]);

  const changeDirection = useCallback((newDir: Direction) => {
    const current = directionRef.current;
    const opposites: Record<Direction, Direction> = {
      UP: 'DOWN',
      DOWN: 'UP',
      LEFT: 'RIGHT',
      RIGHT: 'LEFT',
    };
    if (opposites[newDir] !== current) {
      setDirection(newDir);
      directionRef.current = newDir;
    }
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP',
        ArrowDown: 'DOWN',
        ArrowLeft: 'LEFT',
        ArrowRight: 'RIGHT',
        w: 'UP',
        s: 'DOWN',
        a: 'LEFT',
        d: 'RIGHT',
        W: 'UP',
        S: 'DOWN',
        A: 'LEFT',
        D: 'RIGHT',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        if (gameStateRef.current === 'IDLE' || gameStateRef.current === 'GAME_OVER') {
          startGame();
        }
        if (gameStateRef.current === 'PLAYING') {
          changeDirection(keyMap[e.key]);
        }
      }

      if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameStateRef.current === 'IDLE' || gameStateRef.current === 'GAME_OVER') {
          startGame();
        } else {
          togglePause();
        }
      }

      if (e.key === 'r' || e.key === 'R') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, startGame, togglePause, resetGame]);

  // Touch controls
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touch.clientY - touchStartRef.current.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) {
        // Tap - toggle pause or start
        if (gameStateRef.current === 'IDLE' || gameStateRef.current === 'GAME_OVER') {
          startGame();
        } else {
          togglePause();
        }
        touchStartRef.current = null;
        return;
      }

      if (gameStateRef.current === 'IDLE' || gameStateRef.current === 'GAME_OVER') {
        startGame();
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
      } else {
        changeDirection(dy > 0 ? 'DOWN' : 'UP');
      }
      touchStartRef.current = null;
    };

    board.addEventListener('touchstart', handleTouchStart, { passive: true });
    board.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      board.removeEventListener('touchstart', handleTouchStart);
      board.removeEventListener('touchend', handleTouchEnd);
    };
  }, [changeDirection, startGame, togglePause]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'PLAYING') {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = window.setInterval(() => {
      setSnake(prevSnake => {
        const head = prevSnake[0];
        const dir = directionRef.current;
        const moves: Record<Direction, Position> = {
          UP: { x: head.x, y: head.y - 1 },
          DOWN: { x: head.x, y: head.y + 1 },
          LEFT: { x: head.x - 1, y: head.y },
          RIGHT: { x: head.x + 1, y: head.y },
        };
        const newHead = moves[dir];

        // Wall collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setGameState('GAME_OVER');
          return prevSnake;
        }

        // Self collision
        if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
          setGameState('GAME_OVER');
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Food collision
        setFood(currentFood => {
          if (newHead.x === currentFood.x && newHead.y === currentFood.y) {
            setScore(s => s + 10);
            const newFood = getRandomFood(newSnake);
            return newFood;
          }
          newSnake.pop();
          return currentFood;
        });

        return newSnake;
      });
    }, DIFFICULTY_SPEEDS[difficulty]);

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState, difficulty]);

  const getSegmentStyle = (index: number): string => {
    if (index === 0) return 'bg-emerald-400 shadow-lg shadow-emerald-400/50 scale-105';
    const opacity = Math.max(0.4, 1 - index * 0.03);
    return `bg-emerald-500 rounded-sm`;
  };

  const isSnakeSegment = (x: number, y: number): number => {
    return snake.findIndex(seg => seg.x === x && seg.y === y);
  };

  const isFood = (x: number, y: number): boolean => {
    return food.x === x && food.y === y;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <span className="text-3xl">🐍</span>
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              Snake
            </span>
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white transition-all duration-200"
            title="Impostazioni"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Score Panel */}
        <div className="flex gap-3 mb-3">
          <div className="flex-1 bg-gray-800/80 backdrop-blur rounded-xl p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Punteggio</div>
            <div className="text-2xl font-bold text-emerald-400">{score}</div>
          </div>
          <div className="flex-1 bg-gray-800/80 backdrop-blur rounded-xl p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Record</div>
            <div className="text-2xl font-bold text-yellow-400">{highScore}</div>
          </div>
          <div className="flex-1 bg-gray-800/80 backdrop-blur rounded-xl p-3 border border-gray-700/50">
            <div className="text-xs text-gray-400 uppercase tracking-wider">Difficoltà</div>
            <div className="text-lg font-bold text-purple-400">{DIFFICULTY_LABELS[difficulty]}</div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800/90 backdrop-blur rounded-xl p-4 mb-3 border border-gray-700/50 animate-fadeIn">
            <h3 className="text-white font-semibold mb-3">Difficoltà</h3>
            <div className="flex gap-2">
              {(Object.keys(DIFFICULTY_SPEEDS) as Difficulty[]).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    setDifficulty(d);
                    if (gameState === 'IDLE') resetGame();
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    difficulty === d
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {DIFFICULTY_LABELS[d]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Board */}
      <div
        ref={boardRef}
        className="relative bg-gray-800/50 backdrop-blur rounded-2xl border-2 border-gray-700/50 p-1 shadow-2xl shadow-black/50"
        style={{ touchAction: 'none' }}
      >
        <div
          className="grid gap-0 relative"
          style={{
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            width: 'min(80vw, 400px)',
            height: 'min(80vw, 400px)',
          }}
        >
          {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
            const x = i % GRID_SIZE;
            const y = Math.floor(i / GRID_SIZE);
            const snakeIdx = isSnakeSegment(x, y);
            const foodCell = isFood(x, y);
            const isCheckerDark = (x + y) % 2 === 0;

            return (
              <div
                key={i}
                className={`relative aspect-square ${
                  isCheckerDark ? 'bg-gray-800/40' : 'bg-gray-800/20'
                } ${snakeIdx === 0 ? 'rounded-md' : snakeIdx > 0 ? 'rounded-sm' : ''}`}
              >
                {snakeIdx >= 0 && (
                  <div
                    className={`absolute inset-0.5 ${getSegmentStyle(snakeIdx)} transition-all duration-75 ${
                      snakeIdx === 0 ? 'rounded-md z-10' : 'rounded-sm'
                    }`}
                    style={{
                      opacity: snakeIdx === 0 ? 1 : Math.max(0.5, 1 - snakeIdx * 0.025),
                    }}
                  >
                    {snakeIdx === 0 && (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="flex gap-0.5">
                          <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                          <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {foodCell && (
                  <div className="absolute inset-0.5 flex items-center justify-center animate-pulse">
                    <div className="w-full h-full bg-red-500 rounded-full shadow-lg shadow-red-500/50 animate-bounce-subtle"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overlay States */}
        {gameState === 'IDLE' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-20">
            <div className="text-5xl mb-4 animate-bounce">🐍</div>
            <h2 className="text-2xl font-bold text-white mb-2">Snake Game</h2>
            <p className="text-gray-300 text-sm mb-4 text-center px-4">
              Premi Spazio o tocca per iniziare
            </p>
            <button
              onClick={startGame}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ▶ Gioca
            </button>
          </div>
        )}

        {gameState === 'PAUSED' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl z-20">
            <div className="text-4xl mb-3">⏸️</div>
            <h2 className="text-2xl font-bold text-white mb-2">Pausa</h2>
            <p className="text-gray-300 text-sm mb-4">
              Premi Spazio per continuare
            </p>
            <button
              onClick={togglePause}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ▶ Continua
            </button>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm rounded-2xl z-20">
            <div className="text-4xl mb-3">💀</div>
            <h2 className="text-2xl font-bold text-red-400 mb-1">Game Over!</h2>
            <p className="text-gray-300 text-lg mb-1">
              Punteggio: <span className="text-emerald-400 font-bold">{score}</span>
            </p>
            {score >= highScore && score > 0 && (
              <p className="text-yellow-400 text-sm mb-2 animate-pulse">🏆 Nuovo Record!</p>
            )}
            <div className="flex gap-3 mt-3">
              <button
                onClick={startGame}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                🔄 Rigioca
              </button>
              <button
                onClick={resetGame}
                className="px-5 py-2.5 bg-gray-600 hover:bg-gray-500 text-white font-bold rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95"
              >
                ⚙ Menu
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls Info */}
      <div className="w-full max-w-lg mt-4">
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={gameState === 'PLAYING' ? togglePause : startGame}
            className="px-4 py-2 bg-gray-700/70 hover:bg-gray-600/70 text-gray-200 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
          >
            {gameState === 'PLAYING' ? '⏸ Pausa' : '▶ Gioca'}
          </button>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-gray-700/70 hover:bg-gray-600/70 text-gray-200 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
          >
            🔄 Reset
          </button>
          <button
            onClick={() => {
              const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
              const idx = diffs.indexOf(difficulty);
              setDifficulty(diffs[(idx + 1) % 3]);
            }}
            className="px-4 py-2 bg-gray-700/70 hover:bg-gray-600/70 text-gray-200 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95"
          >
            ⚡ {DIFFICULTY_LABELS[difficulty]}
          </button>
        </div>

        {/* Mobile D-Pad */}
        <div className="mt-4 flex justify-center md:hidden">
          <div className="grid grid-cols-3 gap-1 w-36">
            <div></div>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState !== 'PLAYING') startGame(); changeDirection('UP'); }}
              className="p-3 bg-gray-700/80 hover:bg-gray-600/80 active:bg-emerald-600 rounded-lg text-white text-xl transition-colors duration-100"
            >
              ↑
            </button>
            <div></div>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState !== 'PLAYING') startGame(); changeDirection('LEFT'); }}
              className="p-3 bg-gray-700/80 hover:bg-gray-600/80 active:bg-emerald-600 rounded-lg text-white text-xl transition-colors duration-100"
            >
              ←
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); togglePause(); }}
              className="p-3 bg-gray-700/80 hover:bg-gray-600/80 active:bg-blue-600 rounded-lg text-white text-xs font-bold transition-colors duration-100"
            >
              {gameState === 'PLAYING' ? '⏸' : '▶'}
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState !== 'PLAYING') startGame(); changeDirection('RIGHT'); }}
              className="p-3 bg-gray-700/80 hover:bg-gray-600/80 active:bg-emerald-600 rounded-lg text-white text-xl transition-colors duration-100"
            >
              →
            </button>
            <div></div>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (gameState !== 'PLAYING') startGame(); changeDirection('DOWN'); }}
              className="p-3 bg-gray-700/80 hover:bg-gray-600/80 active:bg-emerald-600 rounded-lg text-white text-xl transition-colors duration-100"
            >
              ↓
            </button>
            <div></div>
          </div>
        </div>

        {/* Keyboard hints - desktop only */}
        <div className="hidden md:flex justify-center gap-4 mt-4 text-xs text-gray-500">
          <span>← → ↑ ↓ Muovi</span>
          <span>Spazio Pausa</span>
          <span>R Reset</span>
        </div>
      </div>
    </div>
  );
}
