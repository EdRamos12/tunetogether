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
  const token = req.cookies.__bruh;
  if (!token) return res.status(401).send({error: true, message: "Token não disponibilizado"});

  try {
    const decoded = verify(token, String(process.env.JWT_SECRET)) as decodedJWT;
    req.userId = decoded?.username || decoded?.userId;
  } catch (err) {
    return res.status(401).send({ error: true, message: 'Token has expired' }); 
  } finally {
    return next();
  }
}

export function authMiddlewareSocketIO (socket: ServerSocket, next: (err?: ExtendedError | undefined) => void) {
  const header = cookie.parse(socket.handshake.headers.cookie as string);
  const token = header.__bruh;
  if (!token) {
    const err = new Error("not authorized");
    err.message = "Please login before using sockets";
    console.error('authentication failed from: ' + socket.id);
    socket.disconnect();
    return next(err);
  }

  verify(token, String(process.env.JWT_SECRET), (error, decoded) => {
    if (error) {
      return next(error);
    }
    //console.log(decoded);
    const { userId, username } = decoded as decodedJWT;
    socket.userId = username || userId;
    
    return next();
  });
}