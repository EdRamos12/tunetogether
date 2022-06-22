import React, { useEffect } from 'react';
import io from 'socket.io-client';

let socket = io('http://localhost:3000', {autoConnect: false});
const SocketContext = React.createContext('' as any);

const SocketProvider = ({ children }: any) => {
  useEffect(() => {
    socket.connect();
    return () => {
      socket.disconnect()
    }
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContext, SocketProvider }