import { parse } from 'url'
import next from 'next'
import express from 'express';

const port = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  server.get('/io/test', (req: any, res: any) => {
    return res.json({ message: 'WOOOOOOO YEAAAAH BABY' });
  })
  
  server.all('*', (req: any, res: any) => {
    const parsedUrl = parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  server.listen(port, () => {
    console.log(`> Server listening at http://localhost:${port} as ${dev ? 'development' : process.env.NODE_ENV}`);
  })
});