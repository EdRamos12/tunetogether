import SongDocument from "./types/SongDocument";

export default function filterMusicPlaylist (musics: Array<SongDocument>) {
  return (musics || []).filter((item) => item.time_to_play >= Date.now()-(item.duration*1000));
}