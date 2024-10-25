const express = require("express");
const { Server, WebSocket } = require("ws");

const app = express();
const PORT = 5001;

app.use(express.static("public"));

const server = app.listen(PORT, () => {
  console.log(`HTTP 服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务器运行在 ws://localhost:${PORT}`);
});

const wss = new Server({ server });

wss.on("connection", (ws) => {
  console.log("客户端已连接");

  ws.on("message", (message) => {
    console.log(`收到消息: ${message}`);
  });
  // 监听客户端断开连接事件
  ws.on("close", () => {
    console.log("客户端已断开连接");
  });
});

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/send-message", express.json(), (req, res) => {
  const message = req.body.message;

  // 广播消息给所有连接的客户端
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });

  res.send("消息已发送");
});
