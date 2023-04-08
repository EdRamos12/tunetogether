import axios from 'axios';
import { NextApiResponse } from 'next';
import { parse } from 'url';
import client from '../../utils/client';
import filterMusicPlaylist from '../../utils/filterMusicPlaylist';
import { NextApiRequestLoggedIn } from '../../utils/authMiddleware';
import { io } from "../server";
import SongDocument from '../../utils/types/SongDocument';
import RoomLength from '../../utils/types/RoomLength';
import { v4 } from 'uuid';
import ServerSocket from '../../utils/types/ServerSocketUserId';

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

const getCurrentSongTime = (musics: Array<SongDocument>) => {
  const durationArray = musics.map(({ time_to_play }: {time_to_play: number}) => time_to_play);

  const timeNow = Date.now();
  
  return durationArray.reduce(function(prev: number, curr: number) {
    if (timeNow - curr > 0 && prev - curr < timeNow - curr) {
        return curr;
    } else {
        return prev;
    }
  });
}

const getRoomsCollection = async (filter: { [label: string]: any }) => {
  const collection = client.db(process.env.DB_NAME as string).collection("rooms");
  return await collection.findOne(filter);
}

export default class MusicQueueController {
  async get(rq: NextApiRequestLoggedIn, rsp: NextApiResponse) { // returns current music list
    await client.connect();

    const result = await getRoomsCollection({ users: rq.userId });

    if (!result) return rsp.status(404).json({ error: true, message: "You are not in a room!" });

    const song_list = filterMusicPlaylist(result.song_list as Array<SongDocument>);

    if (song_list.length == 0) return rsp.status(404).json({ message: 'There are no songs! Try requesting one in the current room!' });

    await client.close();
    return rsp.json({ current_server_time: Date.now(), current_song: song_list.find((item: SongDocument) => item.time_to_play === getCurrentSongTime(song_list)), song_list });
  }

  async sync(rq: NextApiRequestLoggedIn, rsp: NextApiResponse) { // returns DATE milliseconds to client, so client can get back on track
    await client.connect();

    const result = await getRoomsCollection({ users: rq.userId });

    if (!result) return rsp.status(404).json({ error: true, message: 'You are not in a room! Join a room before syncing up!' })

    const musics = filterMusicPlaylist(result?.song_list);

    if (musics.length == 0) return rsp.status(404).json({ message: 'There are no songs! Try requesting one in the current room!' });

    await client.close();
    return rsp.status(200).json({ current_server_time: Date.now(), current_song: musics.find((item: SongDocument) => item.time_to_play === getCurrentSongTime(musics)) });
  }

  respond(socket: ServerSocket) {
    socket.on('request-song', async (song: string) => {
      if (Array.from(socket.rooms).length >= 3) {
        socket.emit('request-song-status', 'You are on two rooms! Leave one so you can submit to a proper room!');
      }

      let duration;
      const options = parse(song, true);
      const current_socket_room = Array.from(socket.rooms).find((room: any) => room.length === RoomLength)

      await client.connect();
      const collection = client.db(process.env.DB_NAME as string).collection("rooms");
      const result = await collection.findOne({ room_id: current_socket_room });

      if (options.host?.includes('youtu.be') || options.host?.includes('youtube')) {
        let ytOptions;
        if (options.host?.includes('youtu.be')) {
          ytOptions = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${options.path?.replace('/', '')}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`) as any;
        } else {
          ytOptions = await axios.get(`https://www.googleapis.com/youtube/v3/videos?id=${options.query.v}&part=contentDetails&key=${process.env.YOUTUBE_API_KEY}`) as any;
        }
        duration = youtubeDurationToSeconds(ytOptions.data.items[0].contentDetails.duration as string);

        let time_to_play: number;
        const threshold = .2 * 1000;

        // request music list

        if (result?.song_list.length === 0) {
          time_to_play = Date.now();
        } else {
          time_to_play = result?.song_list[result?.song_list.length - 1].time_to_play + ((result?.song_list[result?.song_list.length - 1].duration + .5) * threshold);
        }
        const updatedSongList = filterMusicPlaylist(result?.song_list);

        const musicToRequest = {
          id: v4(),
          song_url: song,
          time_to_play,
          duration
        };

        await client.connect();

        await collection.updateOne({users: socket.userId}, {$set: { song_list: [...updatedSongList, musicToRequest] }});

        const new_array = [...updatedSongList, musicToRequest]
        console.log(`${socket.userId} requested song successfully => ${new_array[new_array.length-1].song_url} at room ${result?.room_id}`);
        io.in(result?.room_id).emit('song-queue', new_array);

        await client.close();
      }
    });
  }
}