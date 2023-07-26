import { useRouter } from "next/router";
import type { NextPage } from 'next';
import Head from 'next/head';
//import Image from 'next/image';
import { useContext, useEffect, useState } from 'react';
import styles from '../../styles/Room.module.css';
import { SocketContext } from '../../context/SocketContext';
import PlayerComponent from '../../components/PlayerComponent';
import getYoutubeVideoId from "../../utils/getYoutubeVideoId";
import ChatMessage from "../../components/ChatMessage";

const formatMessage = (str: string) => {
  const formattedString = str.replace(/\s{2,}/g, ' ').trim();
  if (formattedString === null || formattedString.match(/^ *$/) !== null) return false;
  return formattedString;
}

const Room: NextPage = () => {
  const router = useRouter();
  const {code} = router.query;
  const {socket, changeRoom, currentSongPlaylist} = useContext(SocketContext);
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState([] as any);
  const [message, setMessage] = useState('');
  const [url, setUrl] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [connectedToRoom, setConnectedToRoom] = useState(false);
  const [codeAvailable, setCodeAvailable] = useState(false);

  // checks to see if socket successfully connected to server
  useEffect(() => {
    setSocketConnected(socket.connected);
    
    socket.on('connect', () => {
      setSocketConnected(socket.connected);
    });

    socket.on('join-status', (data: boolean) => {
      setConnectedToRoom(data);
    });

    socket.on('disconnect', () => {
      setSocketConnected(() => (socket.connected));
    });
  }, [socket?.connected]);

  useEffect(() => {
    if (!code) return;

    setCodeAvailable(true);
    //handleRoomConnection();
  }, [code]);

  useEffect(() => {
    if (!socketConnected || !codeAvailable) return;

    handleRoomConnection();
  }, [socketConnected, codeAvailable]);

  // now this is fun
  // checks if room code is the correct length, then just emits join to the back-end to that room
  const handleRoomConnection = () => {
    const correctedRoomCode = `${code}`.split(" ").join("").trim();
    //console.log(correctedRoomCode.length >= 5, room.length);
    if (correctedRoomCode.length >= 5 && !/[^a-zA-Z]/.test(correctedRoomCode)) {
      if (!code) return;

      socket.emit('join', {room: correctedRoomCode, password: roomPassword});
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
    socket.emit('send-message', {message: formattedMessage, room: code});
    setMessage('');
  }

  useEffect(() => {
    if (!connectedToRoom) return;

    socket.on('message', (data: any) => {
      setMessages((messages: any) => [...messages, data]);
    });
    
    changeRoom(code as string);
  }, [connectedToRoom])

  return (
    <div className={styles.container}>
      <Head>
        <title>{!code ? 'TuneTogether' : `TuneTogether - Room - ${code}`}</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* <div className={styles.sidebar}>
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
      </div> */}

      {/* <div className={styles.main}>
        hi
      </div> */}

      {/* <div className={styles.chatRoom}>
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
      </div> */}

      {/* <nav className={styles.topBar}>
        <ul>
          <li className={styles.logo}>
            TuneTogether  
          </li>  

          <li>
            Rooms
          </li>
          
          <li>
            Playlists
          </li>
        </ul>
      </nav> */}

      <div className={styles.main}>
        <div className={styles.mainSidebar}>
          <h1>TuneTogether</h1>

          <nav className={styles.topBar}>
            <ul>
              <li className={styles.logo}>
                TuneTogether  
              </li>  

              <li>
                Rooms
              </li>
              
              <li>
                Playlists
              </li>
            </ul>
          </nav>
        </div>
        <div className={styles.playerContainer}>

          <div className={styles.centralizePlayerVertically}>
            <div className={styles.player}>

            <PlayerComponent />

            <div className={styles.progress}>
              <div />
            </div>

            <div className={styles.playerButtons}>
              <div className={styles.leftSide}>
                <button>
                  {/* pause */}
                  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
                    {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
                    <path d="M48 64C21.5 64 0 85.5 0 112V400c0 26.5 21.5 48 48 48H80c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H48zm192 0c-26.5 0-48 21.5-48 48V400c0 26.5 21.5 48 48 48h32c26.5 0 48-21.5 48-48V112c0-26.5-21.5-48-48-48H240z"/>
                  </svg>
                </button>

                <button>
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

              <div className={styles.requestedBy}>
                <span>Requested By:</span>
                <span>John Doe</span>
              </div>

              <div className={styles.rightSide}>
                <button>
                  {/* volume */}
                  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512">
                    {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
                    <path d="M301.1 34.8C312.6 40 320 51.4 320 64V448c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352H64c-35.3 0-64-28.7-64-64V224c0-35.3 28.7-64 64-64h67.8L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM412.6 181.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5z"/>
                  </svg>
                </button>

                <button>
                  {/* report */}
                  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 448 512">
                    {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
                    <path d="M64 32C64 14.3 49.7 0 32 0S0 14.3 0 32V64 368 480c0 17.7 14.3 32 32 32s32-14.3 32-32V352l64.3-16.1c41.1-10.3 84.6-5.5 122.5 13.4c44.2 22.1 95.5 24.8 141.7 7.4l34.7-13c12.5-4.7 20.8-16.6 20.8-30V66.1c0-23-24.2-38-44.8-27.7l-9.6 4.8c-46.3 23.2-100.8 23.2-147.1 0c-35.1-17.6-75.4-22-113.5-12.5L64 48V32z"/>
                  </svg>
                </button>

                <div className={styles.upvotes}>
                  <button>
                    <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512">
                      {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. -->*/}
                      <path d="M318 177.5c3.8-8.8 2-19-4.6-26l-136-144C172.9 2.7 166.6 0 160 0s-12.9 2.7-17.4 7.5l-136 144c-6.6 7-8.4 17.2-4.6 26S14.4 192 24 192H96l0 288c0 17.7 14.3 32 32 32h64c17.7 0 32-14.3 32-32l0-288h72c9.6 0 18.2-5.7 22-14.5z"/>
                    </svg>
                  </button>

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
          </div>
          
          
          <h1>Next to play</h1>

          <div className={styles.roomPlaylist}>
            {currentSongPlaylist.map((item) => (
              <div className={styles.playlistItem}>
                <div className={styles.cover} style={{
                  background: `url(https://img.youtube.com/vi/${getYoutubeVideoId(item.song_url) || item.song_url}/maxresdefault.jpg)`
                }}>
                </div>
                <div className={styles.songName}>
                  <h1>{item.title}</h1>
                  <span>From {item.channelTitle}</span>
                </div>
                <div className={styles.requestedByInPlaylist}>
                  <h1>Requested by:</h1>
                  <span>{item.requested_by}</span>
                </div>
              </div>
            ))}
          </div>

          {currentSongPlaylist.length === 0 && <h1>¯\_(ツ)_/¯ nothing here... yet</h1>}
        </div>
        <div className={styles.chat}>
          <div className={styles.chatContainer}>
            <h1>Chat</h1>

            <div className={styles.messagesContainer}>
              {messages.length > 0 ? messages.map((msg: any, i: number) => (
                <ChatMessage key={i} user={msg.user as string} style={{
                  background: (i+1)%2 === 0 ? 'rgba(0,0,0,.2)' : 'none'
                }}>
                  {msg.text}
                </ChatMessage>
              )).reverse() : ('Nada Além de Galinhas!')} 
              {/* temporary */}
            </div>

            <div className={styles.chatMessengerHandler}>
              <textarea placeholder="Write your message here!" className={styles.messageInput} onChange={(e) => setMessage(e.target.value)} value={message} onKeyDown={(event) => {if (event.key === 'Enter') {handleSendMessage(); event.preventDefault()}}} rows={2} name="" id="" />
              <div className={styles.chatButtons}>
                <button className={styles.chatSettingsButton}>
                  <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512">
                    {/* <!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --> */}
                    <path d="M495.9 166.6c3.2 8.7 .5 18.4-6.4 24.6l-43.3 39.4c1.1 8.3 1.7 16.8 1.7 25.4s-.6 17.1-1.7 25.4l43.3 39.4c6.9 6.2 9.6 15.9 6.4 24.6c-4.4 11.9-9.7 23.3-15.8 34.3l-4.7 8.1c-6.6 11-14 21.4-22.1 31.2c-5.9 7.2-15.7 9.6-24.5 6.8l-55.7-17.7c-13.4 10.3-28.2 18.9-44 25.4l-12.5 57.1c-2 9.1-9 16.3-18.2 17.8c-13.8 2.3-28 3.5-42.5 3.5s-28.7-1.2-42.5-3.5c-9.2-1.5-16.2-8.7-18.2-17.8l-12.5-57.1c-15.8-6.5-30.6-15.1-44-25.4L83.1 425.9c-8.8 2.8-18.6 .3-24.5-6.8c-8.1-9.8-15.5-20.2-22.1-31.2l-4.7-8.1c-6.1-11-11.4-22.4-15.8-34.3c-3.2-8.7-.5-18.4 6.4-24.6l43.3-39.4C64.6 273.1 64 264.6 64 256s.6-17.1 1.7-25.4L22.4 191.2c-6.9-6.2-9.6-15.9-6.4-24.6c4.4-11.9 9.7-23.3 15.8-34.3l4.7-8.1c6.6-11 14-21.4 22.1-31.2c5.9-7.2 15.7-9.6 24.5-6.8l55.7 17.7c13.4-10.3 28.2-18.9 44-25.4l12.5-57.1c2-9.1 9-16.3 18.2-17.8C227.3 1.2 241.5 0 256 0s28.7 1.2 42.5 3.5c9.2 1.5 16.2 8.7 18.2 17.8l12.5 57.1c15.8 6.5 30.6 15.1 44 25.4l55.7-17.7c8.8-2.8 18.6-.3 24.5 6.8c8.1 9.8 15.5 20.2 22.1 31.2l4.7 8.1c6.1 11 11.4 22.4 15.8 34.3zM256 336a80 80 0 1 0 0-160 80 80 0 1 0 0 160z"/>
                  </svg>
                </button>
                <button className={styles.submitMessageButton} disabled={formatMessage(message) == false ? true : false} onClick={handleSendMessage}>Send</button>
              </div>
            </div>
            
          </div>

          {/* <div className={styles.userList}>
            <h1>Online Users</h1>

            <div className={styles.usersContainer}>
              <div>
                <img src="https://media.discordapp.net/attachments/1124003308248510535/1124491830361325619/Turtle.jpg?width=247&height=247" alt="" />

                <span>Teste</span>
              </div>
            </div>
          </div> */}

          {/* <div className={styles.options}>
            <button>dps mudar</button>
          </div> */}
        </div>
      </div>

      <div className={styles.socketIODebugMenu}>
          {socket.connected && 'connected'}
          {socket.disconnected && 'disconnected'}

        <input type="text" onChange={ (e) => setUrl(e.target.value) } />
        <input type="button" value={`request song`} onClick={handleSongRequest} />
      </div>
    </div>
  )
}

export default Room;