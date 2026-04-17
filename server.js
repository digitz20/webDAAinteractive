require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const { main } = require('./bot.js');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 7483;

let isBotRunning = false;

app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`listening on *:${PORT}`);
  console.log('Server started and bot main function is about to be called.');
  // Initial call to start the bot immediately
  main(io);
  // Schedule the bot to run every 45minutes (2700000 milliseconds)
  setInterval(() => {
    if (!isBotRunning) {
      console.log('Running bot main function on schedule...');
      isBotRunning = true;
      main(io).finally(() => {
        isBotRunning = false;
      });
    } else {
      console.log('Bot is still running, skipping this interval.');
    }
  }, 2700000); 
});