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

// Game State
const players = [];
const symbols = ['X', 'O', '▲', '■'];
const colors = ['player-1', 'player-2', 'player-3', 'player-4'];

// Setup Socket.io connections
io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    let playerIndex = players.length;
    if (playerIndex < 4) {
        players.push(socket.id);
        socket.emit('playerAssignment', {
            index: playerIndex,
            symbol: symbols[playerIndex],
            color: colors[playerIndex]
        });
        console.log(`Player assigned symbol ${symbols[playerIndex]}`);
    } else {
        socket.emit('gameFull');
        return;
    }

    socket.on('makeMove', (cellIndex) => {
        const pIndex = players.indexOf(socket.id);
        if (pIndex !== -1) {
            // Broadcast to everyone (including sender)
            io.emit('moveMade', {
                index: cellIndex,
                playerSymbol: symbols[pIndex],
                playerColorClass: colors[pIndex]
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected:', socket.id);
        const index = players.indexOf(socket.id);
        if (index !== -1) {
            players.splice(index, 1);
            console.log(`Player released symbol ${symbols[index]}`);
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`listening on *: ${PORT}`);
});
