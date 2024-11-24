const socket = io();
console.log('hola');

let playerState = {};
let opponentState = {};
let turn = 1;

// DOM Elements
const turnCounter = document.getElementById('turn-counter');
const actionLog = document.getElementById('log-list');
const attackMenu = document.getElementById('attack-menu');
const switchMenu = document.getElementById('switch-menu');
const mainMenu = document.getElementById('main-menu');
const playerHealthBar = document.getElementById('player-health-bar');
const opponentHealthBar = document.getElementById('opponent-health-bar');

// Actualizar el contador de turno
function updateTurn() {
  turnCounter.textContent = `Turno: ${turn}`;
}

// Actualizar la barra de vida con animación
// Actualizar la barra de vida con animación visual
function updateHealthBar(healthBar, currentHp, maxHp) {
  const percentage = (currentHp / maxHp) * 100;
  healthBar.style.width = `${Math.max(percentage, 0)}%`; // Evita valores negativos
  if (percentage <= 50) healthBar.style.backgroundColor = '#ffa500'; // Amarillo para menos del 50%
  if (percentage <= 25) healthBar.style.backgroundColor = '#ff0000'; // Rojo para menos del 25%
}



// Mostrar un mensaje en el log
function logAction(message) {
  const li = document.createElement('li');
  li.textContent = message;
  actionLog.appendChild(li);
}

// Manejar los resultados del turno
socket.on('turn-result', ({ yourResult, opponentResult }) => {
  logAction(yourResult.message);
  logAction(opponentResult.message);

  // Actualizar las barras de vida
  updateHealthBar(
    playerHealthBar,
    playerState.pokemon[playerState.activePokemonIndex].hp,
    100 // Suponiendo que el máximo HP de cada Pokémon es 100
  );
  updateHealthBar(
    opponentHealthBar,
    opponentState.pokemon[opponentState.activePokemonIndex].hp,
    100 // Suponiendo que el máximo HP de cada Pokémon es 100
  );
});

// Actualizar el turno
socket.on('turn-update', ({ turn: newTurn }) => {
  turn = newTurn;
  updateTurn();
});

// Enviar acción de ataque
function attack(moveIndex) {
  socket.emit('player-action', { type: 'attack', data: { moveIndex } });

  // Mostrar animaciones de ataque o feedback visual aquí si es necesario
  attackMenu.classList.add('hidden');
  mainMenu.classList.remove('hidden');
}

// Enviar acción de cambio de Pokémon
function switchPokemon(index) {
  socket.emit('player-action', { type: 'switch', data: { index } });

  switchMenu.classList.add('hidden');
  mainMenu.classList.remove('hidden');
}

// Manejo de teclas para las acciones
document.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();

  // Manejo del menú principal
  if (key === 'x') {
    mainMenu.classList.add('hidden');
    attackMenu.classList.remove('hidden');
  } else if (key === 'c') {
    mainMenu.classList.add('hidden');
    switchMenu.classList.remove('hidden');
  }

  // Manejo del menú de ataque
  if (['1', '2', '3', '4'].includes(key)) {
    attack(parseInt(key) - 1);
  }

  // Manejo del menú de cambio
  if (['i', 'o', 'p'].includes(key)) {
    const index = { i: 0, o: 1, p: 2 }[key];
    switchPokemon(index);
  }
});

// Sincronizar el estado del jugador
socket.on('update-state', (state) => {
  if (state.isPlayer) {
    playerState = state;
  } else {
    opponentState = state;
  }
});

// Mostrar mensajes del servidor
socket.on('message', (message) => {
  logAction(message);
});

// Notificación de Pokémon debilitado
socket.on('pokemon-fainted', ({ message }) => {
  alert(message);
  logAction(message);
});
