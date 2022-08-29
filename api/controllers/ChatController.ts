import { Server } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";

export default class ChatController {
  setChatController(socket: any, io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>) {
    socket.on('send-message', (data: {message: string, room: string}) => {
      const {message, room} = data;
      // server checks to see if socket is sending message to another room, other than theirs
      if (!socket.rooms.has(room)) {socket.emit('exception', {errorMessage: 'Room identification error! (your room is not right with the server).'});}
      else io.to(room).emit('message', {user: socket.id, text: message});
    });
  }
}