import { celebrate, Joi, Segments } from 'celebrate';
import express from 'express';
import { authMiddlewareExpress } from '../utils/authMiddleware';
import MusicQueueController from './controllers/MusicQueueController';
import UserController from './controllers/UserController';

const routes = express.Router();
const musicQueueController = new MusicQueueController();
const userController = new UserController();

routes.get('/get-songs', authMiddlewareExpress as any, musicQueueController.get as any);
routes.get('/sync', authMiddlewareExpress as any, musicQueueController.sync as any);

routes.get('/verify-auth', authMiddlewareExpress as any, userController.auth as any);

routes.post('/sign-up', celebrate({
  [Segments.BODY]: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    username: Joi.string().min(3).required(),
  }),
}), userController.register as any);


routes.post('/login', celebrate({
  [Segments.BODY]: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required().error(new Error('Please provide a password!')),
  }),
}), userController.login as any);

routes.get('/username', userController.check_username_availability as any);

export default routes;