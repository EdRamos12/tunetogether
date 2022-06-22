export default function filterMusicPlaylist (musics: any) {
  return musics.filter((item: any) => item.time_to_play >= Date.now()-(item.duration*1000));
}