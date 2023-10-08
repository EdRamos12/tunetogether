import SongDocument from "./types/SongDocument";

export default function filterMusicPlaylist (musics: Array<SongDocument>) {
  return (musics || []).filter((item) => {return Date.now() <= item.time_to_play+item.duration + .01 * 1000});
}