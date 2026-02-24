const socket = io();

// UI Elements
const lobbyScreen = document.getElementById('lobby-screen');
const gameScreen = document.getElementById('game-screen');
const board = document.getElementById('game-board');
const createBtn = document.getElementById('create-btn');
const joinBtn = document.getElementById('join-btn');
const roomCodeInput = document.getElementById('room-code-input');
const displayRoomCode = document.getElementById('display-room-code');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSendBtn = document.getElementById('chat-send-btn');

let currentRoomCode = null;

// Lobby Interaction
createBtn.addEventListener('click', () => {
    socket.emit('createRoom');
});

joinBtn.addEventListener('click', () => {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (code) {
        socket.emit('joinRoom', code);
    }
});

// Socket logic for Rooms
socket.on('roomJoined', (roomCode) => {
    currentRoomCode = roomCode;
    displayRoomCode.innerText = roomCode;
    lobbyScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
});

socket.on('roomError', (msg) => {
    alert(msg);
});

// Create 7x7 grid elements
for (let i = 0; i < 49; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;

    cell.addEventListener('click', () => {
        // Only send if we are in a room
        if (currentRoomCode) {
            socket.emit('makeMove', { roomCode: currentRoomCode, cellIndex: i });
        }
    });

    board.appendChild(cell);
}

// Listening for moves from the server to update the board UI
socket.on('moveMade', (data) => {
    // data should have { index, playerSymbol, playerColorClass }
    const cell = document.querySelector(`.cell[data-index='${data.index}']`);
    if (cell && !cell.innerText) {
        cell.innerText = data.playerSymbol;
        cell.classList.add(data.playerColorClass);
    }
});

socket.on('gameOver', (data) => {
    const notif = document.getElementById('win-notification');
    const msg = document.getElementById('win-message');
    notif.classList.remove('hidden');

    if (data.winnerIndex === -1) {
        msg.innerText = "It's a Draw!";
        msg.style.color = "white";
    } else {
        msg.innerText = `${data.winnerSymbol} Wins!`;
    }
});

socket.on('gameReset', () => {
    const notif = document.getElementById('win-notification');
    notif.classList.add('hidden');

    // clear the board UI
    document.querySelectorAll('.cell').forEach(cell => {
        cell.innerText = '';
        cell.className = 'cell'; // reset classes
    });
});

// Chat Logic
function sendChatMessage() {
    const msg = chatInput.value.trim();
    if (msg && currentRoomCode) {
        socket.emit('chatMessage', { roomCode: currentRoomCode, message: msg });
        chatInput.value = '';
    }
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

socket.on('chatMessage', (data) => {
    const { message, colorClass, senderId } = data;
    const msgEl = document.createElement('div');
    msgEl.classList.add('chat-message');

    if (senderId === socket.id) {
        msgEl.classList.add('self');
    } else {
        if (colorClass) msgEl.classList.add(colorClass);
    }

    msgEl.innerText = message;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
});
