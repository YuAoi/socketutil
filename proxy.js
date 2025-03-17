const WebSocket = require("ws");
const os = require("os");
const { getLocalIPAddress } = require("./utils");

/**
 * 使用方法如下：
 * 1. 在电脑上安装 node；
 * 2. 运行 node proxy.js <车 ip>，成功后可以看到提示日志，含义请参照 PS 描述；
 * 3. 点 pad 右上角斧头，然后在连接 HCC/自定义 HMI NODE 那儿打开开关，在开关下方输入 prxoy 服务的地址
 * 4. 杀掉 app 后重启，此时可以看到 app 发送给 hmi node 的消息；
 *
 * PS：
 * proxy 服务地址：WebSocket proxy server is running on <xxx>
 * Pad 已经连上 proxy 服务：Client connected
 * Proxy 工具已经连接真实 hmi node：Connected to hmi node
 * App 发送给 hmi node 的消息：Received message from client: <xxx>
 */

const LOCAL_PORT = 5001;
const REMOTE_WS_URL = `ws://${process.argv[2]}:5001`;

// 创建 WebSocket 服务器，监听本地端口
const wss = new WebSocket.Server({ port: LOCAL_PORT });

wss.on("connection", (clientWs) => {
  console.log("Client connected");

  // 连接远程 WebSocket 服务器
  const serverWs = new WebSocket(REMOTE_WS_URL);

  // 当与服务器的连接打开时
  serverWs.on("open", () => {
    console.log("Connected to hmi node");
  });

  // 从客户端接收消息并转发到服务器
  clientWs.on("message", (message) => {
    if (serverWs.readyState === WebSocket.OPEN) {
      console.log("Received message from client: ", message.toString());
      serverWs.send(message);
    }
  });

  // 从服务器接收消息并转发到客户端
  serverWs.on("message", (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });

  // 处理客户端断开连接
  clientWs.on("close", () => {
    console.log("Client disconnected");
    serverWs.close();
  });

  // 处理服务器断开连接
  serverWs.on("close", () => {
    console.log("Disconnected from remote server");
    clientWs.close();
  });

  // 处理连接错误
  clientWs.on("error", (err) => {
    console.error("Client WebSocket error:", err);
    serverWs.close();
  });

  serverWs.on("error", (err) => {
    console.error("Server WebSocket error:", err);
    clientWs.close();
  });
});

console.log(
  `WebSocket proxy server is running on ws://${getLocalIPAddress()}:${LOCAL_PORT}`
);
