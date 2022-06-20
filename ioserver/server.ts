import { parse } from 'url'
import next from 'next'
import express from 'express';
import http from 'http';
import socket, { Server } from 'socket.io';
import axios from 'axios';

const ROOM_LENGTH = 5;

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

let musics: { song_url: string; time_to_play: number; duration: number; }[] = [];

const youtubeDurationToSeconds = (duration: string) => {
  const tempArray = duration.replace('PT', '').split('M');
  const seconds = Number(tempArray[tempArray.length - 1].replace('S', ''));
  if (tempArray[0].includes('H')) {
    const divideHoursAndMinutes = tempArray[0].split('H');
    const hours = Number(divideHoursAndMinutes[0]);
    const minutes = Number(divideHoursAndMinutes[1]);

    return (hours*60)*60+minutes*60+seconds;
  } else if (tempArray.length == 2) {
    const minutes = Number(tempArray[0]);

    return minutes*60+seconds;
  }
  return seconds;
}

const filterMusicPlaylist = () => {
  musics = musics.filter((item: any) => item.time_to_play >= Date.now()-(item.duration*1000));
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
    let threshold = 1 * 1000; // 1 second

    if (musics.length === 0 ) {
      time_to_play = Date.now();
    } else {
      time_to_play = musics[musics.length - 1].time_to_play + ((musics[musics.length - 1].duration + .5) * threshold);
    }
    filterMusicPlaylist();

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
    var roomCode = socket.handshake.query.roomCode;
    if (!roomCode || roomCode.length <= ROOM_LENGTH - 1) {  
      socket.emit('disconnected', 'You must provide a valid room code to make an IO connection!')
      socket.disconnect();
    } //temp server handler
    socket.join(roomCode);
    console.log(`Cliente conectado => ${socket.id}`);
    clients.push(socket);

    // socket.on('join', (room: string, password: string) => {
    //   if (room.length !== ROOM_LENGTH) return;
    //   socket.join(room);
    //   console.log(socket.rooms);
    // });

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

  server.get('/io/get-songs', (req: any, res: any) => {
    return res.json(musics as any);
  });

  server.get('/io/sync', (_: any, res: any) => {
    filterMusicPlaylist();

    if (musics.length == 0) return res.status(404).json({ message: 'There are no songs! Try requesting one in the current room!' });

    let durationArray = musics.map( ({ time_to_play }) => time_to_play );
    const timeNow = Date.now();
    const currentTime = durationArray.reduce(function(prev: number, curr: number) {
      if (timeNow - curr > 0 && prev - curr < timeNow - curr) {
          return curr;
      } else {
          return prev;
      }
    });

    return res.status(200).json({ message: musics.find(item => item.time_to_play === currentTime) });
  });
  
  server.all('*', (req: any, res: any) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  httpServer.listen(port, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  });
});