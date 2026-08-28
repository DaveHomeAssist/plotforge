import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DmxOutputPanel from "../components/DmxOutputPanel.jsx";
import { DMX_OUTPUT_INTENTS } from "../domain/dmxOutput.js";
import goldenDoc from "./fixtures/dmx-output/golden-doc.json";

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = FakeWebSocket.CONNECTING;
    this.listeners = new Map();
    this.sent = [];
    FakeWebSocket.instances.push(this);
    window.setTimeout(() => {
      this.readyState = FakeWebSocket.OPEN;
      this.dispatch("open", {});
    }, 0);
  }

  addEventListener(type, handler, options = {}) {
    const list = this.listeners.get(type) || [];
    list.push({ handler, once: Boolean(options.once) });
    this.listeners.set(type, list);
  }

  dispatch(type, event) {
    const list = this.listeners.get(type) || [];
    this.listeners.set(type, list.filter(item => !item.once));
    for (const item of list) item.handler(event);
  }

  send(payload) {
    this.sent.push(JSON.parse(payload));
  }

  close() {
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatch("close", {});
  }

  serverMessage(payload) {
    this.dispatch("message", { data: JSON.stringify(payload) });
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  FakeWebSocket.instances = [];
  window.WebSocket = FakeWebSocket;
});

afterEach(() => {
  vi.useRealTimers();
});

async function armPanel() {
  fireEvent.change(screen.getByLabelText("Relay token"), { target: { value: "test-token" } });
  fireEvent.click(screen.getByRole("button", { name: "Arm output" }));
  await waitFor(() => expect(FakeWebSocket.instances).toHaveLength(1));
  const socket = FakeWebSocket.instances[0];
  await waitFor(() => expect(socket.sent).toHaveLength(1));
  expect(socket.sent[0]).toEqual({ type: "auth", protocolVersion: 1, token: "test-token" });
  await act(async () => {
    socket.serverMessage({ type: "auth.ok", relayVersion: "0.1.0", maxFps: 20, boundHost: "127.0.0.1" });
  });
  await screen.findByText("Output armed.");
  return socket;
}

describe("DmxOutputPanel", () => {
  it("loads persisted relay route preferences without restoring a token", () => {
    const doc = {
      ...goldenDoc,
      dmxOutput: {
        relayUrl: "ws://127.0.0.1:8770",
        token: "not-persisted",
        targetHost: "192.168.1.40",
        targetPort: 6455,
        universes: {
          "1": { net: 2, subNet: 3, universe: 4, targetHost: "192.168.1.41" },
        },
      },
    };

    render(React.createElement(DmxOutputPanel, {
      doc,
      selectedFixtureId: "fx_led_one",
    }));

    expect(screen.getByLabelText("Protocol")).toHaveValue("artnet");
    expect(screen.getByLabelText("Relay URL")).toHaveValue("ws://127.0.0.1:8770");
    expect(screen.getByLabelText("Relay token")).toHaveValue("");
    expect(screen.getByLabelText("Target host")).toHaveValue("192.168.1.41");
    expect(screen.getByLabelText("Target port")).toHaveValue("6455");
    expect(screen.getByLabelText("Net")).toHaveValue("2");
    expect(screen.getByLabelText("Sub-Net")).toHaveValue("3");
    expect(screen.getByLabelText("Universe")).toHaveValue("4");
  });

  it("loads persisted sACN route preferences with protocol-specific universe mapping", () => {
    const doc = {
      ...goldenDoc,
      dmxOutput: {
        protocol: "sacn",
        relayUrl: "ws://127.0.0.1:8770",
        targetHost: "192.168.1.40",
        universes: {
          "1": { universe: 25, targetHost: "192.168.1.42" },
        },
      },
    };

    render(React.createElement(DmxOutputPanel, {
      doc,
      selectedFixtureId: "fx_led_one",
    }));

    expect(screen.getByLabelText("Protocol")).toHaveValue("sacn");
    expect(screen.getByLabelText("Target host")).toHaveValue("192.168.1.42");
    expect(screen.getByLabelText("Target port")).toHaveValue("5568");
    expect(screen.getByLabelText("Net")).toBeDisabled();
    expect(screen.getByLabelText("Sub-Net")).toBeDisabled();
    expect(screen.getByLabelText("sACN universe")).toHaveValue("25");
  });

  it("persists safe relay route preferences without persisting the relay token", () => {
    const onSettingsChange = vi.fn();

    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
      onSettingsChange,
    }));

    fireEvent.change(screen.getByLabelText("Target host"), { target: { value: "192.168.1.44" } });

    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({
      protocol: "artnet",
      relayUrl: "ws://127.0.0.1:8766",
      targetHost: "192.168.1.44",
      targetPort: 6454,
      universes: {
        "1": {
          net: 0,
          subNet: 0,
          universe: 0,
          targetHost: "192.168.1.44",
        },
      },
    }));

    fireEvent.change(screen.getByLabelText("Relay URL"), { target: { value: "ws://127.0.0.1:8770" } });
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({
      relayUrl: "ws://127.0.0.1:8770",
    }));

    fireEvent.change(screen.getByLabelText("Universe"), { target: { value: "4" } });
    expect(onSettingsChange).toHaveBeenLastCalledWith(expect.objectContaining({
      universes: {
        "1": expect.objectContaining({ universe: 4 }),
      },
    }));

    const persistedCallCount = onSettingsChange.mock.calls.length;
    fireEvent.change(screen.getByLabelText("Relay token"), { target: { value: "test-token" } });
    expect(onSettingsChange).toHaveBeenCalledTimes(persistedCallCount);
    expect(onSettingsChange.mock.calls.flat()).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ token: "test-token" }),
    ]));
  });

  it("renders preview status, compiler warnings, and universe inspector ranges", () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    expect(screen.getByRole("heading", { name: "DMX output" })).toBeInTheDocument();
    expect(screen.getByText("OUTPUT TEST MODE - Not for show use")).toBeInTheDocument();
    expect(screen.getByText("idle")).toBeInTheDocument();
    expect(screen.getByText("mapped")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send test frame" })).toBeDisabled();

    const ranges = screen.getByLabelText("DMX fixture ranges");
    expect(within(ranges).getByText("U1 10-17")).toBeInTheDocument();
    expect(within(ranges).getByText("1ST ELEC U2")).toBeInTheDocument();
    expect(within(ranges).getByText("selected")).toBeInTheDocument();

    const slots = screen.getByLabelText("DMX non zero slots");
    expect(within(slots).getByText(/10: 255 intensity - Generic RGBW 8ch with dimmer slot 1 writes intensity/)).toBeInTheDocument();
    expect(within(slots).getByText(/13: 255 blue - Generic RGBW 8ch with dimmer slot 4 writes blue/)).toBeInTheDocument();
  });

  it("switches to blackout preview without nonzero slots", () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    fireEvent.change(screen.getByLabelText("Mode"), {
      target: { value: DMX_OUTPUT_INTENTS.blackout },
    });

    expect(screen.getByText("All slots zero.")).toBeInTheDocument();
    expect(screen.getByLabelText("Dimmer")).toBeDisabled();
  });

  it("requires arming before sending and emits a selected fixture frame after auth", async () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    expect(screen.getByRole("button", { name: "Arm output" })).toBeDisabled();
    const socket = await armPanel();
    expect(screen.getByRole("button", { name: "Send test frame" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Send test frame" }));
    await waitFor(() => expect(socket.sent).toHaveLength(2));
    const frame = socket.sent[1];
    const data = Buffer.from(frame.data, "base64");

    expect(frame).toEqual(expect.objectContaining({
      type: "frame",
      token: "test-token",
      protocol: "artnet",
      target: { host: "127.0.0.1", port: 6454 },
      portAddress: { net: 0, subNet: 0, universe: 0 },
      length: 512,
    }));
    expect(data[9]).toBe(255);
    expect(data[10]).toBe(255);
    expect(data[12]).toBe(255);
  });

  it("can switch to sACN and emit the selected fixture frame through the relay", async () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    fireEvent.change(screen.getByLabelText("Protocol"), { target: { value: "sacn" } });

    expect(screen.getByLabelText("Protocol")).toHaveValue("sacn");
    expect(screen.getByLabelText("Target port")).toHaveValue("5568");
    expect(screen.getByLabelText("Net")).toBeDisabled();
    expect(screen.getByLabelText("Sub-Net")).toBeDisabled();
    expect(screen.getByLabelText("sACN universe")).toHaveValue("1");

    const socket = await armPanel();
    fireEvent.click(screen.getByRole("button", { name: "Send test frame" }));
    await waitFor(() => expect(socket.sent).toHaveLength(2));
    const frame = socket.sent[1];
    const data = Buffer.from(frame.data, "base64");

    expect(frame).toEqual(expect.objectContaining({
      type: "frame",
      token: "test-token",
      protocol: "sacn",
      targetMode: "unicast",
      target: { host: "127.0.0.1", port: 5568 },
      universe: 1,
      sourceName: "PlotForge",
      priority: 100,
      length: 512,
    }));
    expect(frame.portAddress).toBeUndefined();
    expect(data[9]).toBe(255);
    expect(data[10]).toBe(255);
    expect(data[12]).toBe(255);
  });

  it("can switch sACN output to multicast with a derived target host", async () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    fireEvent.change(screen.getByLabelText("Protocol"), { target: { value: "sacn" } });
    fireEvent.change(screen.getByLabelText("Target mode"), { target: { value: "multicast" } });

    expect(screen.getByLabelText("Target mode")).toHaveValue("multicast");
    expect(screen.getByLabelText("Target host")).toHaveValue("239.255.0.1");
    expect(screen.getByLabelText("Target host")).toBeDisabled();

    const socket = await armPanel();
    fireEvent.click(screen.getByRole("button", { name: "Send test frame" }));
    await waitFor(() => expect(socket.sent).toHaveLength(2));
    const frame = socket.sent[1];

    expect(frame).toEqual(expect.objectContaining({
      type: "frame",
      token: "test-token",
      protocol: "sacn",
      targetMode: "multicast",
      target: { host: "239.255.0.1", port: 5568 },
      universe: 1,
      sourceName: "PlotForge",
      priority: 100,
      length: 512,
    }));
    expect(frame.portAddress).toBeUndefined();
  });

  it("sends blackout only after output is armed", async () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));

    expect(screen.getByRole("button", { name: "Blackout" })).toBeDisabled();
    const socket = await armPanel();

    fireEvent.click(screen.getByRole("button", { name: "Blackout" }));
    await waitFor(() => expect(socket.sent).toHaveLength(2));
    expect(socket.sent[1]).toEqual({ token: "test-token", type: "blackout" });
  });

  it("surfaces relay fault messages", async () => {
    render(React.createElement(DmxOutputPanel, {
      doc: goldenDoc,
      selectedFixtureId: "fx_led_one",
    }));
    const socket = await armPanel();

    await act(async () => {
      socket.serverMessage({ type: "fault", reason: "heartbeat-timeout" });
    });

    expect(await screen.findByText("heartbeat-timeout")).toBeInTheDocument();
    expect(screen.getByText("fault")).toBeInTheDocument();
  });

  it("blocks arming when compiler errors exist", () => {
    const doc = structuredClone(goldenDoc);
    doc.fixtures.fx_s4_one.dmx.address = 12;

    render(React.createElement(DmxOutputPanel, {
      doc,
      selectedFixtureId: "fx_led_one",
    }));
    fireEvent.change(screen.getByLabelText("Relay token"), { target: { value: "test-token" } });

    expect(screen.getByText(/overlaps/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Arm output" })).toBeDisabled();
  });
});
