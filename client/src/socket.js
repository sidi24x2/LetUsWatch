import { io } from "socket.io-client";

// Remove the duplicate - keep only one socket initialization

const socket = io("https://letuswatch.onrender.com", {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// const socket = io("http://localhost:3000", {
//   transports: ["websocket"],
//   reconnection: true,
//   reconnectionAttempts: 5,
//   reconnectionDelay: 1000,
// });


// Add error handling for socket connection
socket.on('connect', () => {
  console.log('Connected to server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

export default socket;