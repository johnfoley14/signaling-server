const express = require("express");
const WebSocket = require("ws");

const app = express();
const port = 3000;

// Create a WebSocket server
const wss = new WebSocket.Server({ noServer: true });

// Store clients by name
const clients = new Map();

// Handle incoming WebSocket connections
wss.on("connection", (ws) => {
  let senderName = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    // Store the sender's name for the WebSocket session
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

  // Handle disconnection
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

// Handle HTTP requests and upgrade to WebSocket
app.server = app.listen(port, () => {
  console.log(`Signaling server running at http://localhost:${port}`);
});

app.server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
