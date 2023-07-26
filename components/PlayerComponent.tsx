import { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import SongDocument from "../utils/types/SongDocument";
import axiosInstance from "../utils/axiosInstance";
import getYoutubeVideoId from "../utils/getYoutubeVideoId";

interface WindowWithYTApi extends Window {
  YT: any
}

const PlayerComponent = () => {
  const { socket, room, setCurrentSongPlaylist } = useContext(SocketContext);
  const [songList, setSongList] = useState<Array<SongDocument>>([]);
  const songListRef = useRef(songList);

  const [currentSong, setCurrentSong] = useState<{ url?: string, platform?: string, time_to_play?: number, id?: string }>({});
  const currentSongRef = useRef(currentSong);

  const [lastTimeSynced, setLastTimeSynced] = useState<{ last_time?: number, last_time_video?: number, video_synced_index?: number }>({});
  let lastTimeSyncedRef = useRef(lastTimeSynced);

  const youtubeIframe = useRef<HTMLIFrameElement>(null);
  const [ytPlayer, setYrPlayer] = useState<YT.Player | undefined>(undefined);

  const getCurrentSongList = async () => {
    try {
      const response = await axiosInstance.get('/get-songs');
      setSongList(response.data.song_list);
    } catch (err) {
      console.error(err);
    }
  }

  async function syncCurrentTime() {
    const start_time = Date.now();
    const current_time = await axiosInstance.get('/sync');
    const latency = Date.now() - start_time;
    const current_song_index = current_time.data.song_list?.findIndex((item: any) => item.id === current_time.data.current_song.id);

    setLastTimeSynced({
      last_time: Date.now(),
      video_synced_index: current_song_index || 0,
      last_time_video: (current_time.data.current_server_time + latency - current_time.data.current_song.time_to_play) / 1000
    });
    lastTimeSyncedRef.current = {
      last_time: Date.now(),
      video_synced_index: current_song_index || 0,
      last_time_video: (current_time.data.current_server_time + latency - current_time.data.current_song.time_to_play) / 1000
    }

    const current_song = current_time.data.current_song.song_url as string;

    if (currentSong.time_to_play !== current_time.data.current_song.time_to_play) {
      const current_song_state = { 
        id: current_time.data.current_song.id,
        url: getYoutubeVideoId(current_song), 
        platform: 'yt', 
        time_to_play: current_time.data.current_song.time_to_play, 
      };
      currentSongRef.current = current_song_state;
      setCurrentSong(current_song_state);
    }
    return current_time;
  }

  useEffect(() => {
    if (!socket?.connected || room === '') return;

    getCurrentSongList();
    
    socket.on('song-queue', (data: Array<SongDocument>) => {
      console.log('list updated: ', data);
      songListRef.current = data;
      setSongList(data);
    });
  }, [socket?.connected, room]);

  useEffect(() => {
    setCurrentSongPlaylist(songList);
    if (songList.length === 0) return;

    syncCurrentTime();
  }, [songList]);

  useEffect(() => {
    lastTimeSyncedRef.current = lastTimeSynced;
  }, [lastTimeSynced]);

  useEffect(() => {
    if (Object.keys(currentSong).length === 0) return;

    if (!ytPlayer) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      const onPlayerChangedPlayingStatus = (event: YT.OnStateChangeEvent) => {
        const currentLastTimeSynced = lastTimeSyncedRef.current;
        const tolerance_in_seconds = 1.5
        const difference_when_last_synced_locally_using_date_now = Date.now() - (currentLastTimeSynced?.last_time || 0);
        const difference_when_last_synced_locally_using_video_time = event.target.getCurrentTime() - (currentLastTimeSynced?.last_time_video || 0);

        const previous_time_stamp = (currentLastTimeSynced.last_time_video!) + ((Date.now() - (currentLastTimeSynced.last_time || 0)) / 1000);
        const difference_in_seconds = previous_time_stamp - event.target.getCurrentTime();

        const new_time = Math.floor(event.target.getCurrentTime() + difference_in_seconds);

        const resyncVideoLocally = () => {
          console.log('RESYNCED');
          console.log(event.target.getVideoUrl(), currentSongRef.current.url)
          if (event.target.getVideoUrl().includes(currentSongRef.current.url as string)) event.target.seekTo(new_time, true);
          const last_synced = {
            last_time: Date.now(),
            video_synced_index: songListRef.current.findIndex(item => item.id === currentSongRef.current.id),
            last_time_video: new_time,
          }
          lastTimeSyncedRef.current = last_synced;
          setLastTimeSynced(last_synced);
        }

        switch (event.data) {
          case (window as WindowWithYTApi).YT.PlayerState.UNSTARTED:
            event.target.playVideo();
            break;
          case (window as WindowWithYTApi).YT.PlayerState.PAUSED:
            event.target.playVideo();
          case (window as WindowWithYTApi).YT.PlayerState.PLAYING:
            if (difference_when_last_synced_locally_using_date_now / 1000 < tolerance_in_seconds) break; 
  
            if (difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < 1.5 && difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > -1.5) break;
  
            // debug for real-time sync
  
            // console.log(`last time it was at: ${Math.floor(previous_time_stamp / 60)}:${String(Math.floor(previous_time_stamp - Math.floor(previous_time_stamp / 60) * 60)).padStart(2, '0')}`)
            // console.log(`currently on: ${Math.floor(event.target.getCurrentTime() / 60)}:${String(Math.floor(event.target.getCurrentTime() - Math.floor(event.target.getCurrentTime() / 60) * 60)).padStart(2, '0')}`);
            // console.log(`difference is about: ${Math.floor(difference_in_seconds / 60)}:${String(Math.floor(difference_in_seconds - Math.floor(difference_in_seconds / 60) * 60)).padStart(2, '0')}`);
            // console.log(`it should be at: ${Math.floor(new_time / 60)}:${String(Math.floor(new_time - Math.floor(new_time / 60) * 60)).padStart(2, '0')}`);
  
            resyncVideoLocally();
            break;
          case (window as WindowWithYTApi).YT.PlayerState.ENDED:
  
            if (difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > 1.5 || difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < -1.5) {
              //console.log(difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > 1.5)
              //console.log(difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < -1.5)
              resyncVideoLocally(); 
              break;
            }

            const current_song_list = songListRef.current;
            const current_song = current_song_list.find(item => item.id === currentSongRef.current.id);
            const index_from_current_song = current_song_list.findIndex(item => item.id === currentSongRef.current.id);
  
            if (index_from_current_song === -1 && current_song_list.length > 0) {
              syncCurrentTime();
              break;
            } 
            
            if (current_song === current_song_list[current_song_list.length - 1]) break;
  
            event.target.loadVideoById(getYoutubeVideoId(current_song_list[index_from_current_song + 1].song_url));

            break;
        }
      }
  
      const onPlayerReady = (event: YT.PlayerEvent) => {
        event.target.seekTo(lastTimeSyncedRef.current.last_time_video as number, true);
        event.target.playVideo();
      };
  
      const onPlayerPlaybackRateChange = (event: YT.PlayerEvent) => {
        event.target.setPlaybackRate(1);
      }
  
      const youtubeIframeSetup = () => {
        setYrPlayer(new (window as WindowWithYTApi).YT.Player(youtubeIframe.current, { 
          videoId: currentSongRef.current.url,
          playerVars: {
            autoplay: 1,
            controls: 0 
          },
          events: {
            onStateChange: onPlayerChangedPlayingStatus,
            onReady: onPlayerReady,
            onPlaybackRateChange: onPlayerPlaybackRateChange,
            onError: (err: any) => console.log(err),
          },
        }));
      };
  
      (window as any).onYouTubeIframeAPIReady = youtubeIframeSetup;
  
      return () => {
        delete (window as any).onYouTubeIframeAPIReady;
      };
    } else {
      ytPlayer.loadVideoById(currentSongRef.current.url as string);
    }
  }, [currentSong]);

  // MOCK FOR LAYOUT ONLY, REMOVING LATER
  useEffect(() => {
    setCurrentSong({
      url: '9i38FPugxB8',
      id: 'DEBUG',
      platform: 'yt', 
      time_to_play: Date.now(), 
    })
  }, []);

  return <>
    {currentSong?.platform === 'yt' && (
      <div style={{width: "100%", height: "auto", aspectRatio: "16 / 9"}}
        ref={youtubeIframe}
      />
    )}
  </>
}

export default PlayerComponent;