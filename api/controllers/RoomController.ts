import assert from "assert";
import client from "../../utils/client";
import { io } from "../server";
const ROOM_LENGTH = parseInt(process.env.ROOM_LENGTH as string);

const leaveAllRooms = (obj: any) => {
  obj.rooms.forEach((element: string) => {
    if (element.length === ROOM_LENGTH) {
      // even *if* socket is at more than one room (theoretically)
      // it will leave automatically
      obj.leave(element); 
    }
  });
}

export default class RoomController {
  async setIORoomController(socket: any) { // TODO
    socket.on('join', ({room, password}: {room: string, password: string}) => {
      //server checks if room length is the same as defined at the top
      if (room.length !== ROOM_LENGTH) return new Error('Room length not enough! At least should be ' + ROOM_LENGTH);
      // server checks if user is already at a room, and if it is, leave the old one
      if (socket.rooms.size > 1) { 
        leaveAllRooms(socket);
      }
      socket.join(room);

      const collection = client.db(process.env.DB_NAME as string).collection("rooms");
        collection.findOne({ room_id: room }, (err, data) => {
          if (err) {
            socket.emit('server-exception', 'there was an error trying to find that ');
            console.log(err);
          }

          // if room is non existent, then create room in DB
          if (!data || data == null) { 
            collection.insertOne({
              room_id: room,
              password,
              owner: socket.userId,
              song_list: [],
              users: [socket.userId]
            }, (err, _) => {
              assert.equal(err, null);
              // temporary announcing that user joined the room
              io.in(room).emit('message', {user: socket.userId, text: 'i just created the room'});
            });
          } else {
            if (!data.password) {
              collection.updateOne(data, {
                $push: { users: socket.userId } // replace with actual user
              }, (err, _) => {
                assert.equal(err, null);
                // temporary announcing that user joined the room
                io.in(room).emit('message', {user: socket.userId, text: 'i just joined the room'});
              });
            } else {
              if (data.password == password) {
                collection.updateOne(data, {
                  $push: { users: socket.userId } // replace with actual user
                }, (err, _) => {
                  assert.equal(err, null);
                  // temporary announcing that user joined the room
                  io.in(room).emit('message', {user: socket.userId, text: 'i just joined the room'});
                });
              } else {
                socket.emit('password-exception', 'Incorrect password!');
              }
            }
          }
      });
      
    });
    
    socket.on('leave', () => {
      const collection = client.db(process.env.DB_NAME as string).collection('rooms');
      // later update with user data
      collection.updateOne({ users: socket.userId }, { $pull: { users: socket.userId } });
      leaveAllRooms(socket);
    });
  }
}
