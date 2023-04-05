import type { NextPage } from 'next';
import Head from 'next/head';
//import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import styles from '../styles/Home.module.css';
import { HomeIcon, PersonIcon, PlusCircleIcon, PlusIcon, SearchIcon, SignInIcon } from '@primer/octicons-react';
import NavbarButton from '../components/NavbarButton';
import ChatMessage from '../components/ChatMessage';
import { SocketContext } from '../context/SocketContext';
import PlayerComponent from '../components/PlayerComponent';

const formatMessage = (str: string) => {
  const formattedString = str.replace(/\s{2,}/g, ' ').trim();
  if (formattedString === null || formattedString.match(/^ *$/) !== null) return false;
  return formattedString;
}

const Home: NextPage = () => {
  const socket = useContext(SocketContext);
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([] as any);
  const [message, setMessage] = useState('');
  const [room, setRoom] = useState('');
  const [url, setUrl] = useState('');
  const [roomPassword, setRoomPassword] = useState('');

  // checks to see if socket successfully connected to server
  useEffect(() => {
    setSocketConnected(socket.connected);
    
    socket.on('connect', () => {
      setSocketConnected(socket.connected);
    });

    socket.on('disconnect', () => {
      setSocketConnected(() => (socket.connected));
    });

    socket.on('disconnected', (status: string) => {
      // just to make sure to document everything
      console.log(status);
    });
  }, []);

  // simple socket connection handler
  const handleSocketConnection = () => {
    if (socketConnected)
      socket.disconnect();
    else {
      socket.connect();
    }
  }

  // now this is fun
  // checks if room code is the correct length, then just emits join to the back-end to that room
  const handleRoomConnection = () => {
    const correctedRoomCode = room.split(" ").join("").trim();
    //console.log(correctedRoomCode.length >= 5, room.length);
    if (correctedRoomCode.length >= 5 && !/[^a-zA-Z]/.test(correctedRoomCode)) {
      socket.emit('join', {room: correctedRoomCode, password: roomPassword}, (err: any) => {
        if (err) console.log('oh no! anyway...');

        socket.on('message', (data: any) => {
          setMessages((messages: any) => [...messages, data]);
        });
        return;
      });
      
    } else {
      alert('Room code is less than the accepted!');
    }
  }

  const handleSongRequest = () => {
    if (socketConnected) {
      socket.emit('request-song', url);
    }
  }

  const handleSendMessage = () => {
    const formattedMessage = formatMessage(message);
    if (formattedMessage == false) return;
    socket.emit('send-message', {message: formattedMessage, room});
    setMessage('');
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Main - sockets tests</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className={styles.sidebar}>
        <button className={styles.sidebarButtonTop}>
          <HomeIcon />
        </button>

        <div className={styles.buttonsHandler}>
          <NavbarButton buttonName={"Add Music"}>
            <PlusIcon />
          </NavbarButton>
          <NavbarButton buttonName={"Search Rooms"}>
            <SearchIcon />
          </NavbarButton>
          <NavbarButton buttonName={"Enter room code"}>
            <SignInIcon />
          </NavbarButton>
          <NavbarButton buttonName={"Create new room"}>
            <PlusCircleIcon />
          </NavbarButton>
        </div>

        <button className={styles.sidebarButtonBottom}>
          <PersonIcon />
        </button>
      </div>

      <div className={styles.main}>
        hi
      </div>

      <div className={styles.chatRoom}>
        <div className={styles.MessagesHandler}>
          {messages.length > 0 ? messages.map((msg: any, i: number) => (
            <ChatMessage key={i} user={msg.user as string}>
              {msg.text}
            </ChatMessage>
          )).reverse() : ('Nada Além de Galinhas!')}
        </div>
        <div className={styles.chatMessengerHandler}>
          <textarea onChange={(e) => setMessage(e.target.value)} value={message} onKeyDown={(event) => {if (event.key === 'Enter') {handleSendMessage(); event.preventDefault()}}} rows={3} name="" id="" />
          <button disabled={formatMessage(message) == false ? true : false} onClick={handleSendMessage}>Send</button>
        </div>
      </div>

      <div className='socketIODebugMenu'>
        <input
          type="button"
          style={{ marginTop: 10 }}
          value={socketConnected ? 'Disconnect' : 'Connect'}
          disabled={!socket}
          onClick={handleSocketConnection} />

        room code: <input type="text" onChange={ (e) => setRoom(e.target.value) } />
        password: <input type="text" onChange={ (e) => setRoomPassword(e.target.value) } />

        <input type="button" value={`join '${room}' room`} onClick={handleRoomConnection} />

        <input type="text" onChange={ (e) => setUrl(e.target.value) } />

        <input type="button" value={`request song`} onClick={handleSongRequest} />
      </div>

      <PlayerComponent />
      
    </div>
  )
}

export default Home;
