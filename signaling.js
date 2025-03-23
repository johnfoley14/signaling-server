const express = require("express");
const WebSocket = require("ws");
const https = require("https");
const fs = require("fs");
const cors = require('cors');

const app = express();
const port = 3000;

// Allow requests from your frontend origin
app.use(cors({
  origin: 'https://3.254.201.195', // all requests from this origin are allowed
}));

const serverOptions = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt"),
};

const server = https.createServer(serverOptions, app);

// Create WebSocket server that uses HTTPS server
const wss = new WebSocket.Server({ server });

// Store clients by name
const clients = new Map();

// Store ICE candidates for debugging
const iceCandidatesLog = new Map();

// Function to generate a timestamp
const getTimestamp = () => new Date().toISOString().replace("T", " ").split(".")[0];

// Handle incoming WebSocket connections
wss.on("connection", (ws) => {
  let senderName = null;
  console.log(`[${getTimestamp()}] 🔌 New WebSocket connection established.`);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === "register") {
        senderName = data.name;
        clients.set(senderName, ws);
        console.log(`[${getTimestamp()}] ✅ ${senderName} registered successfully.`);
        return;
      }

      if (!data.to) {
        console.warn(`[${getTimestamp()}] ⚠️ Received message without recipient:`, data);
        return;
      }

      const recipient = data.to;
      const recipientWs = clients.get(recipient);

      if (!recipientWs) {
        console.warn(`[${getTimestamp()}] ❌ Recipient ${recipient} not found. Unable to forward message.`);
        return;
      }

      // Log different message types
      if (data.type === "offer") {
        console.log(`[${getTimestamp()}] 📞 ${senderName} is calling ${recipient}. Forwarding offer.`);
      } else if (data.type === "answer") {
        console.log(`[${getTimestamp()}] ✅ ${senderName} answered the call from ${recipient}. Forwarding answer.`);
      } else if (data.type === "ice-candidate") {
        console.log(`[${getTimestamp()}] ❄️ ICE candidate from ${senderName} → ${recipient}:`, data.candidate);

        // Store ICE candidates for debugging
        if (!iceCandidatesLog.has(senderName)) {
          iceCandidatesLog.set(senderName, []);
        }
        iceCandidatesLog.get(senderName).push(data.candidate);

        // Check if ICE candidates are actually being exchanged
        setTimeout(() => {
          const senderCandidates = iceCandidatesLog.get(senderName) || [];
          const recipientCandidates = iceCandidatesLog.get(recipient) || [];

          if (senderCandidates.length === 0 || recipientCandidates.length === 0) {
            console.warn(
              `[${getTimestamp()}] ⚠️ Possible Peer-to-Peer issue: No ICE candidates exchanged between ${senderName} and ${recipient}. They may need a TURN server.`
            );
          }
        }, 5000);
      }

      // Forward the message to the intended recipient
      recipientWs.send(JSON.stringify(data));
    } catch (err) {
      console.error(`[${getTimestamp()}] 🚨 Error processing WebSocket message:`, err);
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

// Add endpoint to get all registered user names
app.get("/get_users", (req, res) => {
  res.json({ users: Array.from(clients.keys()) });
});

// Serve the HTTPS server (now accessible via HTTPS)
server.listen(port, "0.0.0.0", () => {
  console.log(`[${getTimestamp()}] 🚀 Signaling server running on https://0.0.0.0:${port}`);
});
