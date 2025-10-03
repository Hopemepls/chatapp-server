const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); // Правильный импорт для v4
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// Инициализация Socket.io с transports для fallback
const io = new Server(server, {
  cors: {
    origin: "https://chatapp-9i5f.vercel.app", // Точный URL фронтенда
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"] // Fallback на polling
});

app.use(cors({
  origin: "https://chatapp-9i5f.vercel.app",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Логика Socket.io
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);
  console.log('Транспорт:', socket.conn.transport.name);

  socket.on('sendMessage', async (data) => {
    try {
      const chatMessage = await prisma.chat.create({  // Используем модель chat
        data: {
          username: data.username,
          text: data.text,
        },
      });
      io.emit('receiveMessage', chatMessage);
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
      socket.emit('error', 'Не удалось сохранить сообщение');
    }
  });

  socket.on('disconnect', () => {
    console.log('Пользователь отключился:', socket.id);
  });
});

// Маршрут для получения сообщений
app.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.chat.findMany({  // Используем модель chat
      orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
