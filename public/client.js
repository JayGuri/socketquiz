// Import the io function from the Socket.IO client library
import { io } from "socket.io-client"

// The io function is globally available from the Socket.IO client script
const socket = io()

let currentQuestion = 0
let startTime
const scores = {}
let quizQuestions

document.addEventListener("DOMContentLoaded", () => {
  const joinRoomBtn = document.getElementById("join-room-btn")
  joinRoomBtn.addEventListener("click", joinRoom)
})

function joinRoom() {
  const roomId = document.getElementById("room-id").value
  socket.emit("join room", roomId)
  document.getElementById("room-join").style.display = "none"
}

socket.on("start game", (questions) => {
  quizQuestions = questions
  document.getElementById("quiz").style.display = "block"
  showQuestion(questions[currentQuestion])
})

function showQuestion(question) {
  document.getElementById("question").textContent = question.question
  const optionsDiv = document.getElementById("options")
  optionsDiv.innerHTML = ""
  startTime = Date.now()

  question.options.forEach((option, index) => {
    const button = document.createElement("button")
    button.textContent = option
    button.addEventListener("click", () => submitAnswer(index))
    optionsDiv.appendChild(button)
  })
}

function submitAnswer(answerIndex) {
  const time = Date.now() - startTime
  socket.emit("submit answer", {
    roomId: document.getElementById("room-id").value,
    questionIndex: currentQuestion,
    answer: answerIndex,
    time: time,
  })
}

socket.on("answer result", ({ playerId, score }) => {
  if (!scores[playerId]) {
    scores[playerId] = 0
  }
  scores[playerId] += score
  updateLeaderboard()

  currentQuestion++
  if (currentQuestion < 10) {
    showQuestion(quizQuestions[currentQuestion])
  } else {
    document.getElementById("quiz").innerHTML = "<h2>Quiz Completed!</h2>"
  }
})

function updateLeaderboard() {
  const leaderboard = document.getElementById("leaderboard")
  leaderboard.innerHTML = "<h3>Leaderboard</h3>"
  Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .forEach(([playerId, score]) => {
      leaderboard.innerHTML += `<p>${playerId}: ${score}</p>`
    })
}

