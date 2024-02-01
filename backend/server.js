const express = require('express');
const multer = require('multer');
const fs = require('fs');
const edfdecoder = require('edfdecoder');
const cors = require('cors'); // Import cors module

const app = express();
app.use(cors()); // Use cors middleware
const upload = multer({ dest: 'uploads/' }); // 'uploads/' is the temporary directory
const port = 3000;

// Endpoint for uploading EDF file
app.post('/api/upload-edf', upload.single('edfFile'), (req, res) => {
    // Read file from disk
    fs.readFile(req.file.path, (err, data) => {
        if (err) {
            return res.status(500).send(err);
        } else {
            // Convert Node.js Buffer to ArrayBuffer
            const arrayBuffer = Uint8Array.from(data).buffer;

            // Decode EDF file
            const decoder = new edfdecoder.EdfDecoder();
            decoder.setInput(arrayBuffer);
            console.log("Decoding...");
            decoder.decode();

            // Get decoded EDF object
            const edf = decoder.getOutput();
            console.log("Decoding finished. returning EDF object...");

            // Delete the file from the 'uploads/' directory
            fs.unlink(req.file.path, err => {
                if (err) {
                    console.error(`Failed to delete file: ${err}`);
                } else {
                    console.log(`File deleted: ${req.file.path}`);
                }
            });

            // Send EDF object as response
            return res.status(200).json(edf);

        }
    });
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});