const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const path = require('path');

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Game State structure: { [roomCode]: { players: [socketIds], boardState: [], gameActive: boolean } }
const games = {};
const symbols = ['X', 'O', '▲', '■'];
const colors = ['player-1', 'player-2', 'player-3', 'player-4'];

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function checkWin(boardState, playerIndex) {
    const size = 7;
    const winLength = 4;

    // Check horizontal
    for (let row = 0; row < size; row++) {
        for (let col = 0; col <= size - winLength; col++) {
            let win = true;
            for (let i = 0; i < winLength; i++) {
                if (boardState[row * size + col + i] !== playerIndex) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check vertical
    for (let col = 0; col < size; col++) {
        for (let row = 0; row <= size - winLength; row++) {
            let win = true;
            for (let i = 0; i < winLength; i++) {
                if (boardState[(row + i) * size + col] !== playerIndex) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check diagonal (down-right)
    for (let row = 0; row <= size - winLength; row++) {
        for (let col = 0; col <= size - winLength; col++) {
            let win = true;
            for (let i = 0; i < winLength; i++) {
                if (boardState[(row + i) * size + col + i] !== playerIndex) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    // Check diagonal (down-left)
    for (let row = 0; row <= size - winLength; row++) {
        for (let col = winLength - 1; col < size; col++) {
            let win = true;
            for (let i = 0; i < winLength; i++) {
                if (boardState[(row + i) * size + col - i] !== playerIndex) {
                    win = false;
                    break;
                }
            }
            if (win) return true;
        }
    }

    return false;
}

// Setup Socket.io connections
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('createRoom', () => {
        const roomCode = generateRoomCode();
        games[roomCode] = {
            players: [socket.id],
            boardState: Array(49).fill(null),
            gameActive: true
        };
        socket.join(roomCode);
        socket.emit('roomJoined', roomCode);

        socket.emit('playerAssignment', {
            index: 0,
            symbol: symbols[0],
            color: colors[0]
        });
        console.log(`Room ${roomCode} created by ${socket.id}`);
    });

    socket.on('joinRoom', (roomCode) => {
        const game = games[roomCode];
        if (!game) {
            socket.emit('roomError', 'Room not found.');
            return;
        }

        if (game.players.length >= 4) {
            socket.emit('roomError', 'Room is full.');
            return;
        }

        game.players.push(socket.id);
        socket.join(roomCode);
        socket.emit('roomJoined', roomCode);

        const playerIndex = game.players.length - 1;
        socket.emit('playerAssignment', {
            index: playerIndex,
            symbol: symbols[playerIndex],
            color: colors[playerIndex]
        });

        // Let the new player see existing moves
        game.boardState.forEach((pIndex, cellIndex) => {
            if (pIndex !== null) {
                socket.emit('moveMade', {
                    index: cellIndex,
                    playerSymbol: symbols[pIndex],
                    playerColorClass: colors[pIndex]
                });
            }
        });

        console.log(`${socket.id} joined room ${roomCode}`);
    });

    socket.on('makeMove', (data) => {
        const { roomCode, cellIndex } = data;
        const game = games[roomCode];
        if (!game || !game.gameActive) return;

        const pIndex = game.players.indexOf(socket.id);
        if (pIndex !== -1 && game.boardState[cellIndex] === null) {
            game.boardState[cellIndex] = pIndex;

            // Broadcast to everyone in the room
            io.to(roomCode).emit('moveMade', {
                index: cellIndex,
                playerSymbol: symbols[pIndex],
                playerColorClass: colors[pIndex]
            });

            if (checkWin(game.boardState, pIndex)) {
                game.gameActive = false;
                io.to(roomCode).emit('gameOver', {
                    winnerIndex: pIndex,
                    winnerSymbol: symbols[pIndex]
                });

                setTimeout(() => {
                    game.boardState = Array(49).fill(null);
                    game.gameActive = true;
                    io.to(roomCode).emit('gameReset');
                }, 5000);
            } else if (!game.boardState.includes(null)) {
                game.gameActive = false;
                io.to(roomCode).emit('gameOver', {
                    winnerIndex: -1,
                    winnerSymbol: 'Draw'
                });

                setTimeout(() => {
                    game.boardState = Array(49).fill(null);
                    game.gameActive = true;
                    io.to(roomCode).emit('gameReset');
                }, 5000);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        // Remove from any rooms they were in
        for (const roomCode in games) {
            const game = games[roomCode];
            const index = game.players.indexOf(socket.id);
            if (index !== -1) {
                game.players.splice(index, 1);
                console.log(`Player removed from room ${roomCode}`);

                // Optional: If room is empty, delete it
                if (game.players.length === 0) {
                    delete games[roomCode];
                    console.log(`Room ${roomCode} deleted because it is empty.`);
                }
                break; // Assuming a socket can only be in one game room at a time
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`listening on *: ${PORT}`);
});
