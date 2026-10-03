import type { ClientAction, GameAction, ServerMessage } from '../shared/protocol';

const TOKEN_KEY = 'card-game:player-token';
const MAX_RECONNECT_DELAY_MS = 5000;
const INITIAL_RECONNECT_DELAY_MS = 500;

function getToken(): string {
  // sessionStorage (not localStorage) so each browser tab gets its own
  // player identity — lets two tabs in the same browser act as the two
  // players, while a refresh within a tab still reclaims the same slot.
  let token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) {
    token = crypto.randomUUID();
    sessionStorage.setItem(TOKEN_KEY, token);
  }
  return token;
}

function getServerUrl(): string {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured) {
    return configured;
  }
  // The same origin the page itself came from, via the dev server's /ws proxy
  // (see vite.config.ts), rather than straight to the game server's own port.
  // One address then covers every way the game gets opened — localhost, this
  // machine's address on the network, or a public tunnel, where port 8787 is
  // not exposed at all and an https page may not open a plain ws:// socket.
  // Serving the built app without Vite in front of it is the one case this
  // doesn't cover; set VITE_WS_URL to the game server's address for that.
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}

export type ConnectionStatus = 'connecting' | 'open' | 'closed';

type MessageListener = (message: ServerMessage) => void;
type StatusListener = (status: ConnectionStatus) => void;

/** Thin WebSocket wrapper: connects, re-sends `hello` with a persisted
 *  player token on every (re)connect, and reconnects with backoff on drop. */
export class GameClient {
  private socket: WebSocket | null = null;
  private readonly messageListeners = new Set<MessageListener>();
  private readonly statusListeners = new Set<StatusListener>();
  private status: ConnectionStatus = 'connecting';
  private reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  private reconnectTimer: number | null = null;
  private closedByUser = false;

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  disconnect(): void {
    this.closedByUser = true;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.close();
  }

  send(action: GameAction): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(action));
    }
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  private open(): void {
    const socket = new WebSocket(getServerUrl());
    this.socket = socket;
    this.setStatus('connecting');

    socket.addEventListener('open', () => {
      this.reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      this.setStatus('open');
      const hello: ClientAction = { type: 'hello', token: getToken() };
      socket.send(JSON.stringify(hello));
    });

    socket.addEventListener('message', (event) => {
      const message = JSON.parse(event.data) as ServerMessage;
      this.messageListeners.forEach((listener) => listener(message));
    });

    socket.addEventListener('close', () => {
      this.setStatus('closed');
      if (!this.closedByUser) {
        this.scheduleReconnect();
      }
    });

    socket.addEventListener('error', () => {
      socket.close();
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) {
      return;
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.open();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }
}
