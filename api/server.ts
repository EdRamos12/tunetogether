import { parse } from 'url';
import next from 'next';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import RoomController from './controllers/RoomController';
import MusicQueueController from './controllers/MusicQueueController';
import ChatController from './controllers/ChatController';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { authMiddlewareSocketIO } from '../utils/authMiddleware';
import { errors } from 'celebrate';
import client from '../utils/client';
import RoomLength from '../utils/types/RoomLength';
import ServerSocket from '../utils/types/ServerSocketUserId';

const room_controller = new RoomController();
const music_queue_controller = new MusicQueueController();
const chat_controller = new ChatController();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let io: Server;

const deleteRoom = async (room: string) => {
  try {
    await client.db(process.env.DB_NAME).collection("rooms").deleteOne({ room_id: room });  
    console.log(`IO Room ${room} has been deleted`);
  } catch (err) {
    if (err) throw err;
  }
}

const deleteAllRooms = async () => {
  try {
    await client.db(process.env.DB_NAME).collection("rooms").deleteMany({}); 
    console.log(`All rooms been reset! (server start)`);
  } catch (err) {
    if (err) throw err;
  }
}

app.prepare().then(() => {
  const server = express();

  server.use(bodyParser.json());

  server.use(cookieParser());

  const httpServer = http.createServer(server);
  io = new Server(httpServer, {
    path: '/socket.io'
  });

  io.use(authMiddlewareSocketIO);

  server.use('/io/', routes);

  server.use(errors());

  server.disable('x-powered-by');

  // room created, happens when someone tries to join a room for the first time
  io.of('/').adapter.on('create-room', (room) => { 
    if (room.length > RoomLength) return;
    console.log(`IO Room ${room} has been created`);
  });

  // room deleted, happens when no one is at the room anymore
  io.of('/').adapter.on('delete-room', (room) => { 
    if (room.length > RoomLength) return;

    deleteRoom(room);
  });

  io.on('connection', async (socket: ServerSocket) => {
    console.log(`Client connected => ${socket.userId} ${socket.id}`);

    await client.connect();

    const collection = client.db(process.env.DB_NAME as string).collection('rooms');

    const user_room = await collection.findOne({ users: socket.userId }); 

    if (user_room) {
      socket.join(user_room.room_id);
      socket.to(socket.id).emit('room-status', {
        current_room: user_room.room_id
      });
    }

     

    // set controllers
    room_controller.respond(socket);
    music_queue_controller.respond(socket);
    chat_controller.respond(socket, io);

    socket.on('disconnect' , async () => {
      console.log(`Client disconnected => ${socket.userId}`);

      await client.connect();

      const collection = client.db(process.env.DB_NAME as string).collection('rooms');

      try {
        await collection.updateOne({ users: { $in: [socket.userId] } }, { $pull: { users: socket.userId } });
      } catch (err) {
        console.error(err);
      } finally {
         
      }
    })
  });

  // SET SERVER
  server.all('*', (req: Request, res: Response) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    deleteAllRooms();
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});

export { io };