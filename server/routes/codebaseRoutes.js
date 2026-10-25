const express = require ("express")
const multer = require("multer")
const protect = require("../middleware/authMiddleware")

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024,
    },
    fileFilter: (req, file, callback) =>{
        if(!file.originalname.toLocaleLowerCase().endsWith(".zip")){
            return callback(new Error("Only ZIP files are allowed."))
        }
        callback(null, true)
    }
})

router.post("/upload", protect, (req,res)=>{
    upload.single("project")(req,res, (error)=>{
        if(error){
            return res.status(400).json({
                message: error.message || "File upload failed.",
            })
        }

        if(!req.file){
            return res.status(400).json({
                message: "Please upload ZIP file.",
            })
        }


        return res.status(200).json({
            message: "ZIP file reciever successfullly",
            fileName: req.file.originalname,
            fileSize: req.file.size,
        })
    })
})

module.exports = router;