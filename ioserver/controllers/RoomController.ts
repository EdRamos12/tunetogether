import axios from "axios";
import { NextApiRequest, NextApiResponse } from "next";
import { parse } from 'url';
import filterMusicPlaylist from "../../utils/filterMusicPlaylist";

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

export default class RoomController {
  async get() { // TODO
  }
}
