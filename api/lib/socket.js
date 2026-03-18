const { Server } = require("socket.io");
const logger = require("../logger");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id }, "Socket connected");

    socket.on("join:restaurant", (restaurantId) => {
      socket.join(`restaurant:${restaurantId}`);
      logger.info({ socketId: socket.id, restaurantId }, "Joined restaurant room");
    });

    socket.on("disconnect", () => {
      logger.info({ socketId: socket.id }, "Socket disconnected");
    });
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
