const DigitalScoreConfig = require("../models/DigitalScoreConfig");
const DigitalScoreQuestion = require("../models/DigitalScoreQuestion");

const DEFAULT_SCORE_RANGES = [
  {
    min: 0,
    max: 40,
    key: "poor",
    label: { english: "Poor", telugu: "Poor", hindi: "Poor" },
  },
  {
    min: 41,
    max: 70,
    key: "average",
    label: { english: "Average", telugu: "Average", hindi: "Average" },
  },
  {
    min: 71,
    max: 85,
    key: "good",
    label: { english: "Good", telugu: "Good", hindi: "Good" },
  },
  {
    min: 86,
    max: 100,
    key: "excellent",
    label: { english: "Excellent", telugu: "Excellent", hindi: "Excellent" },
  },
];

const DEFAULT_CONFIG = {
  key: "digital-score",
  isEnabled: true,
  supportedLanguages: ["english", "telugu", "hindi"],
  defaultLanguage: "english",
  title: {
    english: "Check Your Digital Score",
    telugu: "Check Your Digital Score",
    hindi: "Check Your Digital Score",
  },
  subtitle: {
    english: "Find out how discoverable and customer-ready your business is in under a minute.",
    telugu: "Find out how discoverable and customer-ready your business is in under a minute.",
    hindi: "Find out how discoverable and customer-ready your business is in under a minute.",
  },
  ctaText: {
    english: "Check Your Digital Score",
    telugu: "Check Your Digital Score",
    hindi: "Check Your Digital Score",
  },
  resultScreenText: {
    english: "Your score is ready. Here are the easiest ways to improve your digital presence.",
    telugu: "Your score is ready. Here are the easiest ways to improve your digital presence.",
    hindi: "Your score is ready. Here are the easiest ways to improve your digital presence.",
  },
  scoreRanges: DEFAULT_SCORE_RANGES,
};

const DEFAULT_QUESTIONS = [
  {
    key: "google_visibility",
    section: "Discovery",
    order: 1,
    questionType: "single_choice",
    questionText: {
      english: "Can customers find your business on Google?",
      telugu: "Can customers find your business on Google?",
      hindi: "Can customers find your business on Google?",
    },
    options: [
      {
        key: "easily_found",
        label: { english: "Yes, very easily", telugu: "Yes, very easily", hindi: "Yes, very easily" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "sometimes_found",
        label: { english: "Sometimes", telugu: "Sometimes", hindi: "Sometimes" },
        scoreValue: 8,
        order: 2,
      },
      {
        key: "hard_to_find",
        label: { english: "Not really", telugu: "Not really", hindi: "Not really" },
        scoreValue: 3,
        order: 3,
      },
      {
        key: "not_sure",
        label: { english: "I am not sure", telugu: "I am not sure", hindi: "I am not sure" },
        scoreValue: 0,
        order: 4,
      },
    ],
  },
  {
    key: "customer_source",
    section: "Discovery",
    order: 2,
    questionType: "single_choice",
    questionText: {
      english: "Where do most customers currently find you?",
      telugu: "Where do most customers currently find you?",
      hindi: "Where do most customers currently find you?",
    },
    options: [
      {
        key: "google_maps",
        label: { english: "Google / Maps", telugu: "Google / Maps", hindi: "Google / Maps" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "instagram",
        label: { english: "Instagram / Social media", telugu: "Instagram / Social media", hindi: "Instagram / Social media" },
        scoreValue: 9,
        order: 2,
      },
      {
        key: "word_of_mouth",
        label: { english: "Friends and word of mouth", telugu: "Friends and word of mouth", hindi: "Friends and word of mouth" },
        scoreValue: 5,
        order: 3,
      },
      {
        key: "walk_ins",
        label: { english: "Mostly walk-ins", telugu: "Mostly walk-ins", hindi: "Mostly walk-ins" },
        scoreValue: 2,
        order: 4,
      },
    ],
  },
  {
    key: "website_or_profile",
    section: "Information",
    order: 3,
    questionType: "single_choice",
    questionText: {
      english: "Do you have a website or online profile?",
      telugu: "Do you have a website or online profile?",
      hindi: "Do you have a website or online profile?",
    },
    options: [
      {
        key: "full_profile",
        label: { english: "Yes, and it is updated", telugu: "Yes, and it is updated", hindi: "Yes, and it is updated" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "basic_profile",
        label: { english: "Yes, but not updated often", telugu: "Yes, but not updated often", hindi: "Yes, but not updated often" },
        scoreValue: 7,
        order: 2,
      },
      {
        key: "social_only",
        label: { english: "Only social media", telugu: "Only social media", hindi: "Only social media" },
        scoreValue: 4,
        order: 3,
      },
      {
        key: "none",
        label: { english: "No", telugu: "No", hindi: "No" },
        scoreValue: 0,
        order: 4,
      },
    ],
  },
  {
    key: "services_online",
    section: "Information",
    order: 4,
    questionType: "single_choice",
    questionText: {
      english: "Can customers see all your services online?",
      telugu: "Can customers see all your services online?",
      hindi: "Can customers see all your services online?",
    },
    options: [
      {
        key: "all_services",
        label: { english: "Yes, clearly", telugu: "Yes, clearly", hindi: "Yes, clearly" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "some_services",
        label: { english: "Only some services", telugu: "Only some services", hindi: "Only some services" },
        scoreValue: 6,
        order: 2,
      },
      {
        key: "customers_call",
        label: { english: "Customers usually call to ask", telugu: "Customers usually call to ask", hindi: "Customers usually call to ask" },
        scoreValue: 2,
        order: 3,
      },
    ],
  },
  {
    key: "pricing_visibility",
    section: "Conversion",
    order: 5,
    questionType: "single_choice",
    questionText: {
      english: "Are your prices or packages visible online?",
      telugu: "Are your prices or packages visible online?",
      hindi: "Are your prices or packages visible online?",
    },
    options: [
      {
        key: "fully_visible",
        label: { english: "Yes, clearly visible", telugu: "Yes, clearly visible", hindi: "Yes, clearly visible" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "partially_visible",
        label: { english: "Some are visible", telugu: "Some are visible", hindi: "Some are visible" },
        scoreValue: 6,
        order: 2,
      },
      {
        key: "not_visible",
        label: { english: "No, customers must contact us", telugu: "No, customers must contact us", hindi: "No, customers must contact us" },
        scoreValue: 1,
        order: 3,
      },
    ],
  },
  {
    key: "contact_or_booking",
    section: "Conversion",
    order: 6,
    questionType: "single_choice",
    questionText: {
      english: "Can customers contact or book you online?",
      telugu: "Can customers contact or book you online?",
      hindi: "Can customers contact or book you online?",
    },
    options: [
      {
        key: "book_online",
        label: { english: "Yes, they can book or enquire instantly", telugu: "Yes, they can book or enquire instantly", hindi: "Yes, they can book or enquire instantly" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "call_or_whatsapp",
        label: { english: "Only by call or WhatsApp", telugu: "Only by call or WhatsApp", hindi: "Only by call or WhatsApp" },
        scoreValue: 7,
        order: 2,
      },
      {
        key: "difficult_to_contact",
        label: { english: "It is difficult to contact us online", telugu: "It is difficult to contact us online", hindi: "It is difficult to contact us online" },
        scoreValue: 1,
        order: 3,
      },
    ],
  },
  {
    key: "showcase_work",
    section: "Trust",
    order: 7,
    questionType: "single_choice",
    questionText: {
      english: "Do you showcase your work with photos or videos online?",
      telugu: "Do you showcase your work with photos or videos online?",
      hindi: "Do you showcase your work with photos or videos online?",
    },
    options: [
      {
        key: "regularly",
        label: { english: "Yes, regularly", telugu: "Yes, regularly", hindi: "Yes, regularly" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "sometimes",
        label: { english: "Sometimes", telugu: "Sometimes", hindi: "Sometimes" },
        scoreValue: 7,
        order: 2,
      },
      {
        key: "rarely",
        label: { english: "Rarely or never", telugu: "Rarely or never", hindi: "Rarely or never" },
        scoreValue: 1,
        order: 3,
      },
    ],
  },
  {
    key: "repeat_customers",
    section: "Retention",
    order: 8,
    questionType: "single_choice",
    questionText: {
      english: "Do you track repeat customers or offer rewards?",
      telugu: "Do you track repeat customers or offer rewards?",
      hindi: "Do you track repeat customers or offer rewards?",
    },
    options: [
      {
        key: "track_and_reward",
        label: { english: "Yes, we do both", telugu: "Yes, we do both", hindi: "Yes, we do both" },
        scoreValue: 12,
        order: 1,
      },
      {
        key: "track_only",
        label: { english: "We track them informally", telugu: "We track them informally", hindi: "We track them informally" },
        scoreValue: 6,
        order: 2,
      },
      {
        key: "none",
        label: { english: "No", telugu: "No", hindi: "No" },
        scoreValue: 0,
        order: 3,
      },
    ],
  },
];

async function ensureDigitalScoreDefaults() {
  await DigitalScoreConfig.findOneAndUpdate(
    { key: DEFAULT_CONFIG.key },
    { $setOnInsert: DEFAULT_CONFIG },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  for (const question of DEFAULT_QUESTIONS) {
    await DigitalScoreQuestion.findOneAndUpdate(
      { key: question.key },
      { $setOnInsert: question },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

module.exports = {
  DEFAULT_CONFIG,
  DEFAULT_QUESTIONS,
  DEFAULT_SCORE_RANGES,
  ensureDigitalScoreDefaults,
};
