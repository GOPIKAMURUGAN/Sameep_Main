const SECTION_KEYS = {
  Discovery: "discoveryScore",
  Trust: "trustScore",
  Information: "informationScore",
  Conversion: "conversionScore",
  Retention: "retentionScore",
};

function normalizeScore(value, maxValue) {
  if (!maxValue || maxValue <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / maxValue) * 100)));
}

function resolveResultLevel(totalScore, scoreRanges = []) {
  const matchedRange = scoreRanges.find(
    (range) => totalScore >= Number(range.min) && totalScore <= Number(range.max)
  );
  const label = matchedRange?.label?.english || matchedRange?.key || "Average";
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function buildRecommendations({
  totalScore,
  sectionScores,
  answers,
  category,
  language = "english",
}) {
  const recommendations = [];
  const hasLowSection = (sectionName) => (sectionScores[SECTION_KEYS[sectionName]] || 0) < 55;
  const answerByKey = Object.fromEntries(
    (answers || []).map((answer) => [answer.questionKey, answer])
  );

  if (hasLowSection("Discovery")) {
    recommendations.push(
      `Make it easier for customers to discover your ${category || "business"} on Google and Maps.`
    );
  }

  if (hasLowSection("Trust")) {
    recommendations.push("Add fresh photos, videos, and proof of your work to build trust faster.");
  }

  if (hasLowSection("Information")) {
    recommendations.push("Show your services, business details, and what you offer more clearly online.");
  }

  if (hasLowSection("Conversion")) {
    recommendations.push("Make pricing and enquiry or booking options simpler so customers can act quickly.");
  }

  if (hasLowSection("Retention")) {
    recommendations.push("Set up a simple repeat-customer or loyalty process so happy customers come back.");
  }

  if ((answerByKey.pricing_visibility?.scoreValue || 0) <= 2) {
    recommendations.push("Publish at least your starting prices or popular packages to reduce customer hesitation.");
  }

  if ((answerByKey.contact_or_booking?.scoreValue || 0) <= 2) {
    recommendations.push("Add a clear online enquiry or booking path so customers can reach you without waiting.");
  }

  if ((answerByKey.showcase_work?.scoreValue || 0) <= 2) {
    recommendations.push("Post your recent work consistently so new visitors can understand your quality quickly.");
  }

  if (recommendations.length === 0) {
    if (totalScore >= 86) {
      recommendations.push("You already have a strong digital presence. Focus on consistency and repeat growth.");
    } else {
      recommendations.push("Your score is on the right track. Small updates to visibility and follow-up can lift it quickly.");
    }
  }

  return recommendations.slice(0, 5);
}

function calculateDigitalScore({ questions, answerMap, scoreRanges, category, language }) {
  const answers = [];
  let totalEarned = 0;
  let totalPossible = 0;
  const sectionEarned = {
    Discovery: 0,
    Trust: 0,
    Information: 0,
    Conversion: 0,
    Retention: 0,
  };
  const sectionPossible = {
    Discovery: 0,
    Trust: 0,
    Information: 0,
    Conversion: 0,
    Retention: 0,
  };

  for (const question of questions) {
    const activeOptions = (question.options || [])
      .filter((option) => option.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    const maxScore = activeOptions.reduce(
      (maxValue, option) => Math.max(maxValue, Number(option.scoreValue) || 0),
      0
    );
    totalPossible += maxScore;
    sectionPossible[question.section] += maxScore;

    const selectedOptionKey = String(answerMap[question.key] || "").trim();
    const selectedOption = activeOptions.find((option) => option.key === selectedOptionKey);

    if (!selectedOption) {
      throw new Error(`Missing or invalid answer for question: ${question.key}`);
    }

    const scoreValue = Number(selectedOption.scoreValue) || 0;
    totalEarned += scoreValue;
    sectionEarned[question.section] += scoreValue;

    answers.push({
      questionId: question._id,
      questionKey: question.key,
      section: question.section,
      prompt:
        question.questionText?.[language] ||
        question.questionText?.english ||
        question.key,
      selectedOptionKey: selectedOption.key,
      selectedOptionLabel:
        selectedOption.label?.[language] ||
        selectedOption.label?.english ||
        selectedOption.key,
      scoreValue,
    });
  }

  const sectionScores = Object.fromEntries(
    Object.entries(SECTION_KEYS).map(([sectionName, outputKey]) => [
      outputKey,
      normalizeScore(sectionEarned[sectionName], sectionPossible[sectionName]),
    ])
  );

  const totalScore = normalizeScore(totalEarned, totalPossible);
  const resultLevel = resolveResultLevel(totalScore, scoreRanges);
  const recommendations = buildRecommendations({
    totalScore,
    sectionScores,
    answers,
    category,
    language,
  });

  return {
    answers,
    totalScore,
    resultLevel,
    recommendations,
    ...sectionScores,
  };
}

module.exports = {
  calculateDigitalScore,
  SECTION_KEYS,
};
