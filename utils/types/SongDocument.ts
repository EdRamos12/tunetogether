export default interface SongDocument {
  id: string,
  song_url: string,
  time_to_play: number,
  duration: number,
  title: string,
  channelTitle: string,
  requested_by: string
}