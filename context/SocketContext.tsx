import React, { useEffect } from 'react';
import io from 'socket.io-client';

// autoConnect set to false, otherwise multiple sockets will run per client (spoiler: which is not optimal)
let socket = io('http://localhost:3000', {autoConnect: false});
const SocketContext = React.createContext('' as any);

const SocketProvider = ({ children }: any) => {
  useEffect(() => {
    socket.connect(); // connect to server once context is loaded
    return () => {
      socket.disconnect() // and on unload, it disconnects (on most cases)
    }
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContext, SocketProvider }