const express = require('express')
const { Server } = require("socket.io");
const { createServer } = require('node:http');
const { join } = require('node:path');
const jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const PORT = process.env.PORT || 8080
const cors = require('cors');
const FRONTEND_ORIGIN = 'https://people.arcada.fi';

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

io.use((socket, next) => {
  const authorization = socket.handshake.headers.authorization;
  const [scheme, token] = authorization ? authorization.split(' ') : [];

  if (scheme !== 'Bearer' || !token) {
    return next(new Error('Authentication failed'));
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    if (!user.sub) {
      return next(new Error('Authentication failed'));
    }

    socket.data.userId = String(user.sub);
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

console.log(`Node.js ${process.version}`)

app.use(express.json())

app.use(cors({
  origin: FRONTEND_ORIGIN,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.static(join(__dirname, '../frontend'), { index: false }));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, '../frontend/index.html'));
});

io.on('connection', (socket) => {
  const userRoom = `user:${socket.data.userId}`;
  socket.join(userRoom);

  socket.on('chat message', (msg) => {
    io.to(userRoom).emit('chat message', msg);
  });
});

const usersRouter = require('./routes/users')
app.use('/users', usersRouter)

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});
