// routes.js

import express from 'express';
import {
  getAlumnoTesisController,
  getAlumnoTesisByIdController,
  postAlumnoTesisController,
  deleteAlumnoTesisController
} from './controllers.js';

const router = express.Router();

router.get('/', getAlumnoTesisController);
router.get('/:id', getAlumnoTesisByIdController);
router.post('/', postAlumnoTesisController);
router.delete('/:id', deleteAlumnoTesisController);

export default router;
