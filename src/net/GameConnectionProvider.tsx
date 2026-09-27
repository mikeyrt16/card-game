import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
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

  // Both of these are load-bearing for anything that streams, and `client` is
  // created once (see the useState above) so they're stable for the app's life.
  //
  // An unstable `send` breaks realtime updates rather than merely costing a few
  // renders. Consumers put it in effect dependency arrays, so a new identity on
  // every render tears those effects down and sets them up again — and the
  // cursor/dragged-card effect in GameRoute cancels its pending animation frame
  // on teardown. Since every send is answered with a broadcast, which sets
  // state here, which re-renders: each position queued for the next frame was
  // being thrown away before that frame could fire, so positions only escaped
  // when one happened to win the race. It also made every `[..., send]` effect
  // re-fire on each render, so a single one that sends (setHandOpen) became a
  // broadcast/render feedback loop that flooded the socket.
  const send = useCallback((action: GameAction) => client.send(action), [client]);

  const value = useMemo(() => ({ state, status, error, send }), [state, status, error, send]);

  return <GameConnectionContext.Provider value={value}>{children}</GameConnectionContext.Provider>;
}

export function useGameConnection(): GameConnectionValue {
  const value = useContext(GameConnectionContext);
  if (!value) {
    throw new Error('useGameConnection must be used within a GameConnectionProvider');
  }
  return value;
}
