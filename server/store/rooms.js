
// store/rooms.js
const rooms = new Set();
let roomId = 'dsa';
rooms[roomId] = { users: [] , admin : '_sidi' };
rooms['music'] = { users: [] , admin : 'Sidz' };
console.log(rooms);
module.exports = rooms;
