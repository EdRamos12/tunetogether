import { parse } from 'url'
import next from 'next'
import express, { Request, Response } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import routes from './routes';
import axios from 'axios';
import filterMusicPlaylist from '../utils/filterMusicPlaylist';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import RoomController from './controllers/RoomController';

const ROOM_LENGTH = parseInt(process.env.ROOM_LENGTH as string);
const roomController = new RoomController();

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let musics: { song_url: string; time_to_play: number; duration: number; }[] = [];

const youtubeDurationToSeconds = (duration: string) => { // returns everything into seconds
  const tempArray = duration.replace('PT', '').split('M');
  const seconds = Number(tempArray[tempArray.length - 1].replace('S', ''));

  if (tempArray[0].includes('H')) { // returns with hours, minutes and seconds
    const divideHoursAndMinutes = tempArray[0].split('H');
    const hours = Number(divideHoursAndMinutes[0]);
    const minutes = Number(divideHoursAndMinutes[1]);

    return (hours*60)*60+minutes*60+seconds;

  } else if (tempArray.length == 2) { // returns minutes and seconds

    const minutes = Number(tempArray[0]);

    return minutes*60+seconds;
  }
  return seconds; // returns seconds only
}

const queueMusicHandler = async (link: string) => {
  let duration;

  const options = parse(link, true);
  if (options.host?.includes('youtu.be') || options.host?.includes('youtube')) {
    let ytOptions;
    if (options.host?.includes('youtu.be')) {
      ytOptions = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${options.path?.replace('/', '')}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`) as any;
    } else {
      ytOptions = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${options.query.v}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`) as any;
    }
    duration = youtubeDurationToSeconds(ytOptions.data.items[0].contentDetails.duration as string);

    let time_to_play: number;
    let threshold = .5 * 1000; // half a second

    if (musics.length === 0 ) {
      time_to_play = Date.now();
    } else {
      time_to_play = musics[musics.length - 1].time_to_play + ((musics[musics.length - 1].duration + .5) * threshold);
    }
    musics = filterMusicPlaylist(musics);

    musics.push({
      song_url: link,
      time_to_play,
      duration
    });

    return options.path?.replace('/', '') || options.query.v; // temp
  }
}

let io: Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>;

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  io = new Server(httpServer, {
    path: '/socket.io'
  });
  io.use((socket, next) => {
    const header = socket.handshake.headers['authorization'];
    console.log('Auth header from '+socket.id+':', header);
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

    roomController.roomManager(socket);

    socket.on('send-message', (data: {message: string, room: string}) => {
      const {message, room} = data;
      // server checks to see if socket is sending message to another room, other than theirs
      if (!socket.rooms.has(room)) {socket.emit('exception', {errorMessage: 'Room identification error! (your room is not right with the server).'});}
      else io.to(room).emit('message', {user: socket.id, text: message});
    });

    socket.on('request-song', async (song: string) => {
      if (socket.rooms >= 3) {
        socket.emit('request-song-status', 'You are on two rooms! Leave one so you can submit to a proper room!');
      }

      await queueMusicHandler(song);
      console.log('song requested successfully => '+musics[musics.length-1]);
    });

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