import { CSSProperties } from 'react';
import styles from '../styles/ChatMessage.module.css';

interface MessageProps {
  user: string;
  children: string;
  style?: CSSProperties;
}

const ChatMessage = (props: MessageProps) => {
  return (
    <div className={styles.MessageWrapper} style={props.style}>
      <span className={styles.UsernameDisplay}>{props.user}: </span>
      <span className={styles.Message}>{props.children}</span>
    </div>
  );
}

export default ChatMessage;