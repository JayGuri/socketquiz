import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"],
  },
})

const PORT = process.env.PORT || 3001

app.use(express.static(join(__dirname, "public")))

app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"))
})

const rooms = new Map()

const quizQuestions = [
  { question: "What is the capital of France?", options: ["London", "Berlin", "Paris", "Madrid"], correct: 2 },
  { question: "Which planet is known as the Red Planet?", options: ["Mars", "Venus", "Jupiter", "Saturn"], correct: 0 },
  { question: "Who painted the Mona Lisa?", options: ["Van Gogh", "Da Vinci", "Picasso", "Rembrandt"], correct: 1 },
  { question: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
  { question: "In which year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2 },
  { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2 },
  {
    question: "Which country is home to the kangaroo?",
    options: ["New Zealand", "South Africa", "Australia", "Brazil"],
    correct: 2,
  },
  {
    question: "What is the largest planet in our solar system?",
    options: ["Earth", "Mars", "Jupiter", "Saturn"],
    correct: 2,
  },
  {
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correct: 1,
  },
  {
    question: "What is the main ingredient in guacamole?",
    options: ["Tomato", "Avocado", "Onion", "Lemon"],
    correct: 1,
  },
]

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id)

  socket.on("join room", (roomId) => {
    console.log(`User ${socket.id} attempting to join room: ${roomId}`)
    socket.join(roomId)

    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Set(),
        gameState: {
          started: false,
          currentQuestion: 0,
          questions: [...quizQuestions], 
          scores: {},
        },
      })
    }

    const room = rooms.get(roomId)
    room.participants.add(socket.id)

    console.log(`Room ${roomId} now has ${room.participants.size} participants`)

    if (room.gameState.started) {
      socket.emit("game in progress")
    } else if (room.participants.size === 2) {
      room.gameState.started = true
      console.log(`Starting game in room ${roomId}`)
      io.to(roomId).emit("start game", {
        questions: room.gameState.questions,
        currentQuestion: room.gameState.currentQuestion,
      })
    } else {
      socket.emit("waiting for players")
    }

    console.log(`User ${socket.id} joined room: ${roomId}`)
  })

  socket.on("submit answer", ({ roomId, questionIndex, answer, time }) => {
    const room = rooms.get(roomId)
    if (!room || questionIndex !== room.gameState.currentQuestion) return

    const isCorrect = answer === room.gameState.questions[questionIndex].correct
    const score = isCorrect ? Math.max(10 - Math.floor(time / 1000), 1) : 0

    if (!room.gameState.scores[socket.id]) {
      room.gameState.scores[socket.id] = 0
    }
    room.gameState.scores[socket.id] += score

    io.to(roomId).emit("answer result", {
      playerId: socket.id,
      scores: room.gameState.scores,
      isCorrect,
      correctAnswer: room.gameState.questions[questionIndex].correct,
    })

    const answeredPlayers = new Set(Object.keys(room.gameState.scores))
    if (answeredPlayers.size === room.participants.size) {
      room.gameState.currentQuestion++

      if (room.gameState.currentQuestion < room.gameState.questions.length) {
        setTimeout(() => {
          io.to(roomId).emit("next question", {
            currentQuestion: room.gameState.currentQuestion,
          })
        }, 2000) 
      } else {
        io.to(roomId).emit("game over", room.gameState.scores)
      }
    }
  })

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id)
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) {
        room.participants.delete(socket.id)
        if (room.participants.size === 0) {
          rooms.delete(roomId)
        } else {
          if (room.gameState.started) {
            io.to(roomId).emit("player left")
          }
        }
        break
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`)
})

