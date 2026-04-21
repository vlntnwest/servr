const { Server } = require("socket.io");
const logger = require("../logger");
const supabase = require("./supabase");
const prisma = require("./prisma");

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  // Authenticate socket connections via Supabase JWT
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication required"));
    }

    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return next(new Error("Invalid token"));
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        include: { restaurantMembers: true },
      });
      if (!dbUser) {
        return next(new Error("User not found"));
      }

      socket.data.user = dbUser;
      next();
    } catch (err) {
      logger.error({ error: err.message }, "Socket auth error");
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user.id }, "Socket connected");

    socket.on("join:restaurant", (restaurantId) => {
      const isMember = socket.data.user.restaurantMembers.some(
        (m) => m.restaurantId === restaurantId,
      );
      if (!isMember) {
        logger.warn({ socketId: socket.id, restaurantId }, "Unauthorized join:restaurant attempt");
        return;
      }

      socket.join(`restaurant:${restaurantId}`);
      logger.info({ socketId: socket.id, restaurantId }, "Joined restaurant room");
    });

    socket.on("error", (err) => {
      logger.error({ socketId: socket.id, error: err.message }, "Socket error");
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Socket disconnected");
    });
  });

  io.engine.on("connection_error", (err) => {
    logger.error({ code: err.code, message: err.message }, "Socket.IO connection error");
  });

  return io;
}

function getIO() {
  return io;
}

module.exports = { initSocket, getIO };
