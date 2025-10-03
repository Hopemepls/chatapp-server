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
    origin: "https://chatapp-9i5f.vercel.app", // Точный URL фронтенда (проверьте, что он верный)
    methods: ["GET", "POST"]
  },
  transports: ["websocket", "polling"] // Разрешить fallback на polling, если WebSocket не работает
});

app.use(cors({
  origin: "https://chatapp-9i5f.vercel.app",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Логика Socket.io с дополнительными логами
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);
  console.log('Транспорт:', socket.conn.transport.name); // Лог транспорта для диагностики

  socket.on('sendMessage', async (data) => {
    try {
      const message = await prisma.message.create({
        data: {
          username: data.username,
          text: data.text,
        },
      });
      io.emit('receiveMessage', message);
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
    const messages = await prisma.message.findMany({
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
