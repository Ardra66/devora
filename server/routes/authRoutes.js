const express = require("express")

const { resgisterUser, registerUser }= require("../controllers/authController")


const router = express.Router();

router.post("/register", registerUser);

module.exports = router;