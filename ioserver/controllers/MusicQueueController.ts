import assert from 'assert';
import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'url';
import client from '../../utils/client';
import filterMusicPlaylist from '../../utils/filterMusicPlaylist';

// TODO:
// transform this var to db info (aka instead of var, use the database dumass)
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

    // request music list

    if (musics.length === 0 ) {
      time_to_play = Date.now();
    } else {
      time_to_play = musics[musics.length - 1].time_to_play + ((musics[musics.length - 1].duration + .5) * threshold);
    }
    musics = filterMusicPlaylist(musics);

    let musicToRequest = {
      song_url: link,
      time_to_play,
      duration
    };

    client.connect((err, result) => {
      assert.equal(null, err);
      console.log("Conectado ao server mongo => "+ result!.options.srvHost);
      const collection = client.db(process.env.DB_NAME as string).collection("rooms");
      collection.insertOne(musicToRequest, (err, userCreated) => {
          assert.equal(err, null);


        }
      );
    });

    return options.path?.replace('/', '') || options.query.v; // temp
  }
}

export default class MusicQueueController {
  get(rq: NextApiRequest, rsp: NextApiResponse) { // returns current music list
    // TODO:
    // conditional to return from entered room
    return rsp.json(musics as any);
  }

  sync(rq: NextApiRequest, rsp: NextApiResponse) { // returns DATE milliseconds to client, so client can get back on track
    musics = filterMusicPlaylist(musics);

    if (musics.length == 0) return rsp.status(404).json({ message: 'There are no songs! Try requesting one in the current room!' });

    let durationArray = musics.map( ({ time_to_play }) => time_to_play );
    const timeNow = Date.now();
    const currentTime = durationArray.reduce(function(prev: number, curr: number) {
      if (timeNow - curr > 0 && prev - curr < timeNow - curr) {
          return curr;
      } else {
          return prev;
      }
    });

    return rsp.status(200).json({ message: musics.find(item => item.time_to_play === currentTime) });
  }

  request(socket: any) {
    socket.on('request-song', async (song: string) => {
      if (socket.rooms >= 3) {
        socket.emit('request-song-status', 'You are on two rooms! Leave one so you can submit to a proper room!');
      }

      await queueMusicHandler(song);
      console.log('song requested successfully => '+musics[musics.length-1]);
    });
  }
}