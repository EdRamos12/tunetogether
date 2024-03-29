import { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../../context/SocketContext";
import SongDocument from "../../utils/types/SongDocument";
import axiosInstance from "../../utils/axiosInstance";
import getYoutubeVideoId from "../../utils/getYoutubeVideoId";
import styles from '../../styles/Room.module.css';

interface Song {
  url?: string, 
  platform?: string, 
  time_to_play?: number, 
  id?: string, 
  requested_by?: string
}

interface LastTimeSynced {
  last_time?: number, 
  last_time_video?: number, 
  video_synced_index?: number
}

const PlayerComponent = () => {
  const { socket, room, setCurrentSongPlaylist } = useContext(SocketContext);
  const [songList, setSongList] = useState<Array<SongDocument>>([]);
  const songListRef = useRef(songList);

  const [currentSong, setCurrentSong] = useState<Song>({});
  const currentSongRef = useRef(currentSong);

  const [lastTimeSynced, setLastTimeSynced] = useState<LastTimeSynced>({});
  let lastTimeSyncedRef = useRef(lastTimeSynced);

  const youtubeIframe = useRef<HTMLIFrameElement>(null);
  const [ytPlayer, setYrPlayer] = useState<YT.Player | undefined>(undefined);
  const ytPlayerRef = useRef(ytPlayer);

  const [playerState, setPlayerState] = useState(-1);
  const playerStateRef = useRef<number>(playerState);

  // this function is executed only when the page is finished loading
  async function getCurrentSongList() {
    try {
      const response = await axiosInstance.get('/get-songs');
      setSongList(response.data.song_list);
    } catch (err) {
      // console.error(err);
    }
  }

  // this function verifies if the current song is the same as the server is projecting
  // TODO: do only one request of /sync so it doesn't request the server every time it changes the music...
  // the front-end CAN determine which video it's currently on, without depending on the server too much
  // and if this keeps on, it's heavy for the server (._.;;).
  async function syncCurrentTime() {
    const start_time = Date.now();
    const current_time = await axiosInstance.get('/sync');
    const latency = Date.now() - start_time;
    const current_song_index = current_time.data.song_list?.findIndex((item: any) => item.id === current_time.data.current_song.id);

    const video_starting_time = (current_time.data.current_server_time + latency - current_time.data.current_song.time_to_play) / 1000;

    const current_song = current_time.data.current_song.song_url as string;

    const lastTimeSynced = {
      last_time: Date.now(),
      video_synced_index: current_song_index || 0,
      last_time_video: video_starting_time < 0 ? 0 : video_starting_time
    }

    setLastTimeSynced(lastTimeSynced);
    lastTimeSyncedRef.current = lastTimeSynced;

    if (currentSong.time_to_play !== current_time.data.current_song.time_to_play) {
      const current_song_state = { 
        id: current_time.data.current_song.id,
        url: getYoutubeVideoId(current_song), 
        platform: 'yt', 
        time_to_play: current_time.data.current_song.time_to_play, 
        requested_by: current_time.data.current_song.requested_by
      };

      currentSongRef.current = current_song_state;
      setCurrentSong(current_song_state);
    } else {
      if (!ytPlayerRef.current) return;

      const currentLastTimeSynced = lastTimeSyncedRef.current;
      const tolerance_in_seconds = 1.5;
      const difference_when_last_synced_locally_using_date_now = Date.now() - (currentLastTimeSynced?.last_time || 0);
      const difference_when_last_synced_locally_using_video_time = ytPlayerRef.current.getCurrentTime() - (currentLastTimeSynced?.last_time_video || 0);

      if (difference_when_last_synced_locally_using_date_now / 1000 < tolerance_in_seconds) return; 
  
      if (difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < tolerance_in_seconds && difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > -tolerance_in_seconds) return;  
      
      resyncVideo();
    }

    return current_time;
  }

  // this function verifies if the video is sync with the server, and it syncs again if it isn't (ALL LOCALLY)
  async function resyncVideo() {
    if (!ytPlayerRef.current) return false;

    const previous_time_stamp = (lastTimeSynced.last_time_video!) + ((Date.now() - (lastTimeSynced.last_time || 0)) / 1000);
    const difference_in_seconds = previous_time_stamp - ytPlayerRef.current.getCurrentTime();

    const new_time = Math.floor(ytPlayerRef.current.getCurrentTime() + difference_in_seconds);

    //console.log('RESYNCED');
    //console.log(ytPlayerRef.current.getVideoUrl(), currentSongRef.current.url)

    const current_song_list = songListRef.current;
    const index_from_current_song = current_song_list.findIndex(item => item.id === currentSongRef.current.id);

    if (new_time >= ytPlayerRef.current.getDuration()) {
      if (index_from_current_song === -1 && current_song_list.length > 0) return false;
      syncCurrentTime();
    };
    
    // if (ytPlayerRef.current.getVideoUrl().includes(currentSongRef.current.url as string)) ytPlayerRef.current.seekTo(new_time, true);
    // const last_synced = {
    //   last_time: Date.now(),
    //   video_synced_index: songListRef.current.findIndex(item => item.id === currentSongRef.current.id),
    //   last_time_video: new_time,
    // }
    // lastTimeSyncedRef.current = last_synced;
    // setLastTimeSynced(last_synced);
    // syncCurrentTime();

    if (ytPlayerRef.current.getVideoUrl().includes(currentSongRef.current.url as string)) {
      ytPlayerRef.current.seekTo(new_time, true);
      const last_synced = {
        last_time: Date.now(),
        video_synced_index: songListRef.current.findIndex(item => item.id === currentSongRef.current.id),
        last_time_video: new_time,
      }
      lastTimeSyncedRef.current = last_synced;
      setLastTimeSynced(last_synced);
      return true;
    } else syncCurrentTime();
    return true;
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

  // useEffect(() => {
  //   if (ytPlayerRef.current?.getCurrentTime !== undefined)
  // }, [ytPlayerRef.current?.getCurrentTime])

  useEffect(() => {
    if (Object.keys(currentSong).length === 0) return;
    //console.log('yeah');
    if (!ytPlayer) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      const resyncVideoLocally = (event: YT.OnStateChangeEvent | YT.PlayerEvent, currentLastTimeSynced: LastTimeSynced) => {
        const previous_time_stamp = (currentLastTimeSynced.last_time_video!) + ((Date.now() - (currentLastTimeSynced.last_time || 0)) / 1000);
        const difference_in_seconds = previous_time_stamp - event.target.getCurrentTime();

        const new_time = Math.floor(event.target.getCurrentTime() + difference_in_seconds);

        //console.log('RESYNCED');
        //console.log(event.target.getVideoUrl(), currentSongRef.current.url)
        
        if (event.target.getVideoUrl().includes(currentSongRef.current.url as string)) {
          if (new_time >= event.target.getDuration()) return false;
          event.target.seekTo(new_time, true);
          const last_synced = {
            last_time: Date.now(),
            video_synced_index: songListRef.current.findIndex(item => item.id === currentSongRef.current.id),
            last_time_video: new_time,
          }
          lastTimeSyncedRef.current = last_synced;
          setLastTimeSynced(last_synced);
          return true;
        } else syncCurrentTime();

        return false;
      }

      const onPlayerChangedPlayingStatus = (event: YT.OnStateChangeEvent) => {
        playerStateRef.current = event.data;
        setPlayerState(event.data);
        console.log('event data: '+event.data);

        const currentLastTimeSynced = lastTimeSyncedRef.current;
        const tolerance_in_seconds = 1.5;
        const difference_when_last_synced_locally_using_date_now = Date.now() - (currentLastTimeSynced?.last_time || 0);
        const difference_when_last_synced_locally_using_video_time = event.target.getCurrentTime() - (currentLastTimeSynced?.last_time_video || 0);

        switch (event.data) {
          case window.YT.PlayerState.UNSTARTED:
            event.target.playVideo();
          case window.YT.PlayerState.PAUSED:
            // if (!videoPausedRef.current) {
            //   event.target.playVideo();
            // } else {
            //   break;
            // }
          case window.YT.PlayerState.BUFFERING:
          case window.YT.PlayerState.PLAYING:
            console.log('is the sync behind?', difference_when_last_synced_locally_using_date_now / 1000 < tolerance_in_seconds);
            console.log('is the video forward?', difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < 1.5)
            console.log('is the video behind?', difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > -1.5)

            if (difference_when_last_synced_locally_using_date_now / 1000 < tolerance_in_seconds) break; 
  
            if (difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < tolerance_in_seconds && difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > -tolerance_in_seconds) break;  
            // debug for real-time sync
  
            // console.log(`last time it was at: ${Math.floor(previous_time_stamp / 60)}:${String(Math.floor(previous_time_stamp - Math.floor(previous_time_stamp / 60) * 60)).padStart(2, '0')}`)
            // console.log(`currently on: ${Math.floor(event.target.getCurrentTime() / 60)}:${String(Math.floor(event.target.getCurrentTime() - Math.floor(event.target.getCurrentTime() / 60) * 60)).padStart(2, '0')}`);
            // console.log(`difference is about: ${Math.floor(difference_in_seconds / 60)}:${String(Math.floor(difference_in_seconds - Math.floor(difference_in_seconds / 60) * 60)).padStart(2, '0')}`);
            // console.log(`it should be at: ${Math.floor(new_time / 60)}:${String(Math.floor(new_time - Math.floor(new_time / 60) * 60)).padStart(2, '0')}`);
  
            if (!resyncVideoLocally(event, currentLastTimeSynced)) syncCurrentTime();
            break;
          case window.YT.PlayerState.ENDED:
            if (difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time > tolerance_in_seconds || difference_when_last_synced_locally_using_date_now / 1000 - difference_when_last_synced_locally_using_video_time < -tolerance_in_seconds) {
              //console.log('tried to sync');
              // if this returns false, the website determined that the video will sync to when the video is already finished, so it'll just continue as usual
              if (resyncVideoLocally(event, currentLastTimeSynced)) break;
            }

            const current_song_list = songListRef.current;
            const current_song = current_song_list.find(item => item.id === currentSongRef.current.id);
            const index_from_current_song = current_song_list.findIndex(item => item.id === currentSongRef.current.id);
  
            // if (index_from_current_song === -1 && current_song_list.length > 0) {
            //   //console.log("couldn't find any new song");
            //   // syncCurrentTime();
            //   break;
            // } 
            

            if (current_song === current_song_list[current_song_list.length - 1] || (index_from_current_song === -1 && current_song_list.length > 0)) {
              //console.log('it determined it was the last song on the playlist')
              break;
            }
            
            const {id, song_url, requested_by, time_to_play} = current_song_list[index_from_current_song + 1];

            const newCurrentSong = {
              id,
              platform: song_url.includes('youtube') || song_url.includes('youtu.be') ? 'yt' : 'soundcloud',
              requested_by,
              time_to_play,
              url: song_url.includes('youtube') || song_url.includes('youtu.be') ? getYoutubeVideoId(song_url) : '',
            }

            const lastTimeSynced = {
              last_time: Date.now(),
              video_synced_index: index_from_current_song + 1,
              last_time_video: (Date.now() - time_to_play) / 1000
            }
        
            setLastTimeSynced(lastTimeSynced);
            lastTimeSyncedRef.current = lastTimeSynced;
            
            currentSongRef.current = newCurrentSong;
            setCurrentSong(newCurrentSong);

            break;
        }
      }
  
      const onPlayerReady = (event: YT.PlayerEvent) => {
        event.target.seekTo(lastTimeSyncedRef.current.last_time_video as number, true);
        event.target.playVideo();
        resyncVideoLocally(event, lastTimeSyncedRef.current);
      };
  
      const onPlayerPlaybackRateChange = (event: YT.PlayerEvent) => {
        event.target.setPlaybackRate(1);
      }

      let ytPlayerLocal: YT.Player | undefined;
  
      const youtubeIframeSetup = () => {
        ytPlayerLocal = new window.YT.Player(youtubeIframe.current as unknown as string, { 
          videoId: currentSongRef.current.url,
          playerVars: {
            autoplay: 1,
            //controls: 0 
          },
          events: {
            onStateChange: onPlayerChangedPlayingStatus,
            onReady: onPlayerReady,
            onPlaybackRateChange: onPlayerPlaybackRateChange,
            onError: (err: any) => console.log(err),
          },
        });
        setYrPlayer(ytPlayerLocal);
        ytPlayerRef.current = ytPlayerLocal;
      };
  
      (window as any).onYouTubeIframeAPIReady = youtubeIframeSetup;
  
      return () => {
        delete (window as any).onYouTubeIframeAPIReady;
      };
    } else {
      const loadVideo = () => {
        if (!ytPlayer.loadVideoById) {
          if (!ytPlayerRef.current || !ytPlayerRef.current.loadVideoById) {
            setTimeout(loadVideo, 100); 
            return;
          }
          ytPlayerRef.current.loadVideoById(currentSongRef.current.url as string, lastTimeSynced.last_time_video);
        }
        ytPlayer.loadVideoById(currentSongRef.current.url as string, lastTimeSynced.last_time_video);
      };

      loadVideo();
    }
  }, [currentSong]);

  return <div className={styles.player}>
    <div>
      {currentSong?.platform === 'yt' ? (
        <div style={{width: "100%", height: "auto", aspectRatio: "16 / 9"}}
          ref={youtubeIframe}
        />
      ) : <div style={{width: "100%", height: "auto", aspectRatio: "16 / 9", background: "black"}} />}
    </div>

    <div className={styles.playerButtons}>
      <div className={styles.leftSide}>
        <button onClick={() => syncCurrentTime()}>
          {/* re-sync */}
          <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
            {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
            <path d="M105.1 202.6c7.7-21.8 20.2-42.3 37.8-59.8c62.5-62.5 163.8-62.5 226.3 0L386.3 160H336c-17.7 0-32 14.3-32 32s14.3 32 32 32H463.5c0 0 0 0 0 0h.4c17.7 0 32-14.3 32-32V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v51.2L414.4 97.6c-87.5-87.5-229.3-87.5-316.8 0C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5zM39 289.3c-5 1.5-9.8 4.2-13.7 8.2c-4 4-6.7 8.8-8.1 14c-.3 1.2-.6 2.5-.8 3.8c-.3 1.7-.4 3.4-.4 5.1V448c0 17.7 14.3 32 32 32s32-14.3 32-32V396.9l17.6 17.5 0 0c87.5 87.4 229.3 87.4 316.7 0c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.5 62.5-163.8 62.5-226.3 0l-.1-.1L125.6 352H176c17.7 0 32-14.3 32-32s-14.3-32-32-32H48.4c-1.6 0-3.2 .1-4.8 .3s-3.1 .5-4.6 1z"/>
          </svg>
        </button>

        <button>
          {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
          <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 576 512">
            <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z"/>
          </svg>
        </button>
      </div>

      {currentSong && (
        <div className={styles.requestedBy}>
          <span>Requested By:</span>
          <span>{currentSong.requested_by}</span>
        </div>
      )}

      <div className={styles.rightSide}>
        <button>
          {/* report */}
          <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512">
            {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
            <path d="M64 32C64 14.3 49.7 0 32 0S0 14.3 0 32V64 368 480c0 17.7 14.3 32 32 32s32-14.3 32-32V352l64.3-16.1c41.1-10.3 84.6-5.5 122.5 13.4c44.2 22.1 95.5 24.8 141.7 7.4l34.7-13c12.5-4.7 20.8-16.6 20.8-30V66.1c0-23-24.2-38-44.8-27.7l-9.6 4.8c-46.3 23.2-100.8 23.2-147.1 0c-35.1-17.6-75.4-22-113.5-12.5L64 48V32z"/>
          </svg>
        </button>

        {/* votes */}
        <div className={styles.upvotes}>
          {/* upvote */}
          <button>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
              {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->*/}
              <path d="M318 177.5c3.8-8.8 2-19-4.6-26l-136-144C172.9 2.7 166.6 0 160 0s-12.9 2.7-17.4 7.5l-136 144c-6.6 7-8.4 17.2-4.6 26S14.4 192 24 192H96l0 288c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32l0-288h72c9.6 0 18.2-5.7 22-14.5z"/>
            </svg>
          </button>

        {/* downvote */}
          <button>
            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
              {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->*/}
              <path d="M2 334.5c-3.8 8.8-2 19 4.6 26l136 144c4.5 4.8 10.8 7.5 17.4 7.5s12.9-2.7 17.4-7.5l136-144c6.6-7 8.4-17.2 4.6-26s-12.5-14.5-22-14.5l-72 0 0-288c0-17.7-14.3-32-32-32L128 0C110.3 0 96 14.3 96 32l0 288-72 0c-9.6 0-18.2 5.7-22 14.5z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

  </div>
}

export default PlayerComponent;