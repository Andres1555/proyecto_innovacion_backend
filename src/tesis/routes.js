import express from "express";
import multer from "multer";
import {
    getTesis,
    getTesisById,
    uploadTesis,
    downloadTesis,
    deleteTesis,
    updateTesis,
    getTesisByName,
    digitalizetesis
} from "./controllers.js"; // Asegúrate de que la ruta es correcta

const router = express.Router();

// Configuración de `multer` para la subida de archivos
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 64 * 1024 * 1024 },
});

router.get("/tesis", getTesis); 
router.get("/tesis/cadena/:nombre", getTesisByName); 
router.get("/tesis/:id", getTesisById); 
router.post("/tesis", upload.single("archivo_pdf"), uploadTesis); 
router.get("/tesis/:id/download", downloadTesis); 
router.delete("/tesis/:id", deleteTesis); 
router.post("/tesis/digital", upload.single("archivo"), digitalizetesis);
router.put('/tesis/:id', upload.single('archivo_pdf'), updateTesis);

export default router;
