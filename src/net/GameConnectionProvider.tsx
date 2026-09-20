import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { GameClient, type ConnectionStatus } from './gameClient';
import type { GameAction, GameStateView } from '../shared/protocol';

interface GameConnectionValue {
  state: GameStateView | null;
  status: ConnectionStatus;
  error: string | null;
  send: (action: GameAction) => void;
}

const GameConnectionContext = createContext<GameConnectionValue | null>(null);

export function GameConnectionProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new GameClient());
  const [state, setState] = useState<GameStateView | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeMessage = client.onMessage((message) => {
      if (message.type === 'state') {
        setState(message.state);
        setError(null);
      } else {
        setError(message.message);
      }
    });
    const unsubscribeStatus = client.onStatusChange(setStatus);
    client.connect();
    return () => {
      unsubscribeMessage();
      unsubscribeStatus();
      client.disconnect();
    };
  }, [client]);

  const send = (action: GameAction) => client.send(action);

  return (
    <GameConnectionContext.Provider value={{ state, status, error, send }}>
      {children}
    </GameConnectionContext.Provider>
  );
}

export function useGameConnection(): GameConnectionValue {
  const value = useContext(GameConnectionContext);
  if (!value) {
    throw new Error('useGameConnection must be used within a GameConnectionProvider');
  }
  return value;
}
