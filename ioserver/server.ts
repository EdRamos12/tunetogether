import { parse } from 'url'
import next from 'next'
import express, { Request, Response } from 'express';
import http from 'http';
import socket, { Server } from 'socket.io';
import routes from './routes';
import axios from 'axios';
import filterMusicPlaylist from '../utils/filterMusicPlaylist';
import { userInfo } from 'os';
import { Socket } from 'socket.io-client';

const ROOM_LENGTH = 5;

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

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer, {
    path: '/socket.io'
  });

  const clients: Array<any> = [];
  server.use('/io/', routes);

  // room created
  io.of('/').adapter.on('create-room', (room) => { 
    if (room.length > ROOM_LENGTH) return;
    console.log(`IO Room ${room} has been created`);
  });

  // room deleted
  io.of('/').adapter.on('delete-room', (room) => { 
    if (room.length > ROOM_LENGTH) return;
    console.log(`IO Room ${room} has been deleted`);
  });

  io.on('connection', (socket: any) => {
    console.log(`Cliente conectado => ${socket.id}`);

    socket.on('join', ({room, password}: {room: string, password: string}) => {
      if (room.length !== ROOM_LENGTH) return;
      socket.join(room);
      
      console.log(socket.rooms);
      io.in(room).emit('message', {user: socket.id, text: 'message'});
    });

    socket.on('sendMessage', (message: string) => {
      console.log(socket.rooms);
      io.to('aaaaa').emit('message', {user: socket.id, text: message, obj: socket.rooms}); //temp
    })

    socket.on('request-song', async (song: string) => {
      if (socket.rooms >= 3) {
        socket.emit('request-song-status', 'You are on two rooms! Leave one so you can submit to a proper room!');
      }

      await queueMusicHandler(song);
      console.log('song requested successfully => '+musics[musics.length-1]);
    });

    socket.on('disconnect' , () => {
      console.log(`Cliente desconectado => ${socket.id}`);
      clients.splice(clients.indexOf(socket), 1);
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