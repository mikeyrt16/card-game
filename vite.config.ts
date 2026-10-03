import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on every interface, not just localhost, so the game is reachable
    // from another device on the network rather than only this machine.
    host: true,
    // Vite turns away requests whose Host header it doesn't recognise. A
    // tunnel serves the app from a hostname it has never heard of, so the
    // services used for that are named here — otherwise the visitor just gets
    // "Blocked request. This host is not allowed." Set this to `true` to allow
    // any host if you use a tunnel that isn't on the list.
    allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok-free.app', '.ngrok.app', '.ngrok.io'],
    proxy: {
      // The game server is a separate process on 8787. Passing its socket
      // through the dev server means the page and its WebSocket share a single
      // origin, which is what makes both of these work:
      //   - a tunnel, which forwards only this one port, so 8787 is not
      //     reachable from outside at all;
      //   - an https page, which browsers forbid from opening an insecure
      //     ws:// connection (mixed content) — over a tunnel this becomes
      //     wss:// on the tunnel's own certificate, and is allowed.
      // See getServerUrl in src/net/gameClient.ts for the other half.
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
})
