const express = require("express");
const router = express.Router();
const { getCategoryTree } = require("../controllers/categoryTreeController");

router.get("/categories/tree", getCategoryTree);

module.exports = router;
