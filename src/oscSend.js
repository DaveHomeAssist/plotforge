// Shared browser-side OSC transport: one-shot WebSocket to the local relay
// (`npm run osc:relay`). Used by the OSC bridge panel and Rig Check mode.

export function sendOscRoute({ relayUrl, route, timeoutMs = 2500 }) {
  return new Promise((resolve, reject) => {
    if (!route) {
      reject(new Error("Select a fixture before sending OSC."));
      return;
    }
    if (!window.WebSocket) {
      reject(new Error("WebSocket is not available in this browser."));
      return;
    }

    const socket = new WebSocket(relayUrl);
    const timer = window.setTimeout(() => {
      socket.close();
      reject(new Error("OSC relay timed out."));
    }, timeoutMs);

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        address: route.address,
        args: route.args,
        targetHost: route.targetHost,
        targetPort: route.targetPort,
      }));
    }, { once: true });

    socket.addEventListener("message", (event) => {
      window.clearTimeout(timer);
      socket.close();
      resolve(event.data);
    }, { once: true });

    socket.addEventListener("error", () => {
      window.clearTimeout(timer);
      reject(new Error("OSC relay connection failed."));
    }, { once: true });
  });
}
