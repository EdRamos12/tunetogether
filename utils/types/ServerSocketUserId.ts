import { Socket } from "socket.io";

export default interface ServerSocket extends Socket {
  userId?: string
}