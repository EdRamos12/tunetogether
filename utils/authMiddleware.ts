import { NextFunction } from "express";
import { verify } from "jsonwebtoken";
import { NextApiRequest, NextApiResponse } from "next/types";
import { ExtendedError } from "socket.io/dist/namespace";
import cookie from "cookie";
import ServerSocket from "./types/ServerSocketUserId";

interface decodedJWT {
  userId: string
  email: string
  username: string
  iat: number
  exp: number
}

export interface NextApiRequestLoggedIn extends NextApiRequest {
  userId: string
}

export function authMiddlewareExpress (req: NextApiRequestLoggedIn, res: NextApiResponse, next: NextFunction) {
  const token = req.cookies.__secret_token;
  if (!token) return res.status(401).send({error: true, message: "Token not available"});

  try {
    const decoded = verify(token, String(process.env.JWT_SECRET)) as decodedJWT;
    req.userId = decoded?.username || decoded?.userId;
    next();
  } catch (err) {
    return res.status(401).send({ error: true, message: 'Token has expired' }); 
  }
}

export function authMiddlewareSocketIO (socket: ServerSocket, next: (err?: ExtendedError | undefined) => void) {
  try {
    const header = cookie.parse(socket.handshake.headers.cookie as string);
    const token = header.__secret_token;
    if (!token) {
      const err = new Error("not authorized");
      err.message = "Please login before using sockets";
      console.error('authentication failed from: ' + socket.id);
      throw err;
    }

    try {
      verify(token, String(process.env.JWT_SECRET), (error, decoded) => {
        if (error) {
          throw error;
        }
        //console.log(decoded);
        const { userId, username } = decoded as decodedJWT;
        socket.userId = username || userId;
        
        next();
      });
    } catch (error) {
      socket.disconnect();
    }
  } catch (err) {
    socket.disconnect();
  } 
}