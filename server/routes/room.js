const express = require('express');
const router = express.Router();
const {v4 : uuidv4} = require('uuid');
const rooms = require('../store/rooms')


function generateRoomId() {
  while(true) {
    let roomId = Math.floor(100000 + Math.random() * 900000).toString()

    if(rooms.has(roomId)) {
      continue;
    }
    return roomId;
  }
  }
router.post("/create", (req, res) => {
  const { username } = req.body;
  const roomId = generateRoomId();
  

  rooms[roomId] = { users: [] , admin : username };


  console.log("Room created:", roomId, "by", username);

  res.json({
    roomId,
    users: rooms[roomId].users,
    admin: rooms[roomId].admin,
  });
});

router.post("/join", (req, res) => {
  
  const {roomId , username } = req.body;
  console.log(req.body);
  console.log(roomId);

  if (!rooms[roomId]) {
    return res.status(404).json({ error: "Room not found" });
  }
  console.log(username , 'joined the room')
  res.json({ 
    roomId,
    users: rooms[roomId].users,
   });
});

module.exports =  router;
