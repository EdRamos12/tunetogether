import express from 'express';
import MusicQueueController from './controllers/MusicQueueController';

const routes = express.Router();
const musicQueueController = new MusicQueueController();

routes.get('/get-songs', musicQueueController.get as any);
routes.get('/sync', musicQueueController.sync as any);

export default routes;