import { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../context/SocketContext";
import SongDocument from "../utils/types/SongDocument";
import axiosInstance from "../utils/axiosInstance";

interface WindowWithYTApi extends Window {
  YT: any
}

const PlayerComponent = () => {
  const socket = useContext(SocketContext);
  const [songList, setSongList] = useState<Array<SongDocument>>([]);
  const [currentSong, setCurrentSong] = useState<{ url?: string, platform?: string, time_to_play?: number, id?: string }>({});
  let lastTimeSynced = Date.now();

  const youtubeIframe = useRef<HTMLIFrameElement>(null);
  let ytPlayer: YT.Player | undefined;

  const getCurrentSongList = async () => {
    const response = await axiosInstance.get('/get-songs');
    setSongList(response.data.song_list);
  }

  async function syncCurrentTime() {
    const start_time = Date.now();
    const current_time = await axiosInstance.get('/sync');
    const latency = Date.now() - start_time;

    lastTimeSynced = Date.now();

    const current_song = current_time.data.current_song.song_url as string;
    if (current_song.includes('youtube')) {
      const url = new URL(current_song);
      const params = new URLSearchParams(url.searchParams);
      setCurrentSong({ 
        id: current_time.data.current_song.id,
        url: params.get('v') as string, 
        platform: 'yt', 
        time_to_play: (current_time.data.current_server_time + latency - current_time.data.current_song.time_to_play) / 1000 
      });
    } else {
      const url = new URL(current_song);
      setCurrentSong({ 
        id: current_time.data.current_song.id,
        url: url.pathname.replace('/', ''), 
        platform: 'yt', 
        time_to_play: (current_time.data.current_server_time + latency - current_time.data.current_song.time_to_play) / 1000 
      });
    }
    return current_time;
  }

  useEffect(() => {
    if (!socket?.connected) return;

    getCurrentSongList();

    socket.on('song-queue', (data: Array<SongDocument>) => {
      console.log('list updated: ', data);
      setSongList(data);
    });
  }, [socket?.connected]);

  useEffect(() => {
    if (songList.length === 0) return;

    syncCurrentTime();
  }, [songList]);

  useEffect(() => {
    if (Object.keys(currentSong).length === 0) return;

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    const onYTPlayerPause = (event: YT.OnStateChangeEvent) => {
      console.log(event.data === (window as unknown as WindowWithYTApi).YT.PlayerState.ENDED);

      switch (event.data) {
        case (window as unknown as WindowWithYTApi).YT.PlayerState.UNSTARTED:
          ytPlayer?.playVideo();
          break;
        case (window as unknown as WindowWithYTApi).YT.PlayerState.PAUSED:
          lastTimeSynced = Date.now();
          ytPlayer?.playVideo();
          break;
        case (window as unknown as WindowWithYTApi).YT.PlayerState.PLAYING:
          if ((Date.now() - lastTimeSynced) / 1000 < 2.5) break; 

          lastTimeSynced = Date.now();
          ytPlayer?.seekTo(parseInt((currentSong.time_to_play as any + ((Date.now() - lastTimeSynced) / 1000))), true);
          break;
        case (window as unknown as WindowWithYTApi).YT.PlayerState.ENDED:
          const index_from_current_song = songList.findIndex(item => item.id === currentSong.id);

          if (index_from_current_song === -1 && songList.length > 0) {
            syncCurrentTime();
            console.log('hello how are you')
            break;
          } 
          
          if (index_from_current_song === songList.length - 1) break;

          ytPlayer?.loadVideoById(songList[index_from_current_song + 1].song_url);
          console.log('ALOOO? ', songList);
          break;
      }
    }

    const onPlayerReady = (event: YT.PlayerEvent) => {
      //console.log(currentSong.time_to_play as number)
      //console.log(currentSong?.time_to_play as number / 60)
      ytPlayer?.seekTo(parseInt(currentSong.time_to_play as any), true);
      event.target.playVideo();
    };

    const youtubeIframeSetup = () => {
      //                          \/\/\/ ------ i hate typescript sometimes (only sometimes)
      ytPlayer = new (window as unknown as WindowWithYTApi).YT.Player(youtubeIframe.current, { 
        videoId: currentSong.url,
        playerVars: {
          autoplay: 1,
        },
        events: {
          onStateChange: onYTPlayerPause,
          onReady: onPlayerReady,
          onError: (err: any) => console.log(err)
        },
      });
    };

    // cria o player de vídeo quando a API do YouTube estiver pronta
    (window as any).onYouTubeIframeAPIReady = youtubeIframeSetup;

    // remove o event listener quando o componente for desmontado
    return () => {
      delete (window as any).onYouTubeIframeAPIReady;
    };
  }, [currentSong])

  return <div>
    {currentSong?.platform === 'yt' && (
      <div 
        ref={youtubeIframe}
      />
    )}
  </div>
}

export default PlayerComponent;