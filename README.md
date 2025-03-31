# socket util

## Environment Prepare

Install `node_modules`:

```bash
npm install
```

or

```bash
yarn
```

### Start project

```bash
npm start
```

### 录制 socket 消息
```bash
node socket-recorder.js <ws> <output>

# example
# node socket-recorder.js ws://192.168.30.200:5001 ./socket_msg_bak/lpnp.txt
```