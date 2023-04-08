import client from "../../utils/client";
import { io } from "../server";
import RoomLength from "../../utils/types/RoomLength";
import ServerSocket from "../../utils/types/ServerSocketUserId";

const leaveAllRooms = (obj: ServerSocket) => {
  obj.rooms.forEach((element: string) => {
    if (element.length === RoomLength) {
      // even *if* socket is at more than one room 
      // (theoretically) it will leave automatically
      obj.leave(element); 
    }
  });
}

export default class RoomController {
  async respond(socket: ServerSocket) {
    socket.on('join', async ({room, password}: {room: string, password: string}) => {
      //server checks if room length is the same as defined at the top
      if (room.length !== RoomLength) return new Error('Room length not enough! At least should be ' + RoomLength);

      // server checks if user is already at a room, and if it is, leave the old one
      if (socket.rooms.size > 1) leaveAllRooms(socket);

      socket.join(room);

      await client.connect();

      const collection = client.db(process.env.DB_NAME as string).collection("rooms");

      try {
        const data = await collection.findOne({ room_id: room });
        // if room is non existent, then create room in DB
        if (!data || data == null) { 
          await collection.insertOne({
            room_id: room,
            password,
            owner: socket.userId,
            song_list: [],
            users: [socket.userId]
          });
          io.in(room).emit('message', {user: socket.userId, text: 'i just created the room'});
        } else {
          if (!data.password) {
            await collection.updateOne(data, {
              $push: { users: socket.userId }
            });
            io.in(room).emit('message', {user: socket.userId, text: 'i just joined the room'});
          } else {
            if (data.password == password) {
              collection.updateOne(data, {
                $push: { users: socket.userId }
              });

              io.in(room).emit('message', {user: socket.userId, text: 'i just joined the room'});
            } else {
              socket.emit('password-exception', `Incorrect password for room '${room}'!`);
            }
          }
        }
      } catch (err) {
        socket.emit('server-exception', 'there was an error trying to find that ');
        console.log(err);
      } finally {
        await client.close();
      }
    });
    
    socket.on('leave', async () => {
      await client.connect();

      const collection = client.db(process.env.DB_NAME as string).collection('rooms');

      await collection.updateOne({ users: { $in: [socket.userId] } }, { $pull: { users: socket.userId } });

      leaveAllRooms(socket);

      await client.close();
    });
  }
}
