import db from '../../config/db.js'; 
import fs from 'fs'; 

import { postAlumnoTesisController } from '../alumno_tesis/controllers.js'; 

import Tesseract from 'tesseract.js';
import { PDFDocument } from 'pdf-lib'; 

export const getTesis = async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, nombre, id_encargado, id_tutor, id_sede, fecha, estado FROM Tesis',
    });

    console.log("Resultado obtenido:", result);

    res.json(result.rows);
  } catch (err) {
    console.error('Error en getTesis:', err.message);
    res.status(500).json({ message: "Error en el servidor", error: err.message });
  }
};


export const getTesisById = async (req, res) => {

    const { id } = req.params;
    console.log("ID recibido:", id);
    const sql = "SELECT nombre, id_encargado, id_tutor, id_sede, fecha, estado FROM Tesis WHERE id = ?";
    console.log("Consulta SQL:", sql);

    try {
        const result = await db.execute(sql, [id]);
        console.log("Resultado obtenido:", result);

        
        res.json(result.rows);  
    } catch (err) {
        console.error('Error en getTesisById:', err.message);
        res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
};


export const getTesisByName = async (req, res) => {
    console.log(req.params);
    const { nombre } = req.params;
    const sql = "SELECT nombre, id_encargado, id_tutor, id_sede, fecha, estado FROM Tesis WHERE nombre LIKE ?";
    const searchTerm = `%${nombre}%`; 

    console.log(`Buscando término:`, searchTerm);

    try {
        const result = await db.execute(sql, [searchTerm]);  
        const rows = result.rows || result;

        if (rows.length === 0) {
            return res.status(404).json({ message: "Tesis no encontrada" });
        }

        res.json(rows); 
    } catch (err) {
        console.error('Error al obtener tesis por nombre:', err.message);
        return res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
};



export const uploadTesis = async (req, res) => {
    console.log("Archivo recibido:", req.file);
    console.log("Cuerpo recibido:", req.body);

    const { id_tesis, nombre, id_estudiante, id_tutor, id_encargado, fecha, id_sede, estado } = req.body;

    const idTesisInt = parseInt(id_tesis, 10);
    const idEstudianteInt = parseInt(id_estudiante, 10);

    
    if (isNaN(idTesisInt)) {
        return res.status(400).json({ message: "El ID de la tesis debe ser un número entero válido." });
    }
    if (isNaN(idEstudianteInt)) {
        return res.status(400).json({ message: "El ID del estudiante debe ser un número entero válido." });
    }
    if (!req.file) {
        return res.status(400).json({ message: "El archivo PDF es obligatorio" });
    }

    
    const archivo_pdf = fs.readFileSync(req.file.path);

    
    const checkSql = "SELECT id FROM Tesis WHERE id = ?";
    const checkResult = await db.execute(checkSql, [idTesisInt]);

    if (checkResult.rows.length > 0) {
        fs.unlinkSync(req.file.path); 
        return res.status(400).json({ message: "Ya existe una tesis con ese ID." });
    }

    
    const sqlTesis = `
        INSERT INTO Tesis (id, id_encargado, id_sede, id_tutor, nombre, fecha, estado, archivo_pdf)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.execute(sqlTesis, [idTesisInt, id_encargado, id_sede, id_tutor, nombre, fecha, estado, archivo_pdf]);

        console.log("Tesis añadida con ID:", idTesisInt);

        
        const fakeReq = {
            body: {
                id_estudiante: idEstudianteInt,
                id_tesis: idTesisInt,
            }
        };
        const fakeRes = {
            json: (response) => console.log("Respuesta de alumno_tesis:", response),
            status: (statusCode) => ({
                json: (response) => console.log(`Error ${statusCode}:`, response)
            })
        };

        await postAlumnoTesisController(fakeReq, fakeRes);

        
        fs.unlinkSync(req.file.path);

        
        return res.json({ message: "Tesis subida correctamente y autor asociado", id_tesis: idTesisInt });

    } catch (error) {
        console.error("Error al subir la tesis o asociar el autor:", error);

        
        if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({ message: "Error al subir la tesis o asociar el autor", error });
    }
};



export const downloadTesis = async (req, res) => {
    const { id } = req.params;
    console.log("ID recibido:", id);

    const sql = "SELECT archivo_pdf FROM Tesis WHERE id = ?";
    console.log("Consulta SQL:", sql);

    try {
        const result = await db.execute(sql, [id]);

        console.log("Resultado de la consulta:", result);

        if (!result || result.rows.length === 0 || !result.rows[0].archivo_pdf) {
            console.log("No se encontró el archivo PDF o no hay registros para este ID");
            return res.status(404).json({ message: "Tesis no encontrada o archivo PDF no disponible" });
        }

        
        const archivoPdfBuffer = Buffer.from(result.rows[0].archivo_pdf);
        console.log("Archivo PDF convertido a Buffer:", archivoPdfBuffer);

        if (archivoPdfBuffer.length === 0) {
            console.log("El archivo PDF está vacío");
            return res.status(404).json({ message: "Archivo PDF no encontrado" });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=tesis_${id}.pdf`);
        console.log("Cabeceras configuradas para la descarga");

        
        res.end(archivoPdfBuffer);
        console.log("Archivo PDF enviado correctamente");

    } catch (err) {
        console.error("Error al descargar el archivo PDF:", err.message);
        return res.status(500).json({ message: "Error en el servidor", error: err.message });
    }
};


export const deleteTesis = async (req, res) => {
  const { id } = req.params;

  try {
    
    await db.execute("PRAGMA foreign_keys = ON;");

    
    const deleteRelations = await db.execute("DELETE FROM Alumno_tesis WHERE id_tesis = ?", [id]);

    
    const deleteTesis = await db.execute("DELETE FROM Tesis WHERE id = ?", [id]);

   
    if (deleteTesis.changes === 0 || deleteTesis.affectedRows === 0) {
      return res.status(404).json({ message: "Tesis no encontrada" });
    }

    return res.json({ message: "Tesis eliminada correctamente" });
  } catch (err) {
    console.error("Error al eliminar la tesis:", err.message);
    return res.status(500).json({
      message: "Error al eliminar la tesis",
      error: err.message,
    });
  }
};



export const updateTesis = async (req, res) => {
    const { id } = req.params;
    const { nombre, fecha, estado } = req.body;

    
    const archivoPdf = req.file ? fs.readFileSync(req.file.path) : null;

    
    let query = `UPDATE Tesis SET nombre = ?, fecha = ?, estado = ?`;
    let params = [nombre, fecha, estado];

    if (archivoPdf) {
        query += `, archivo_pdf = ?`;
        params.push(archivoPdf);  
    }

    query += ` WHERE id = ?`;
    params.push(id);

    try {
        console.log("Consulta SQL:", query);  
        console.log("Parámetros:", params); 

        
        const result = await db.execute(query, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tesis no encontrada.' });
        }

        return res.status(200).json({ message: 'Tesis actualizada correctamente.' });

    } catch (err) {
        console.error("Error al actualizar la tesis:", err.message);
        return res.status(500).json({ message: 'Hubo un error al actualizar la tesis.', error: err.message });
    }
};


export const digitalizetesis = async (req, res) => {
  console.log("Archivo recibido:", req.file);
  console.log("Cuerpo recibido:", req.body);

  const {
    id_tesis,
    nombre,
    id_estudiante,
    id_tutor,
    id_encargado,
    fecha,
    id_sede,
    estado
  } = req.body;

  const idTesisInt = parseInt(id_tesis, 10);
  const idEstudianteInt = parseInt(id_estudiante, 10);

  if (isNaN(idTesisInt)) {
    return res.status(400).json({ message: "El ID de la tesis debe ser un número entero válido." });
  }
  if (isNaN(idEstudianteInt)) {
    return res.status(400).json({ message: "El ID del estudiante debe ser un número entero válido." });
  }
  if (!req.file || !req.file.path) {
    return res.status(400).json({ message: "La imagen es obligatoria para la digitalización." });
  }

  try {
    const checkSql = "SELECT id FROM Tesis WHERE id = ?";
    const checkResult = await db.execute(checkSql, [idTesisInt]);

    if (checkResult.rows.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Ya existe una tesis con ese ID." });
    }

    
    const { data: { text: textoOCR } } = await Tesseract.recognize(
      req.file.path,
      'spa',
      { logger: m => console.log(m) }
    );

    console.log("Texto extraído por OCR:", textoOCR);

    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    const fontSize = 12;
    const marginX = 50;
    const marginY = page.getHeight() - 50;
    const maxWidth = page.getWidth() - 2 * marginX;

    page.setFontSize(fontSize);
    page.drawText(textoOCR, {
      x: marginX,
      y: marginY,
      maxWidth: maxWidth,
      lineHeight: 14
    });

    const archivo_pdf = await pdfDoc.save();

    
    const sqlInsert = `
      INSERT INTO Tesis (
        id, id_encargado, id_sede, id_tutor, nombre,
        fecha, estado, archivo_pdf
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sqlInsert, [
      idTesisInt,
      id_encargado,
      id_sede,
      id_tutor,
      nombre,
      fecha,
      estado,
      archivo_pdf
    ]);

    console.log("Tesis digitalizada con ID:", idTesisInt);

    const fakeReq = {
      body: {
        id_estudiante: idEstudianteInt,
        id_tesis: idTesisInt
      }
    };
    const fakeRes = {
      json: (r) => console.log("Respuesta de alumno_tesis:", r),
      status: (code) => ({ json: (r) => console.log(`Error ${code}:`, r) })
    };
    await postAlumnoTesisController(fakeReq, fakeRes);

    fs.unlinkSync(req.file.path);

    res.json({
      message: "Tesis digitalizada correctamente y estudiante asociado",
      id_tesis: idTesisInt
    });

  } catch (error) {
    console.error("Error en digitalizetesis:", error.message);
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Error al digitalizar la tesis", error: error.message });
  }
};