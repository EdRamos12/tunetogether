import { parse } from 'url';
import next from 'next';
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import RoomController from './controllers/RoomController';
import MusicQueueController from './controllers/MusicQueueController';
import ChatController from './controllers/ChatController';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { authMiddlewareSocketIO } from '../utils/authMiddleware';
import { errors } from 'celebrate';
import client from '../utils/client';

const ROOM_LENGTH = parseInt(process.env.ROOM_LENGTH as string);

const roomController = new RoomController();
const musicQueueController = new MusicQueueController();
const chatController = new ChatController();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

const deleteRoom = (room: string) => {
  client.db(process.env.DB_NAME).collection("rooms").deleteOne({ room_id: room }, function(err) {
    if (err) throw err;
    console.log(`IO Room ${room} has been deleted`);
    //client.close() study this later
  });
}

const deleteAllRooms = () => {
  client.db(process.env.DB_NAME).collection("rooms").deleteMany({}, function(err) {
    if (err) throw err;
    console.log(`All rooms been reset! (server start)`);
    //client.close() study this later
  });
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
    if (room.length > ROOM_LENGTH) return;
    console.log(`IO Room ${room} has been created`);
  });

  // room deleted, happens when no one is at the room anymore
  io.of('/').adapter.on('delete-room', (room) => { 
    if (room.length > ROOM_LENGTH) return;

    deleteRoom(room);
  });

  io.on('connection', (socket: any) => {
    console.log(`Client connected => ${socket.userId} ${socket.id}`);

    roomController.setIORoomController(socket);

    musicQueueController.setIORequestController(socket);

    chatController.setChatController(socket, io);

    socket.on('disconnect' , () => {
      console.log(`Client disconnected => ${socket.userId}`);
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