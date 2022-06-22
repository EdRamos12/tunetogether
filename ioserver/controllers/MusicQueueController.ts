import axios from 'axios';
import { NextApiRequest, NextApiResponse } from 'next';
import { parse } from 'url';
import filterMusicPlaylist from '../../utils/filterMusicPlaylist';

// TODO:
// transform this var to db info (aka instead of var, use the database dumass)
let musics: { song_url: string; time_to_play: number; duration: number; }[] = [];

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
}