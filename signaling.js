const express = require("express");
const WebSocket = require("ws");
const https = require("https");
const fs = require("fs");

const app = express();
const port = 3000;

// Read SSL certificate and key
const serverOptions = {
  key: fs.readFileSync("./server.key"),
  cert: fs.readFileSync("./server.crt")
};

// Create HTTPS server
const server = https.createServer(serverOptions, app);

// Create WebSocket server that uses HTTPS server
const wss = new WebSocket.Server({ server });

// Store clients by name
const clients = new Map();

// Handle incoming WebSocket connections
wss.on("connection", (ws) => {
  let senderName = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "register") {
      senderName = data.name;
      clients.set(senderName, ws);
      console.log(`${senderName} connected`);
      return;
    }

    // Send the message to the intended recipient (Tim -> Jim or Jim -> Tim)
    if (data.type === "offer" || data.type === "answer" || data.type === "ice-candidate") {
      const recipient = data.to;
      const recipientWs = clients.get(recipient);

      if (recipientWs) {
        recipientWs.send(JSON.stringify(data));
      } else {
        console.log(`Recipient ${recipient} not found.`);
      }
    }
  });

  ws.on("close", () => {
    if (senderName) {
      clients.delete(senderName);
      console.log(`${senderName} disconnected`);
    }
  });

  ws.on("error", (err) => {
    console.error(`WebSocket error: ${err}`);
  });
});

// Serve the HTTPS server (now accessible via HTTPS)
server.listen(port, "0.0.0.0", () => {
  console.log(`Signaling server running on https://0.0.0.0:${port}`);
});
