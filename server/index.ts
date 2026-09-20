import { WebSocket, WebSocketServer } from 'ws';
import { applyAction, buildView, createEmptyPlayer, createInitialState } from './gameEngine';
import type { ClientAction, PlayerSlot, ServerMessage } from '../src/shared/protocol';

const PORT = Number(process.env.PORT) || 8787;
const SLOTS: PlayerSlot[] = ['player1', 'player2'];

const state = createInitialState();
const sockets = new Map<PlayerSlot, WebSocket>();

function send(slot: PlayerSlot, message: ServerMessage): void {
  const socket = sockets.get(slot);
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function broadcastState(): void {
  for (const slot of SLOTS) {
    if (state.players[slot].token) {
      send(slot, { type: 'state', state: buildView(state, slot) });
    }
  }
}

function assignSlot(token: string): PlayerSlot | null {
  for (const slot of SLOTS) {
    if (state.players[slot].token === token) {
      return slot;
    }
  }
  for (const slot of SLOTS) {
    if (!state.players[slot].token) {
      return slot;
    }
  }
  // Both slots belong to other tokens — but a slot whose owner isn't
  // currently connected (closed tab, abandoned test session) shouldn't
  // permanently lock a seat. Reclaim the first disconnected one.
  for (const slot of SLOTS) {
    if (!state.players[slot].connected) {
      return slot;
    }
  }
  return null;
}

const wss = new WebSocketServer({ port: PORT });

wss.on('connection', (ws) => {
  let mySlot: PlayerSlot | null = null;

  ws.on('message', (raw) => {
    let action: ClientAction;
    try {
      action = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (action.type === 'hello') {
      const slot = assignSlot(action.token);
      if (!slot) {
        const full: ServerMessage = { type: 'error', message: 'Game full' };
        ws.send(JSON.stringify(full));
        ws.close();
        return;
      }
      mySlot = slot;
      const player = state.players[slot];
      if (player.token !== action.token) {
        // Taking over a slot abandoned by a different token — start that
        // seat fresh rather than handing this new player someone else's
        // in-progress hand/deck.
        Object.assign(player, createEmptyPlayer());
      }
      player.token = action.token;
      player.connected = true;
      sockets.set(slot, ws);
      broadcastState();
      return;
    }

    if (!mySlot) {
      // Must say hello (and be assigned a slot) before sending game actions.
      return;
    }
    applyAction(state, mySlot, action);
    broadcastState();
  });

  ws.on('close', () => {
    if (mySlot && sockets.get(mySlot) === ws) {
      state.players[mySlot].connected = false;
      sockets.delete(mySlot);
      broadcastState();
    }
  });
});

console.log(`Game server listening on ws://localhost:${PORT}`);
