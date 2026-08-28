#!/usr/bin/env node

import { dmxRelayConfigFromEnv, startDmxRelay } from "../src/domain/dmxRelay.js";

const config = dmxRelayConfigFromEnv(process.env);
const relay = await startDmxRelay(config);

process.stdout.write(`PlotForge DMX relay listening on ws://${relay.config.bindHost}:${relay.config.wsPort}\n`);
process.stdout.write(`Health: http://${relay.config.bindHost}:${relay.config.wsPort}/health\n`);
if (relay.config.requireToken) {
  process.stdout.write(`DMX relay token: ${relay.token}\n`);
}

async function shutdown() {
  await relay.close();
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown();
});
process.on("SIGTERM", () => {
  void shutdown();
});
