const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const app = express();
app.use(cors());  // Это для Express, но для Socket.io CORS настраивается ниже
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chatapp-9i5f.vercel.app",  // URL вашего фронтенда на Vercel (без слэша в конце)
    methods: ["GET", "POST"],
    credentials: true,  // Добавлено для безопасности, если нужны cookies
  }
});

// Инициализация Prisma
const prisma = new PrismaClient();

// Тестируем подключение (опционально, для отладки)
async function testConnection() {
  try {
    await prisma.$connect();
    console.log('Prisma подключена к БД');
  } catch (error) {
    console.error('Ошибка подключения к БД:', error);
  }
}
testConnection();

// Маршрут /messages — возвращает историю сообщений из БД
app.get('/messages', async (req, res) => {
  try {
    const messages = await prisma.chat.findMany({
      orderBy: { createdAt: 'asc' }  // Сортировка по времени создания
    });
    res.json(messages);
  } catch (error) {
    console.error('Ошибка получения сообщений:', error);
    res.status(500).json({ error: error.message });
  }
});

// Тестовый маршрут для проверки подключения к базе данных
app.get('/test-db', async (req, res) => {
  try {
    await prisma.$connect();
    const count = await prisma.chat.count();
    res.json({ status: 'OK', count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

io.on('connection', (socket) => {
  console.log(`Пользователь подключился: ${socket.id}`);

  socket.on('sendMessage', async (data) => {
    try {
      // Сохраняем сообщение (уберите createdAt, если в схеме default(now()))
      const message = await prisma.chat.create({
        data: {
          username: data.username,
          text: data.text
          // createdAt: new Date()  // Уберите, если в схеме есть @default(now())
        }
      });
      console.log('Сообщение сохранено:', message);

      // Отправляем всем клиентам
      io.emit('receiveMessage', message);
    } catch (error) {
      console.error('Ошибка сохранения сообщения:', error);
      socket.emit('error', 'Не удалось сохранить сообщение');  // Отправляем ошибку клиенту
    }
  });

  socket.on('disconnect', () => {
    console.log(`Пользователь отключился: ${socket.id}`);
  });
});

app.get('/', (req, res) => {
  res.send('Сервер чата работает!');
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Сервер с Socket.io и Prisma запущен на порту ${PORT}`);
});

// Graceful shutdown для Prisma
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
