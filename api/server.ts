import { parse } from 'url'
import next from 'next'
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import RoomController from './controllers/RoomController';
import MusicQueueController from './controllers/MusicQueueController';
import ChatController from './controllers/ChatController';
import cookie from "cookie";
import bodyParser from 'body-parser';

const ROOM_LENGTH = parseInt(process.env.ROOM_LENGTH as string);

const roomController = new RoomController();
const musicQueueController = new MusicQueueController();
const chatController = new ChatController();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

app.prepare().then(() => {
  const server = express();

  server.use(bodyParser.json());

  const httpServer = http.createServer(server);
  io = new Server(httpServer, {
    path: '/socket.io'
  });

  io.use((socket, next) => {
    const header = cookie.parse(socket.handshake.headers.cookie as string);
    console.log('Auth header from '+socket.id+':', header.__bruh);
    return next();
  })
  
  server.use('/io/', routes);

  // room created, happens when someone tries to join a room for the first time
  io.of('/').adapter.on('create-room', (room) => { 
    if (room.length > ROOM_LENGTH) return;
    console.log(`IO Room ${room} has been created`);
  });

  // room deleted, happens when no one is at the room anymore
  io.of('/').adapter.on('delete-room', (room) => { 
    if (room.length > ROOM_LENGTH) return;
    console.log(`IO Room ${room} has been deleted`);
  });

  io.on('connection', (socket: any) => {
    console.log(`Client connected => ${socket.id}`);

    roomController.setIORoomController(socket);

    musicQueueController.setIORequestController(socket);

    chatController.setChatController(socket, io);

    socket.on('disconnect' , () => {
      console.log(`Client disconnected => ${socket.id}`);
    })
  });

  // SET SERVER
  server.all('*', (req: Request, res: Response) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});

export { io };