const express = require("express");
const router = express.Router();
const { suggestAreas } = require("../controllers/locationIntelligenceController");

router.get("/suggest-areas", suggestAreas);

module.exports = router;
