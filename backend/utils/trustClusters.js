const CATEGORY_CLUSTER_MAP = {
  // Personal skill
  
  "Makeup Artistry": "personal_skill",
  "Nail Couture Art": "personal_skill",
  "Mehndi": "personal_skill",
  "Designer Boutiques": "personal_skill",
  "Photography": "personal_skill",
  "Social Media Influencers": "personal_skill",
  "Priest Services": "personal_skill",

  "Salon & Spa": "salon_premium",

  // Service business
  "Pet Grooming": "service_business",
  "Bakers": "service_business",
  "Dry Cleaning & Laundry": "service_business",
  "Computer Services": "service_business",
  "Car Mechanic Works": "service_business",
  "Car Wash & Spa": "service_business",
  "Car Decors": "service_business",
  "Appliances Services": "service_business",
  "Electricians": "service_business",
  "Electronic Services": "service_business",
  "Home Cleaning": "service_business",
  "Home Needs": "service_business",
  "Internet Providers": "service_business",
  "Movers & Packers": "service_business",
  "Plumbers": "service_business",
  "Preowned Cars": "service_business",
  "Cold Press Oils": "service_business",
  "Dairy Products": "service_business",
  "Restaurants": "service_business",
  "Hire a Driver": "service_business",
  "Taxi": "service_business",

  // Project execution
  "Decorators": "project_execution",
  "Borewells": "project_execution",
  "Construction Contractors": "project_execution",
  "Construction Materials": "project_execution",
  "Events": "project_execution",
  "House Warming": "project_execution",

  // Training
  "Driving School": "training_based",
  "Sports Academies": "training_based",
  "Arts Hub": "training_based",
  "Yoga": "training_based",
  "Chess Coaching": "training_based",
  "Fitness": "training_based",
  "Swimming Pools": "training_based",
  "Tuitions": "training_based",

  // Venue
  "Banquet Halls": "venue_based",
  "Convention Centres": "venue_based",
  "Holiday Retreats": "venue_based",
  "Function Halls & Gardens": "venue_based",
  "P.G. & Hostels": "venue_based",

  // Compliance
  "Pharmacy Stores": "compliance_based",
  "Medical Services": "compliance_based",
};

const CLUSTER_QUESTIONS = {
  salon_premium: [
  { id: "experience", type: "years" },
  { id: "stylists", type: "range" },
  {
    id: "service_mode",
    type: "select",
    options: ["Salon Only", "Home Service", "Both"],
  },
],
  personal_skill: [
    { id: "experience", type: "years" },
    { id: "customers", type: "range" },
    {
      id: "service_mode",
      type: "select",
      options: ["Home Service", "Studio Only", "Both"],
    },
  ],
  training_based: [
    { id: "experience", type: "years" },
    { id: "students_trained", type: "range" },
    { id: "mode", type: "select", options: ["At our Location", "Home", "Both"] },
  ],
  education: [
    { id: "experience", type: "years" },
    { id: "students_trained", type: "range" },
    { id: "mode", type: "select", options: ["Offline", "Online", "Hybrid"] },
  ],
  auto: [
    { id: "experience", type: "years" },
    { id: "vehicles_serviced", type: "range" },
    { id: "pickup_drop", type: "boolean" },
  ],
  home_services: [
    { id: "experience", type: "years" },
    { id: "jobs_completed", type: "range" },
    {
      id: "service_mode",
      type: "select",
      options: ["On-site", "Home Visit", "Both"],
    },
  ],
  events: [
    { id: "experience", type: "years" },
    { id: "events_hosted", type: "range" },
    { id: "capacity", type: "range" },
  ],
  retail: [
    { id: "experience", type: "years" },
    { id: "customers", type: "range" },
    { id: "delivery", type: "boolean" },
  ],
};

module.exports = {
  CATEGORY_CLUSTER_MAP,
  CLUSTER_QUESTIONS,
};
