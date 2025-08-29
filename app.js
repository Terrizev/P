const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const jsConfuser = require('js-confuser');

const app = express();
const PORT = process.env.PORT || 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Only allow .js and .cjs files
    if (path.extname(file.originalname).toLowerCase() === '.js' || 
        path.extname(file.originalname).toLowerCase() === '.cjs') {
      cb(null, true);
    } else {
      cb(new Error('Only JavaScript files are allowed'));
    }
  }
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Serve the main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle file upload and obfuscation
app.post('/obfuscate', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read the uploaded file
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    
    // Obfuscation settings
    const obfuscationSettings = {
      target: "node",
      preset: "high",
      compact: true,
      minify: true,
      flatten: true,
      identifierGenerator: function () {
        const originalString = "素TERRI晴DEV晴" + "素TERRI晴DEV晴";
        const removeUnwantedChars = (input) => input.replace(/[^a-zA-Z素TERRI晴DEV晴]/g, "");
        const randomString = (length) => {
          let result = "";
          const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
          for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
          }
          return result;
        };
        return removeUnwantedChars(originalString) + randomString(2);
      },
      renameVariables: true,
      renameGlobals: true,
      stringEncoding: true,
      stringSplitting: 0.0,
      stringConcealing: true,
      stringCompression: true,
      duplicateLiteralsRemoval: 1.0,
      shuffle: { hash: 0.0, true: 0.0 },
      stack: true,
      controlFlowFlattening: 1.0,
      opaquePredicates: 0.9,
      deadCode: 0.0,
      dispatcher: true,
      rgf: false,
      calculator: true,
      hexadecimalNumbers: true,
      movedDeclarations: true,
      objectExtraction: true,
      globalConcealing: true
    };

    // Obfuscate the code
    const obfuscatedCode = await jsConfuser.obfuscate(fileContent, obfuscationSettings);

    // Generate output filename
    const originalName = req.file.originalname;
    const ext = path.extname(originalName);
    const baseName = path.basename(originalName, ext);
    const outputFilename = `${baseName}.obfuscated${ext}`;
    const outputPath = path.join('uploads', outputFilename);

    // Save the obfuscated code
    fs.writeFileSync(outputPath, obfuscatedCode);

    // Send the obfuscated code back to the client
    res.json({
      success: true,
      filename: outputFilename,
      code: obfuscatedCode,
      downloadUrl: `/download/${outputFilename}`
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

  } catch (error) {
    console.error('Obfuscation error:', error);
    res.status(500).json({ error: 'Obfuscation failed: ' + error.message });
  }
});

// Download endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).send('Error downloading file');
      }
      
      // Clean up the file after download
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 5000);
    });
  } else {
    res.status(404).send('File not found');
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`ORMAN OBFUSCATOR server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to use the obfuscator`);
});
