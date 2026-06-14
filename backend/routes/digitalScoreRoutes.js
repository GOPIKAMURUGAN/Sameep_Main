const express = require("express");
const {
  getPublicDigitalScoreConfig,
  getDigitalScoreQuestions,
  submitDigitalScore,
} = require("../controllers/digitalScorePublicController");

const router = express.Router();

router.get("/public-config", getPublicDigitalScoreConfig);
router.get("/questions", getDigitalScoreQuestions);
router.post("/submit", submitDigitalScore);

module.exports = router;
