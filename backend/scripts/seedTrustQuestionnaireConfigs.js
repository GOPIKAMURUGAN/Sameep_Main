require("dotenv").config();

const connectDB = require("../config/db");
const TrustQuestionnaireConfig = require("../models/TrustQuestionnaireConfig");
const {
  CATEGORY_CLUSTER_MAP,
  CLUSTER_QUESTIONS,
} = require("../utils/trustClusters");

function groupCategoriesByCluster() {
  return Object.entries(CATEGORY_CLUSTER_MAP).reduce((acc, [categoryName, clusterKey]) => {
    if (!acc[clusterKey]) acc[clusterKey] = [];
    acc[clusterKey].push(categoryName);
    return acc;
  }, {});
}

function normalizeQuestions(questions = []) {
  return questions.map((question, index) => ({
    id: question.id,
    label: question.label || question.id,
    type: question.type,
    options: Array.isArray(question.options) ? question.options : [],
    placeholder: question.placeholder || "",
    helperText: question.helperText || "",
    required: question.required === true,
    order: typeof question.order === "number" ? question.order : index,
    isActive: question.isActive !== false,
  }));
}

async function seed() {
  await connectDB();

  const categoriesByCluster = groupCategoriesByCluster();
  const clusterKeys = Object.keys(CLUSTER_QUESTIONS);

  let upserted = 0;

  for (const clusterKey of clusterKeys) {
    const questions = normalizeQuestions(CLUSTER_QUESTIONS[clusterKey] || []);
    const categoryNames = categoriesByCluster[clusterKey] || [];

    await TrustQuestionnaireConfig.findOneAndUpdate(
      { clusterKey },
      {
        $set: {
          clusterKey,
          title: clusterKey
            .split("_")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
          categoryNames,
          questions,
          isActive: true,
        },
      },
      { upsert: true, new: true }
    );

    upserted += 1;
  }

  console.log(`Seeded trust questionnaire configs for ${upserted} clusters.`);
  process.exit(0);
}

seed().catch((error) => {
  console.error("Failed to seed trust questionnaire configs:", error);
  process.exit(1);
});
