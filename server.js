const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const app = express();
const server = http.createServer(app);

// Настройка CORS для Socket.io (разрешает подключения с фронтенда)
const io = socketIo(server, {
  cors: {
    origin: 'https://chatapp-9i5f.vercel.app',  // Ваш фронтенд на Vercel
    methods: ['GET', 'POST'],
  },
});

// Настройка CORS для Express
app.use(cors({
  origin: 'https://chatapp-9i5f.vercel.app',  // Тот же origin
  credentials: true,
}));
app.use(express.json());

// Логика Socket.io
io.on('connection', (socket) => {
  console.log('Пользователь подключился:', socket.id);

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
