import express from 'express';
import {
  getAlumnoCarreraController,
  getAlumnoCarreraByCodigoController,
  postAlumnoCarreraController,
  deleteAlumnoCarreraController,
} from './controllers.js';

const router = express.Router();


router.get('/', getAlumnoCarreraController);


router.get('/:codigo', getAlumnoCarreraByCodigoController);


router.post('/', postAlumnoCarreraController);


router.delete('/:codigo', deleteAlumnoCarreraController);

export default router;
