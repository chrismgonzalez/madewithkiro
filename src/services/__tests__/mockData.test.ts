import { describe, it, expect } from "vitest";
import {
  getAllUsers,
  getAllApplications,
  getUserById,
  getApplicationsByUserId,
} from "../mockData";

describe("Mock Data Layer - Acceptance Tests", () => {
  describe("GIVEN the system initializes", () => {
    it("WHEN I request all users THEN I should receive at least 3 user profiles with all required fields", () => {
      // Act
      const users = getAllUsers();

      // Assert
      expect(users.length).toBeGreaterThanOrEqual(3);

      users.forEach((user) => {
        // Verify all required fields are present
        expect(user.userId).toBeDefined();
        expect(typeof user.userId).toBe("string");
        expect(user.userId.length).toBeGreaterThan(0);

        expect(user.firstName).toBeDefined();
        expect(typeof user.firstName).toBe("string");
        expect(user.firstName.length).toBeGreaterThan(0);

        expect(user.lastName).toBeDefined();
        expect(typeof user.lastName).toBe("string");
        expect(user.lastName.length).toBeGreaterThan(0);

        expect(user.awsBuilderHandle).toBeDefined();
        expect(typeof user.awsBuilderHandle).toBe("string");
        expect(user.awsBuilderHandle.length).toBeGreaterThan(0);

        expect(user.createdAt).toBeDefined();
        expect(typeof user.createdAt).toBe("string");
        expect(user.createdAt.length).toBeGreaterThan(0);
      });
    });

    it("WHEN I request all applications THEN I should receive at least 10 applications with mix of public/private visibility", () => {
      // Act
      const applications = getAllApplications(true); // Get all apps (authenticated)

      // Assert
      expect(applications.length).toBeGreaterThanOrEqual(10);

      // Check for mix of public and private
      const publicApps = applications.filter(
        (app) => app.visibility === "public"
      );
      const privateApps = applications.filter(
        (app) => app.visibility === "private"
      );

      expect(publicApps.length).toBeGreaterThan(0);
      expect(privateApps.length).toBeGreaterThan(0);

      // Verify all required fields
      applications.forEach((app) => {
        expect(app.appId).toBeDefined();
        expect(typeof app.appId).toBe("string");

        expect(app.userId).toBeDefined();
        expect(typeof app.userId).toBe("string");

        expect(app.userName).toBeDefined();
        expect(typeof app.userName).toBe("string");

        expect(app.name).toBeDefined();
        expect(typeof app.name).toBe("string");

        expect(app.description).toBeDefined();
        expect(typeof app.description).toBe("string");

        expect(app.appUrl).toBeDefined();
        expect(typeof app.appUrl).toBe("string");

        expect(app.tags).toBeDefined();
        expect(Array.isArray(app.tags)).toBe(true);
        expect(app.tags.length).toBeGreaterThan(0);

        expect(app.visibility).toBeDefined();
        expect(["public", "private"]).toContain(app.visibility);

        expect(app.createdAt).toBeDefined();
        expect(typeof app.createdAt).toBe("string");
      });
    });
  });

  describe("GIVEN a user ID exists in mock data", () => {
    it("WHEN I request that user's profile THEN I should receive the correct user profile", () => {
      // Arrange
      const allUsers = getAllUsers();
      const expectedUser = allUsers[0];

      // Act
      const user = getUserById(expectedUser.userId);

      // Assert
      expect(user).toBeDefined();
      expect(user?.userId).toBe(expectedUser.userId);
      expect(user?.firstName).toBe(expectedUser.firstName);
      expect(user?.lastName).toBe(expectedUser.lastName);
      expect(user?.awsBuilderHandle).toBe(expectedUser.awsBuilderHandle);
    });

    it("WHEN I request a non-existent user ID THEN I should receive undefined", () => {
      // Act
      const user = getUserById("non-existent-user-id");

      // Assert
      expect(user).toBeUndefined();
    });
  });

  describe("GIVEN applications exist for a user", () => {
    it("WHEN I request applications by user ID with authentication THEN I should receive both public and private applications for that user", () => {
      // Arrange
      const allApps = getAllApplications(true);
      const userWithApps = allApps.find((app) => app.visibility === "private");
      expect(userWithApps).toBeDefined();
      const userId = userWithApps!.userId;

      // Act
      const userApps = getApplicationsByUserId(userId, true);

      // Assert
      expect(userApps.length).toBeGreaterThan(0);

      // All apps should belong to the user
      userApps.forEach((app) => {
        expect(app.userId).toBe(userId);
      });

      // Check if we have both public and private apps for this user
      const allUserApps = allApps.filter((app) => app.userId === userId);
      const hasPublic = allUserApps.some((app) => app.visibility === "public");
      const hasPrivate = allUserApps.some(
        (app) => app.visibility === "private"
      );

      if (hasPublic && hasPrivate) {
        // If user has both types, verify we get both
        const publicApps = userApps.filter(
          (app) => app.visibility === "public"
        );
        const privateApps = userApps.filter(
          (app) => app.visibility === "private"
        );
        expect(publicApps.length).toBeGreaterThan(0);
        expect(privateApps.length).toBeGreaterThan(0);
      }
    });

    it("WHEN I request applications by user ID without authentication THEN I should receive only public applications for that user", () => {
      // Arrange
      const allApps = getAllApplications(true);
      // Find a user who has both public and private apps
      const userIds = [...new Set(allApps.map((app) => app.userId))];
      let testUserId: string | undefined;

      for (const userId of userIds) {
        const userApps = allApps.filter((app) => app.userId === userId);
        const hasPublic = userApps.some((app) => app.visibility === "public");
        const hasPrivate = userApps.some((app) => app.visibility === "private");

        if (hasPublic && hasPrivate) {
          testUserId = userId;
          break;
        }
      }

      expect(testUserId).toBeDefined();

      // Act
      const userApps = getApplicationsByUserId(testUserId!, false);

      // Assert
      expect(userApps.length).toBeGreaterThan(0);

      // All apps should be public
      userApps.forEach((app) => {
        expect(app.userId).toBe(testUserId);
        expect(app.visibility).toBe("public");
      });

      // Verify private apps are filtered out
      const allUserApps = allApps.filter((app) => app.userId === testUserId);
      const privateCount = allUserApps.filter(
        (app) => app.visibility === "private"
      ).length;
      expect(privateCount).toBeGreaterThan(0); // Ensure there are private apps to filter
      expect(userApps.length).toBeLessThan(allUserApps.length); // Fewer apps returned
    });
  });

  describe("Visibility filtering", () => {
    it("WHEN unauthenticated user requests all applications THEN only public applications are returned", () => {
      // Act
      const apps = getAllApplications(false);

      // Assert
      expect(apps.length).toBeGreaterThan(0);
      apps.forEach((app) => {
        expect(app.visibility).toBe("public");
      });
    });

    it("WHEN authenticated user requests all applications THEN both public and private applications are returned", () => {
      // Act
      const apps = getAllApplications(true);

      // Assert
      expect(apps.length).toBeGreaterThan(0);

      const publicApps = apps.filter((app) => app.visibility === "public");
      const privateApps = apps.filter((app) => app.visibility === "private");

      expect(publicApps.length).toBeGreaterThan(0);
      expect(privateApps.length).toBeGreaterThan(0);
    });
  });
});
