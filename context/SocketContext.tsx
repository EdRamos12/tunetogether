import React, { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import SongDocument from '../utils/types/SongDocument';

// autoConnect set to false, otherwise multiple sockets will run per client (spoiler: which is not optimal)
let socket = io(':3000', {autoConnect: false});
const SocketContext = React.createContext({} as {
  socket: Socket<DefaultEventsMap, DefaultEventsMap>, 
  room: string, 
  changeRoom: (room: string) => void,
  setCurrentSongPlaylist: React.Dispatch<React.SetStateAction<SongDocument[]>>,
  currentSongPlaylist: Array<SongDocument>
});

const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [room, setRoom] = useState('');
  const [currentSongPlaylist, setCurrentSongPlaylist] = useState<Array<SongDocument>>([]);

  function changeRoom (room: string) {
    const correctedRoomCode = room.split(" ").join("").trim();
    //console.log(5, !/[^a-zA-Z]/.test(correctedRoomCode));
    if (correctedRoomCode.length >= 5 && !/[^a-zA-Z]/.test(correctedRoomCode)) {
      setRoom(correctedRoomCode)
    };
  }

  useEffect(() => {
    if (!socket.connected) socket.connect(); // connect to server once context is loaded
    return () => {
      socket.disconnect() // and on unload, it disconnects (on most cases)
    }
  }, []);

  return (
    <SocketContext.Provider value={{socket, room, changeRoom, setCurrentSongPlaylist, currentSongPlaylist}}>
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContext, SocketProvider }