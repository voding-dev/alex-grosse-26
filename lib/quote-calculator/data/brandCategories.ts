import { PricingCategory } from "../types/pricing";
import { DEFAULT_CATEGORIES } from "./defaultCategories";

// Ian Courtright - Freelance Services
export const IAN_COURTRIGHT_CATEGORIES: PricingCategory[] = [
  {
    id: "creative-services",
    name: "Creative Services",
    items: [
      { id: "ic-cs-1", name: "Creative Direction", description: "Overall creative vision and strategy", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "ic-cs-2", name: "Concept Development", description: "Initial concept and ideation", quantity: 0, rate: 800, unit: "day", enabled: false },
      { id: "ic-cs-3", name: "Mood Board Creation", description: "Visual mood board development", quantity: 0, rate: 400, unit: "flat", enabled: false },
      { id: "ic-cs-4", name: "Brand Identity Consultation", description: "Brand identity strategy session", quantity: 0, rate: 1000, unit: "flat", enabled: false },
    ],
  },
  {
    id: "photography",
    name: "Photography",
    items: [
      { id: "ic-ph-1", name: "Photography Day Rate", description: "Full day photography shoot", quantity: 0, rate: 2500, unit: "day", enabled: false },
      { id: "ic-ph-2", name: "Half Day Photography", description: "Half day photography shoot", quantity: 0, rate: 1500, unit: "flat", enabled: false },
      { id: "ic-ph-3", name: "Portrait Session", description: "Portrait photography session", quantity: 0, rate: 800, unit: "flat", enabled: false },
      { id: "ic-ph-4", name: "Product Photography", description: "Product shoot per item", quantity: 0, rate: 300, unit: "item", enabled: false },
      { id: "ic-ph-5", name: "Event Photography", description: "Event coverage", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "ic-ph-6", name: "Travel Photography", description: "Travel/documentary photography", quantity: 0, rate: 1800, unit: "day", enabled: false },
    ],
  },
  {
    id: "video-production",
    name: "Video Production",
    items: [
      { id: "ic-vp-1", name: "Video Production Day Rate", description: "Full day video production", quantity: 0, rate: 3000, unit: "day", enabled: false },
      { id: "ic-vp-2", name: "Video Direction", description: "Video direction and oversight", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "ic-vp-3", name: "Camera Operation", description: "Cinematography", quantity: 0, rate: 1500, unit: "day", enabled: false },
      { id: "ic-vp-4", name: "Drone Footage", description: "Aerial drone cinematography", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "ic-vp-5", name: "B-Roll Capture", description: "Additional B-roll footage", quantity: 0, rate: 1000, unit: "day", enabled: false },
    ],
  },
  {
    id: "post-production",
    name: "Post-Production",
    items: [
      { id: "ic-pp-1", name: "Photo Editing", description: "Basic photo editing per image", quantity: 0, rate: 50, unit: "image", enabled: false },
      { id: "ic-pp-2", name: "Photo Retouching", description: "Advanced retouching per image", quantity: 0, rate: 150, unit: "image", enabled: false },
      { id: "ic-pp-3", name: "Video Editing", description: "Video editing day rate", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "ic-pp-4", name: "Color Grading", description: "Color correction and grading", quantity: 0, rate: 800, unit: "day", enabled: false },
      { id: "ic-pp-5", name: "Motion Graphics", description: "Motion graphics and animation", quantity: 0, rate: 1000, unit: "day", enabled: false },
      { id: "ic-pp-6", name: "Sound Design", description: "Audio editing and sound design", quantity: 0, rate: 600, unit: "day", enabled: false },
    ],
  },
  {
    id: "design-services",
    name: "Design Services",
    items: [
      { id: "ic-ds-1", name: "Graphic Design", description: "Graphic design day rate", quantity: 0, rate: 1000, unit: "day", enabled: false },
      { id: "ic-ds-2", name: "Logo Design", description: "Logo design and iteration", quantity: 0, rate: 1500, unit: "flat", enabled: false },
      { id: "ic-ds-3", name: "Web Design", description: "Website design and mockups", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "ic-ds-4", name: "Social Media Graphics", description: "Social media asset creation", quantity: 0, rate: 500, unit: "flat", enabled: false },
      { id: "ic-ds-5", name: "Print Design", description: "Print design and layout", quantity: 0, rate: 800, unit: "day", enabled: false },
    ],
  },
  {
    id: "consulting",
    name: "Consulting & Strategy",
    items: [
      { id: "ic-cn-1", name: "Creative Consulting", description: "Creative strategy consultation", quantity: 0, rate: 1500, unit: "day", enabled: false },
      { id: "ic-cn-2", name: "Brand Strategy", description: "Brand positioning and strategy", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "ic-cn-3", name: "Content Strategy", description: "Content planning and strategy", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "ic-cn-4", name: "Workshop Facilitation", description: "Team workshop or training", quantity: 0, rate: 2500, unit: "day", enabled: false },
    ],
  },
  {
    id: "travel-expenses",
    name: "Travel & Expenses",
    items: [
      { id: "ic-te-1", name: "Travel Day", description: "Travel day compensation", quantity: 0, rate: 500, unit: "day", enabled: false },
      { id: "ic-te-2", name: "Airfare", description: "Flight costs", quantity: 0, rate: 800, unit: "flat", enabled: false },
      { id: "ic-te-3", name: "Lodging", description: "Hotel accommodations", quantity: 0, rate: 200, unit: "day", enabled: false },
      { id: "ic-te-4", name: "Ground Transportation", description: "Car rental or transport", quantity: 0, rate: 150, unit: "day", enabled: false },
      { id: "ic-te-5", name: "Meals & Per Diem", description: "Daily meal allowance", quantity: 0, rate: 75, unit: "day", enabled: false },
    ],
  },
];

// Voding - Software Services
export const VODING_CATEGORIES: PricingCategory[] = [
  {
    id: "development",
    name: "Development",
    items: [
      { id: "vd-dev-1", name: "Full-Stack Development", description: "Full-stack web application development", quantity: 0, rate: 1800, unit: "day", enabled: false },
      { id: "vd-dev-2", name: "Frontend Development", description: "Frontend development (React, Vue, etc.)", quantity: 0, rate: 1500, unit: "day", enabled: false },
      { id: "vd-dev-3", name: "Backend Development", description: "Backend API and server development", quantity: 0, rate: 1600, unit: "day", enabled: false },
      { id: "vd-dev-4", name: "Mobile App Development", description: "iOS/Android app development", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "vd-dev-5", name: "API Development", description: "REST/GraphQL API development", quantity: 0, rate: 1400, unit: "day", enabled: false },
      { id: "vd-dev-6", name: "Database Design", description: "Database architecture and design", quantity: 0, rate: 1200, unit: "day", enabled: false },
    ],
  },
  {
    id: "architecture",
    name: "Architecture & Planning",
    items: [
      { id: "vd-arch-1", name: "System Architecture", description: "System architecture design", quantity: 0, rate: 2500, unit: "day", enabled: false },
      { id: "vd-arch-2", name: "Technical Planning", description: "Technical roadmap and planning", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "vd-arch-3", name: "Code Review", description: "Code review and optimization", quantity: 0, rate: 1000, unit: "day", enabled: false },
      { id: "vd-arch-4", name: "Performance Optimization", description: "Application performance tuning", quantity: 0, rate: 1500, unit: "day", enabled: false },
      { id: "vd-arch-5", name: "Security Audit", description: "Security assessment and hardening", quantity: 0, rate: 1800, unit: "day", enabled: false },
    ],
  },
  {
    id: "devops-infrastructure",
    name: "DevOps & Infrastructure",
    items: [
      { id: "vd-devops-1", name: "CI/CD Setup", description: "Continuous integration/deployment setup", quantity: 0, rate: 2000, unit: "flat", enabled: false },
      { id: "vd-devops-2", name: "Cloud Infrastructure", description: "AWS/Azure/GCP infrastructure setup", quantity: 0, rate: 1800, unit: "day", enabled: false },
      { id: "vd-devops-3", name: "Docker & Containers", description: "Containerization and orchestration", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "vd-devops-4", name: "Monitoring & Logging", description: "Monitoring and logging setup", quantity: 0, rate: 1000, unit: "flat", enabled: false },
      { id: "vd-devops-5", name: "Infrastructure as Code", description: "IaC setup (Terraform, etc.)", quantity: 0, rate: 1500, unit: "day", enabled: false },
    ],
  },
  {
    id: "testing-qa",
    name: "Testing & QA",
    items: [
      { id: "vd-test-1", name: "Unit Testing", description: "Unit test development", quantity: 0, rate: 800, unit: "day", enabled: false },
      { id: "vd-test-2", name: "Integration Testing", description: "Integration test development", quantity: 0, rate: 1000, unit: "day", enabled: false },
      { id: "vd-test-3", name: "E2E Testing", description: "End-to-end test development", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "vd-test-4", name: "QA Testing", description: "Manual QA and testing", quantity: 0, rate: 600, unit: "day", enabled: false },
      { id: "vd-test-5", name: "Performance Testing", description: "Load and performance testing", quantity: 0, rate: 1500, unit: "day", enabled: false },
    ],
  },
  {
    id: "consulting-advisory",
    name: "Consulting & Advisory",
    items: [
      { id: "vd-consult-1", name: "Technical Consulting", description: "Technical strategy and guidance", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "vd-consult-2", name: "Technology Selection", description: "Technology stack recommendations", quantity: 0, rate: 1500, unit: "flat", enabled: false },
      { id: "vd-consult-3", name: "Migration Planning", description: "System migration planning", quantity: 0, rate: 1800, unit: "day", enabled: false },
      { id: "vd-consult-4", name: "Team Training", description: "Developer team training", quantity: 0, rate: 2500, unit: "day", enabled: false },
    ],
  },
  {
    id: "maintenance-support",
    name: "Maintenance & Support",
    items: [
      { id: "vd-support-1", name: "Bug Fixes", description: "Bug fixes and patches", quantity: 0, rate: 1200, unit: "day", enabled: false },
      { id: "vd-support-2", name: "Feature Updates", description: "Feature additions and updates", quantity: 0, rate: 1500, unit: "day", enabled: false },
      { id: "vd-support-3", name: "Monthly Maintenance", description: "Ongoing maintenance retainer", quantity: 0, rate: 3000, unit: "month", enabled: false },
      { id: "vd-support-4", name: "Emergency Support", description: "Urgent support and fixes", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "vd-support-5", name: "Documentation", description: "Technical documentation", quantity: 0, rate: 800, unit: "day", enabled: false },
    ],
  },
  {
    id: "specialized-services",
    name: "Specialized Services",
    items: [
      { id: "vd-spec-1", name: "AI/ML Integration", description: "AI and machine learning integration", quantity: 0, rate: 2500, unit: "day", enabled: false },
      { id: "vd-spec-2", name: "Blockchain Development", description: "Blockchain and smart contracts", quantity: 0, rate: 3000, unit: "day", enabled: false },
      { id: "vd-spec-3", name: "Real-time Systems", description: "Real-time application development", quantity: 0, rate: 2200, unit: "day", enabled: false },
      { id: "vd-spec-4", name: "E-commerce Platform", description: "E-commerce solution development", quantity: 0, rate: 2000, unit: "day", enabled: false },
      { id: "vd-spec-5", name: "Third-Party Integrations", description: "API and third-party integrations", quantity: 0, rate: 1200, unit: "day", enabled: false },
    ],
  },
];

// Style Driven uses the existing DEFAULT_CATEGORIES (production-focused)
export const STYLE_DRIVEN_CATEGORIES: PricingCategory[] = DEFAULT_CATEGORIES;
















