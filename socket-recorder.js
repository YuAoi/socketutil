#!/usr/bin/env node

/**
 * 使用方法如下：
 * node socket-recorder.js ws://192.168.30.200:5001 ./socket_msg_bak/lpnp.txt
 */
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");
const readline = require("readline");

// 解析命令行参数
const args = process.argv.slice(2);
const socketUrl = args[0] || "ws://192.168.30.200:5001";
const outputFileName =
  args[1] ||
  path.join(__dirname, "socket_msg_bak", `socket_recording_${Date.now()}.txt`);

// 性能统计
let messageCount = 0;
let startTime = 0;
let isWriting = false;
let writeQueue = [];
let writeStream = null;

// 创建输出目录（如果不存在）
const outputDir = path.join(__dirname, "socket_msg_bak");
if (outputDir && !fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 初始化写入流
function initWriteStream() {
  writeStream = fs.createWriteStream(outputFileName, {
    flags: "a",
    encoding: "utf8",
    highWaterMark: 1024 * 1024, // 1MB缓冲区提高性能
  });

  writeStream.on("error", (err) => {
    console.error("写入文件出错:", err);
    process.exit(1);
  });

  writeStream.on("drain", () => {
    isWriting = false;
    processQueue();
  });
}

// 处理写入队列
function processQueue() {
  if (isWriting || writeQueue.length === 0) return;

  isWriting = true;
  const data = writeQueue.join("\n") + "\n";
  writeQueue = [];

  if (!writeStream.write(data)) {
    // 如果返回false，等待drain事件
    return;
  }

  isWriting = false;
  processQueue();
}

// 添加消息到队列
function addToQueue(message) {
  writeQueue.push(message);
  messageCount++;

  // 定期显示统计信息
  if (messageCount % 1000 === 0) {
    const elapsed = (performance.now() - startTime) / 1000;
    const rate = Math.floor(messageCount / elapsed);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(
      `已接收: ${messageCount} 条消息 | 速率: ${rate} 条/秒 | 队列: ${writeQueue.length}`
    );
  }

  // 如果队列过大，立即处理
  if (writeQueue.length > 10000) {
    processQueue();
  }
}

// 主函数
async function main() {
  console.log(`开始录制 WebSocket 消息`);
  console.log(`目标地址: ${socketUrl}`);
  console.log(`输出文件: ${outputFileName}`);

  initWriteStream();
  startTime = performance.now();

  const ws = new WebSocket(socketUrl, {
    perMessageDeflate: false, // 禁用压缩以提高性能
    maxPayload: 1024 * 1024 * 100, // 100MB最大负载
  });

  ws.on("open", () => {
    console.log("已连接到 WebSocket 服务器");
    ws.send(
      JSON.stringify({
        type: 3,
        id: "hmi",
        sn: "remove",
      })
    );
  });

  ws.on("message", (data) => {
    try {
      const message = data.toString();
      if (message) {
        addToQueue(message);
      }
    } catch (err) {
      console.error("处理消息出错:", err);
    }
  });

  ws.on("error", (err) => {
    console.error("WebSocket 错误:", err);
  });

  ws.on("close", () => {
    console.log("\nWebSocket 连接已关闭");
    // 确保所有消息都写入文件
    while (writeQueue.length > 0) {
      processQueue();
    }
    writeStream.end();
    const elapsed = (performance.now() - startTime) / 1000;
    console.log(
      `录制完成，共接收 ${messageCount} 条消息，平均速率 ${Math.floor(
        messageCount / elapsed
      )} 条/秒`
    );
    process.exit(0);
  });

  // 处理退出信号
  process.on("SIGINT", () => {
    console.log("\n接收到终止信号，正在关闭...");
    ws.close();
  });
}

main().catch(console.error);
