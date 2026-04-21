const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const { PDFParse } = require("pdf-parse");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 40 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = new Set([
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]);
    const allowedExtensions = /\.(pdf|xls|xlsx)$/i;

    if (
      allowedMimeTypes.has(file.mimetype) ||
      allowedExtensions.test(String(file.originalname || ""))
    ) {
      return cb(null, true);
    }

    return cb(
      new Error("Unsupported file type. Please upload a PDF, XLS, or XLSX file.")
    );
  },
});

function handleMenuUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    console.error("Menu upload middleware failed", error);

    const statusCode =
      error instanceof multer.MulterError ? 400 : error.message ? 400 : 500;

    res.status(statusCode).json({
      message: error.message || "Failed to upload menu file.",
    });
  });
}

function normalizeText(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[•·▪●◦]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFileBaseName(fileName = "") {
  const normalized = normalizeText(fileName);
  if (!normalized) return "Uploaded Menu";
  return normalized.replace(/\.[^.]+$/, "") || "Uploaded Menu";
}

function sanitizePrice(price = "") {
  return String(price || "")
    .replace(/rs\.?/gi, "")
    .replace(/[^\d.\-]/g, "")
    .trim();
}

function extractPrice(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return "";

  const rangeMatch = normalized.match(
    /(?:rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?\s*-\s*\d[\d,]*(?:\.\d{1,2})?)(?!.*\d)/i
  );
  if (rangeMatch?.[1]) {
    return sanitizePrice(rangeMatch[1]);
  }

  const singleMatch = normalized.match(
    /(?:rs\.?\s*)?(\d[\d,]*(?:\.\d{1,2})?)(?!.*\d)/i
  );
  return sanitizePrice(singleMatch?.[1] || "");
}

function removeTrailingPrice(text = "") {
  return normalizeText(
    String(text || "").replace(
      /(?:rs\.?\s*)?\d[\d,]*(?:\.\d{1,2})?(?:\s*-\s*\d[\d,]*(?:\.\d{1,2})?)?\s*$/i,
      ""
    )
  );
}

function isMostlyNumeric(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  return /^[\d\s,.\-]+$/.test(normalized);
}

function looksLikeSectionHeading(text = "") {
  const normalized = normalizeText(text);
  if (!normalized) return false;
  if (normalized.length > 48) return false;
  if (extractPrice(normalized)) return false;
  if (isMostlyNumeric(normalized)) return false;
  if (/^(non|mem)\.? price$/i.test(normalized)) return false;
  if (/^page \d+$/i.test(normalized)) return false;

  const words = normalized.split(/\s+/).filter(Boolean);
  return words.length > 0 && words.length <= 5;
}

function toSectionId(index) {
  return `section-${index + 1}`;
}

function toItemId(sectionIndex, itemIndex) {
  return `section-${sectionIndex + 1}-item-${itemIndex + 1}`;
}

function ensureSection(sections, title) {
  const normalizedTitle = normalizeText(title) || "Uploaded Menu";
  const existing = sections[sections.length - 1];
  if (existing && existing.items.length === 0 && existing.title === normalizedTitle) {
    return existing;
  }

  const section = {
    id: toSectionId(sections.length),
    title: normalizedTitle,
    items: [],
  };
  sections.push(section);
  return section;
}

function addItemToSection(section, label, price) {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return;

  section.items.push({
    id: toItemId(Number(section.id.replace("section-", "")) - 1, section.items.length),
    label: normalizedLabel,
    price: sanitizePrice(price),
    selected: true,
  });
}

function buildStructuredSections(rows = [], defaultSectionTitle = "Uploaded Menu") {
  const sections = [];
  let currentSection = null;

  rows.forEach((rawRow) => {
    const cells = Array.isArray(rawRow)
      ? rawRow.map((cell) => normalizeText(cell)).filter(Boolean)
      : [normalizeText(rawRow)].filter(Boolean);

    if (!cells.length) return;

    if (cells.length === 1) {
      const onlyCell = cells[0];
      const price = extractPrice(onlyCell);

      if (!price && looksLikeSectionHeading(onlyCell)) {
        currentSection = ensureSection(sections, onlyCell);
        return;
      }

      const label = removeTrailingPrice(onlyCell) || onlyCell;
      currentSection =
        currentSection || ensureSection(sections, defaultSectionTitle);
      addItemToSection(currentSection, label, price);
      return;
    }

    const priceIndexes = cells.reduce((matches, cell, index) => {
      if (extractPrice(cell)) matches.push(index);
      return matches;
    }, []);

    if (!priceIndexes.length) {
      const heading = cells.join(" ");
      if (looksLikeSectionHeading(heading)) {
        currentSection = ensureSection(sections, heading);
      }
      return;
    }

    const firstPriceIndex = priceIndexes[0];
    const label = normalizeText(cells.slice(0, firstPriceIndex).join(" "));
    const price = extractPrice(cells[firstPriceIndex]);

    currentSection =
      currentSection || ensureSection(sections, defaultSectionTitle);
    addItemToSection(currentSection, label || removeTrailingPrice(cells[0]), price);
  });

  return sections.filter((section) =>
    section.items.some((item) => normalizeText(item.label))
  );
}

function parseExcelBuffer(buffer, fileName) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sections = [];
  const rawLines = [];

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });

    rows.forEach((row) => {
      const line = (Array.isArray(row) ? row : [row])
        .map((cell) => normalizeText(cell))
        .filter(Boolean)
        .join(" | ");
      if (line) rawLines.push(line);
    });

    const parsedSections = buildStructuredSections(
      rows,
      workbook.SheetNames.length > 1 ? sheetName : getFileBaseName(fileName)
    );

    parsedSections.forEach((section) => {
      sections.push({
        ...section,
        id: toSectionId(sections.length),
      });
    });
  });

  return {
    sections,
    rawLines: rawLines.slice(0, 80),
    warnings:
      sections.length === 0
        ? [
            "We could not detect structured rows in this spreadsheet. Please review the detected content manually.",
          ]
        : [],
    parserType: "spreadsheet",
    extraMeta: {
      sheetNames: workbook.SheetNames,
    },
  };
}

async function parsePdfBuffer(buffer, fileName) {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const rawLines = String(result?.text || "")
      .split(/\r?\n/)
      .map((line) => normalizeText(line))
      .filter(
        (line) =>
          line &&
          !/^--\s*\d+\s+of\s+\d+\s*--$/i.test(line) &&
          !/^page\s+\d+$/i.test(line)
      );

    const rows = rawLines.map((line) =>
      line
        .split(/\s{2,}|\t+/)
        .map((part) => normalizeText(part))
        .filter(Boolean)
    );

    const sections = buildStructuredSections(rows, getFileBaseName(fileName));
    const structuredItemCount = sections.reduce(
      (count, section) => count + section.items.length,
      0
    );

    const warnings = [];
    if (structuredItemCount === 0) {
      warnings.push(
        "This PDF looks image-based or artwork-heavy. We could only detect limited text, so category hierarchy was not recovered."
      );
    }
    if (rawLines.length <= 6) {
      warnings.push(
        "Only a small amount of text was extractable from the PDF. OCR may be needed for full menu parsing."
      );
    }

    return {
      sections,
      rawLines: rawLines.slice(0, 80),
      warnings,
      parserType: "pdf",
      extraMeta: {
        pageCount: Array.isArray(result?.pages) ? result.pages.length : undefined,
      },
    };
  } finally {
    if (typeof parser.destroy === "function") {
      try {
        await parser.destroy();
      } catch (cleanupError) {
        console.warn("PDF parser cleanup warning", cleanupError?.message || cleanupError);
      }
    }
  }
}

async function parseMenuBuffer(file) {
  const fileName = file?.originalname || "";
  const extension = String(fileName).toLowerCase();

  if (extension.endsWith(".xls") || extension.endsWith(".xlsx")) {
    return parseExcelBuffer(file.buffer, fileName);
  }

  return parsePdfBuffer(file.buffer, fileName);
}

router.post("/parse-menu-file", handleMenuUpload, async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ message: "Please upload a file first." });
    }

    const parsed = await parseMenuBuffer(req.file);
    const structuredItemCount = parsed.sections.reduce(
      (count, section) => count + section.items.length,
      0
    );

    return res.json({
      sections: parsed.sections,
      rawLines: parsed.rawLines,
      meta: {
        fileName: req.file.originalname,
        parserType: parsed.parserType,
        parseMode: structuredItemCount > 0 ? "structured" : "raw_text",
        sectionCount: parsed.sections.length,
        itemCount: structuredItemCount,
        warnings: parsed.warnings,
        ...parsed.extraMeta,
      },
    });
  } catch (error) {
    console.error("Failed to parse uploaded menu file", error);
    return res.status(500).json({
      message: error.message || "Failed to parse uploaded menu file.",
    });
  }
});

module.exports = router;
module.exports.parseMenuBuffer = parseMenuBuffer;
