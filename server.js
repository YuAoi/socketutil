const express = require("express");
const WebSocket = require("ws");
const Server = WebSocket.Server;

const app = express();
const PORT = 8000;

app.use(express.static("public"));

const server = app.listen(PORT, () => {
  console.log(`HTTP 服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 服务器运行在 ws://localhost:${PORT}`);
});

// 用于桥接的 WebSocket 客户端
let bridgeWsClient;

// 启动一个 socket 服务器
const wss = new Server({ server });

wss.on("connection", (ws) => {
  console.log("客户端已连接");

  ws.on("message", (message) => {
    console.log(`收到消息: ${message}`);
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

app.get("/bridge-ws", (req, res) => {
  const wsURL = req.query.wsURL;

  // 如果 bridgeWsClient 已经存在并连接，则什么都不做
  if (bridgeWsClient && bridgeWsClient.readyState === WebSocket.OPEN) {
    res.send("桥接中，无需重复连接");
    return;
  }

  bridgeWsClient = new WebSocket(wsURL, {
    perMessageDeflate: true,
  });
  bridgeWsClient.on("open", () => {
    console.log("open");
    bridgeWsClient.send(
      JSON.stringify({
        type: 3,
        id: "hmi",
        sn: "remove",
      })
    );
  });
  bridgeWsClient.on("message", (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });
  bridgeWsClient.on("error", function (error) {
    console.error("WebSocket error:", error);
  });

  res.send("已桥接");
});

app.get("/dis-bridge-ws", (req, res) => {
  // 如果 bridgeWsClient 存在并连接中，则关闭连接并取消 message 事件监听
  if (bridgeWsClient && bridgeWsClient.readyState === WebSocket.OPEN) {
    bridgeWsClient.close();
    bridgeWsClient = undefined;
    res.send("已关闭桥接");
    return;
  }
  res.send("无桥接连接，或连接已关闭");
});
