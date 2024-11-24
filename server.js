const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public")); // Servir archivos estáticos (CSS/JS)

let games = {}; // Gestión de múltiples partidas

// Gestión de sockets
io.on("connection", (socket) => {
  console.log(`Jugador conectado: ${socket.id}`);

  // Crear o unirse a una partida
  socket.on("join-game", (gameId) => {
    if (!games[gameId]) {
      games[gameId] = {
        players: {},
        turn: 1,
      };
    }

    const game = games[gameId];
    if (Object.keys(game.players).length < 2) {
      // Añadir jugador a la partida
      game.players[socket.id] = {
        pokemon: [
          { name: "Pikachu", hp: 100, moves: ["Impactrueno", "Placaje", "Cola Férrea", "Ataque Rápido"] },
          { name: "Charmander", hp: 100, moves: ["Ascuas", "Arañazo", "Garra Dragón", "Pantalla de Humo"] },
          { name: "Squirtle", hp: 100, moves: ["Pistola Agua", "Burbuja", "Cabezazo", "Refugio"] },
        ],
        activePokemonIndex: 0,
      };

      socket.join(gameId);
      socket.emit("game-joined", { gameId, playerId: socket.id });
      console.log(`Jugador ${socket.id} se unió a la partida ${gameId}`);

      // Iniciar partida si ambos jugadores están listos
      if (Object.keys(game.players).length === 2) {
        console.log('hay 2 jugadores');
        
        io.to(gameId).emit("game-started", { turn: game.turn });
      }
    } else {
      socket.emit("error", "La partida ya está llena.");
    }
  });

  // Procesar acción del jugador
  socket.on("player-action", ({ type, data }) => {
    const gameId = Object.keys(games).find((id) => games[id].players[socket.id]);
    if (!gameId) return;

    const game = games[gameId];
    const player = game.players[socket.id];
    const opponentId = Object.keys(game.players).find((id) => id !== socket.id);
    const opponent = game.players[opponentId];

    if (!player || !opponent) return;

    let yourResult = {};
    let opponentResult = {};

    // Procesar ataque
    if (type === "attack") {
      const moveIndex = data.moveIndex;
      const moveDamage = Math.floor(Math.random() * 20) + 10; // Daño aleatorio entre 10 y 30
      opponent.pokemon[opponent.activePokemonIndex].hp -= moveDamage;

      if (opponent.pokemon[opponent.activePokemonIndex].hp <= 0) {
        opponent.pokemon[opponent.activePokemonIndex].hp = 0;
      }

      yourResult = {
        message: `${player.pokemon[player.activePokemonIndex].name} atacó con daño ${moveDamage}.`,
      };
      opponentResult = {
        message: `${opponent.pokemon[opponent.activePokemonIndex].name} recibió ${moveDamage} de daño.`,
      };

      // Forzar cambio si el oponente queda sin HP
      if (opponent.pokemon[opponent.activePokemonIndex].hp === 0) {
        opponentResult.message += ` ${opponent.pokemon[opponent.activePokemonIndex].name} se debilitó.`;
      }
    }

    // Procesar cambio de Pokémon
    if (type === "switch") {
      const newIndex = data.index;
      if (newIndex !== player.activePokemonIndex && player.pokemon[newIndex].hp > 0) {
        player.activePokemonIndex = newIndex;
        yourResult = { message: `Cambiaste a ${player.pokemon[newIndex].name}.` };
      } else {
        yourResult = { message: `No puedes cambiar a ese Pokémon.` };
      }
    }

    // Emitir resultados del turno
    io.to(gameId).emit("turn-result", { yourResult, opponentResult });

    // Emitir estado actualizado a ambos jugadores
    Object.keys(game.players).forEach((id) => {
      const isPlayer = id === socket.id;
      io.to(id).emit("update-state", {
        isPlayer,
        pokemon: game.players[id].pokemon,
        activePokemonIndex: game.players[id].activePokemonIndex,
      });
    });

    // Incrementar turno
    game.turn++;
    io.to(gameId).emit("turn-update", { turn: game.turn });
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    const gameId = Object.keys(games).find((id) => games[id].players[socket.id]);
    if (gameId) {
      delete games[gameId].players[socket.id];
      if (Object.keys(games[gameId].players).length === 0) {
        delete games[gameId];
      }
    }
  });
});

// Servidor corriendo
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
