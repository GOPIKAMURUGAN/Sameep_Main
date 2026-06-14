const express = require("express");
const {
  getDigitalScoreAdminConfig,
  updateDigitalScoreAdminConfig,
  listDigitalScoreQuestions,
  createDigitalScoreQuestion,
  updateDigitalScoreQuestion,
  deleteDigitalScoreQuestion,
  listDigitalScoreSubmissions,
} = require("../controllers/digitalScoreAdminController");
const { requireAdminAuth } = require("../utils/adminAuthMiddleware");

const router = express.Router();

router.use(requireAdminAuth);

router.get("/config", getDigitalScoreAdminConfig);
router.put("/config", updateDigitalScoreAdminConfig);

router.get("/questions", listDigitalScoreQuestions);
router.post("/questions", createDigitalScoreQuestion);
router.put("/questions/:id", updateDigitalScoreQuestion);
router.delete("/questions/:id", deleteDigitalScoreQuestion);

router.get("/submissions", listDigitalScoreSubmissions);

module.exports = router;
