const express = require("express");
const WebSocket = require("ws");
const https = require("https");
const fs = require("fs");

const app = express();
const port = 3000;

// Read SSL certificate and key
const serverOptions = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt"),
};

// Create HTTPS server
const server = https.createServer(serverOptions, app);
const wss = new WebSocket.Server({ server });

// Store clients with timestamps
const clients = new Map();

// Function to generate a timestamp
const getTimestamp = () => new Date().toISOString().replace("T", " ").split(".")[0];

// Clean up inactive clients every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [name, { timestamp }] of clients) {
    if (now - timestamp > 10 * 60 * 1000) { // 10 minutes
      clients.delete(name);
      console.log(`[${getTimestamp()}] 🗑️ Removed inactive user: ${name}`);
    }
  }
}, 10 * 60 * 1000);

// Handle incoming WebSocket connections
wss.on("connection", (ws) => {
  let senderName = null;
  console.log(`[${getTimestamp()}] 🔌 New WebSocket connection established.`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`[${getTimestamp()}] 📩 Received message:`, data);

      if (data.type === "register") {
        senderName = data.name;
        clients.set(senderName, { ws, timestamp: Date.now() });
        console.log(`[${getTimestamp()}] ✅ ${senderName} registered successfully.`);
        return;
      }

      if (!data.to) {
        console.warn(`[${getTimestamp()}] ⚠️ No recipient specified.`);
        return;
      }

      const recipient = data.to;
      const recipientData = clients.get(recipient);

      if (!recipientData) {
        console.warn(`[${getTimestamp()}] ❌ Recipient ${recipient} not found.`);
        return;
      }

      // Forward message to recipient
      recipientData.ws.send(JSON.stringify(data));
    } catch (err) {
      console.error(`[${getTimestamp()}] 🚨 Error processing message:`, err);
    }
  });

  ws.on("close", () => {
    if (senderName) {
      clients.delete(senderName);
      console.log(`[${getTimestamp()}] ❌ ${senderName} disconnected.`);
    }
  });

  ws.on("error", (err) => {
    console.error(`[${getTimestamp()}] 🚨 WebSocket error from ${senderName || "unknown client"}:`, err);
  });
});

// Endpoint to get active users
app.get("/get_users", (req, res) => {
  const activeUsers = Array.from(clients.keys());
  res.json(activeUsers);
});

// Serve the HTTPS server
server.listen(port, "0.0.0.0", () => {
  console.log(`[${getTimestamp()}] 🚀 Signaling server running on https://0.0.0.0:${port}`);
});
