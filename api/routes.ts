import express from 'express';
import MusicQueueController from './controllers/MusicQueueController';
import UserController from './controllers/UserController';

const routes = express.Router();
const musicQueueController = new MusicQueueController();
const userController = new UserController();

routes.get('/get-songs', musicQueueController.get as any);
routes.get('/sync', musicQueueController.sync as any);

routes.post('/sign-up', userController.register as any);
routes.get('/login', userController.login as any);

export default routes;