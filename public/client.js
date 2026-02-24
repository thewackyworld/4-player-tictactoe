const socket = io();

const board = document.getElementById('game-board');

// Create 7x7 grid elements
for (let i = 0; i < 49; i++) {
    const cell = document.createElement('div');
    cell.classList.add('cell');
    cell.dataset.index = i;

    cell.addEventListener('click', () => {
        // We'll tell the server which cell was clicked
        socket.emit('makeMove', i);
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
