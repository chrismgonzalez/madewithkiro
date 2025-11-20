/**
 * Mock Data Layer for MadeWithKiro MVP
 * Provides sample data for development and testing
 */

import type { UserProfile, Application } from "../types";

// Mock User Profiles (at least 3 users)
const mockUsers: UserProfile[] = [
  {
    userId: "user-001",
    firstName: "Sarah",
    lastName: "Chen",
    awsBuilderHandle: "sarahchen",
    linkedInUsername: "sarahchen",
    githubUsername: "sarahchen-dev",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
  },
  {
    userId: "user-002",
    firstName: "Marcus",
    lastName: "Rodriguez",
    awsBuilderHandle: "marcusr",
    linkedInUsername: "marcus-rodriguez",
    githubUsername: "mrodriguez",
    createdAt: "2024-01-20T14:30:00Z",
    updatedAt: "2024-01-20T14:30:00Z",
  },
  {
    userId: "user-003",
    firstName: "Aisha",
    lastName: "Patel",
    awsBuilderHandle: "aishapatel",
    githubUsername: "apatel-codes",
    createdAt: "2024-02-01T09:15:00Z",
    updatedAt: "2024-02-01T09:15:00Z",
  },
  {
    userId: "user-004",
    firstName: "James",
    lastName: "Wilson",
    awsBuilderHandle: "jameswilson",
    linkedInUsername: "james-wilson-dev",
    createdAt: "2024-02-10T16:45:00Z",
    updatedAt: "2024-02-10T16:45:00Z",
  },
];

// Mock Applications (at least 10 applications with mix of public/private)
const mockApplications: Application[] = [
  {
    appId: "app-001",
    userId: "user-001",
    userName: "Sarah Chen",
    name: "AI Code Review Assistant",
    description:
      "An intelligent code review tool built with Kiro that analyzes pull requests and provides actionable feedback using AI.",
    appUrl: "https://code-review-ai.example.com",
    githubUrl: "https://github.com/sarahchen-dev/ai-code-review",
    tags: ["AI", "Code Review", "Developer Tools", "Automation"],
    visibility: "public",
    createdAt: "2024-03-01T10:00:00Z",
  },
  {
    appId: "app-002",
    userId: "user-001",
    userName: "Sarah Chen",
    name: "Internal Team Dashboard",
    description:
      "A private dashboard for tracking team metrics and project progress with real-time updates.",
    appUrl: "https://team-dashboard-internal.example.com",
    tags: ["Dashboard", "Analytics", "Team Tools"],
    visibility: "private",
    createdAt: "2024-03-05T14:20:00Z",
  },
  {
    appId: "app-003",
    userId: "user-002",
    userName: "Marcus Rodriguez",
    name: "Serverless Blog Platform",
    description:
      "A fully serverless blog platform with markdown support, built entirely with AWS services and Kiro.",
    appUrl: "https://serverless-blog.example.com",
    githubUrl: "https://github.com/mrodriguez/serverless-blog",
    tags: ["Serverless", "Blog", "AWS", "Markdown"],
    visibility: "public",
    createdAt: "2024-03-10T11:30:00Z",
  },
  {
    appId: "app-004",
    userId: "user-002",
    userName: "Marcus Rodriguez",
    name: "E-commerce Analytics",
    description:
      "Real-time analytics platform for e-commerce businesses with custom reporting and insights.",
    appUrl: "https://ecommerce-analytics.example.com",
    tags: ["Analytics", "E-commerce", "Real-time", "Business Intelligence"],
    visibility: "public",
    createdAt: "2024-03-12T09:45:00Z",
  },
  {
    appId: "app-005",
    userId: "user-002",
    userName: "Marcus Rodriguez",
    name: "Client Project Prototype",
    description:
      "A prototype application for a client project, showcasing new features and design concepts.",
    appUrl: "https://client-prototype.example.com",
    tags: ["Prototype", "Client Work", "Design"],
    visibility: "private",
    createdAt: "2024-03-15T16:00:00Z",
  },
  {
    appId: "app-006",
    userId: "user-003",
    userName: "Aisha Patel",
    name: "Task Management App",
    description:
      "A beautiful and intuitive task management application with team collaboration features.",
    appUrl: "https://task-manager.example.com",
    githubUrl: "https://github.com/apatel-codes/task-manager",
    tags: ["Productivity", "Task Management", "Collaboration", "SaaS"],
    visibility: "public",
    createdAt: "2024-03-18T13:15:00Z",
  },
  {
    appId: "app-007",
    userId: "user-003",
    userName: "Aisha Patel",
    name: "Weather Forecast Dashboard",
    description:
      "A responsive weather dashboard with 7-day forecasts and interactive maps.",
    appUrl: "https://weather-dashboard.example.com",
    tags: ["Weather", "Dashboard", "API Integration", "Maps"],
    visibility: "public",
    createdAt: "2024-03-20T10:30:00Z",
  },
  {
    appId: "app-008",
    userId: "user-003",
    userName: "Aisha Patel",
    name: "Personal Finance Tracker",
    description:
      "Private finance tracking app with budget management and expense categorization.",
    appUrl: "https://finance-tracker-private.example.com",
    tags: ["Finance", "Personal", "Budget", "Tracking"],
    visibility: "private",
    createdAt: "2024-03-22T15:45:00Z",
  },
  {
    appId: "app-009",
    userId: "user-004",
    userName: "James Wilson",
    name: "Recipe Sharing Platform",
    description:
      "A community-driven platform for sharing and discovering recipes with social features.",
    appUrl: "https://recipe-share.example.com",
    githubUrl: "https://github.com/jwilson/recipe-platform",
    tags: ["Social", "Food", "Community", "Recipes"],
    visibility: "public",
    createdAt: "2024-03-25T12:00:00Z",
  },
  {
    appId: "app-010",
    userId: "user-004",
    userName: "James Wilson",
    name: "Fitness Tracking App",
    description:
      "Track your workouts, nutrition, and fitness goals with detailed analytics and progress charts.",
    appUrl: "https://fitness-tracker.example.com",
    tags: ["Fitness", "Health", "Tracking", "Analytics"],
    visibility: "public",
    createdAt: "2024-03-28T08:30:00Z",
  },
  {
    appId: "app-011",
    userId: "user-001",
    userName: "Sarah Chen",
    name: "Experimental ML Model",
    description:
      "An experimental machine learning model for testing new algorithms and approaches.",
    appUrl: "https://ml-experiment.example.com",
    tags: ["Machine Learning", "Experimental", "AI"],
    visibility: "private",
    createdAt: "2024-04-01T11:00:00Z",
  },
  {
    appId: "app-012",
    userId: "user-004",
    userName: "James Wilson",
    name: "Beta Testing Platform",
    description:
      "Internal platform for coordinating beta testing with early adopters.",
    appUrl: "https://beta-testing.example.com",
    githubUrl: "https://github.com/jwilson/beta-platform",
    tags: ["Testing", "Beta", "Internal Tools"],
    visibility: "private",
    createdAt: "2024-04-03T14:15:00Z",
  },
];

/**
 * Get all user profiles
 */
export function getAllUsers(): UserProfile[] {
  return mockUsers;
}

/**
 * Get a user profile by ID
 * @param userId - The user ID to look up
 * @returns The user profile or undefined if not found
 */
export function getUserById(userId: string): UserProfile | undefined {
  return mockUsers.find((user) => user.userId === userId);
}

/**
 * Get all applications with visibility filtering
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Array of applications (filtered by visibility if not authenticated)
 */
export function getAllApplications(isAuthenticated: boolean): Application[] {
  if (isAuthenticated) {
    return mockApplications;
  }
  return mockApplications.filter((app) => app.visibility === "public");
}

/**
 * Get applications by user ID with visibility filtering
 * @param userId - The user ID to filter by
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Array of applications for the specified user (filtered by visibility if not authenticated)
 */
export function getApplicationsByUserId(
  userId: string,
  isAuthenticated: boolean
): Application[] {
  const userApps = mockApplications.filter((app) => app.userId === userId);

  if (isAuthenticated) {
    return userApps;
  }

  return userApps.filter((app) => app.visibility === "public");
}

/**
 * Get all unique tags from visible applications
 * @param isAuthenticated - Whether the user is authenticated
 * @returns Array of unique tags
 */
export function getAllTags(isAuthenticated: boolean): string[] {
  const visibleApps = getAllApplications(isAuthenticated);
  const allTags = visibleApps.flatMap((app) => app.tags);
  return [...new Set(allTags)].sort();
}
