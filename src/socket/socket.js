import { Server } from "socket.io";
import http from "http";
import express from "express";
import { log } from "console";

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000"],
    methods: ["GET", "POST"],
  },
});

const getReceiverSocketId = (receiverId) => {
  return userSocketMap[receiverId];
};

const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("User connected", socket.id);
  const userId = socket.handshake.query.userId;
  console.log(userId);
  if (userId !== undefined && userId !== null && userId !== '') {
    userSocketMap[userId] = socket.id;
  }

  // socket.on("send-message", (msg, from) => {
  //   // console.log(socket.id);                       
  //   // console.log(socket.handshake.query.userId);   
  //   // console.log(msg);
  //   // console.log(userSocketMap[from]);
    
  //   // from contain receiver's userId
  //   const receiverSocketId = userSocketMap[from]; 

  //   if (receiverSocketId) {                          // Receiver is online
  //     io.to(receiverSocketId).emit('message', msg);
  //   } else {
  //     console.log("Receiver's socket ID not found");
  //   }
  // });

  // This is for receiving messages from other users
  // socket.on('message', (msg) => {
  //   console.log('Message received from other user:', msg);
  //   // Handle the received message as needed
  // });

  // This is for receiving messages from the server
  // socket.on('server-message', (msg) => {
  //   console.log('Server message received:', msg);
  //   // Handle the received server message as needed
  // });

  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("disconnect", () => {
    console.log("User disconnected", socket.id);
    delete userSocketMap[userId];
    console.log(userId);
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});


export { app, io, server, getReceiverSocketId };