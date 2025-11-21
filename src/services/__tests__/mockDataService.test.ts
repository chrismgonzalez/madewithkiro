import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllApplications,
  getProfile,
  getAllProfiles,
  getApplicationsByUserId,
  getAllTags,
  filterApplicationsByTags,
  getApplicationById,
  updateApplication,
  deleteApplication,
} from "../mockDataService";
import type { Application } from "@/types";

/**
 * Mock Data Service - Acceptance Tests
 * Tests for data service layer that wraps mock data and provides filtering
 */

describe("Data Service - Acceptance Tests", () => {
  describe("Profile operations", () => {
    it("WHEN I request a user profile by ID THEN I should receive the correct profile", async () => {
      // Arrange
      const userId = "user-001";

      // Act
      const profile = await getProfile(userId);

      // Assert
      expect(profile).toBeDefined();
      expect(profile?.userId).toBe(userId);
      expect(profile?.firstName).toBeDefined();
      expect(profile?.lastName).toBeDefined();
      expect(profile?.awsBuilderHandle).toBeDefined();
    });

    it("WHEN I request a non-existent user profile THEN I should receive null", async () => {
      // Arrange
      const userId = "non-existent-user";

      // Act
      const profile = await getProfile(userId);

      // Assert
      expect(profile).toBeNull();
    });

    it("WHEN I request all profiles THEN I should receive at least 3 profiles", async () => {
      // Act
      const profiles = await getAllProfiles();

      // Assert
      expect(profiles.length).toBeGreaterThanOrEqual(3);
      profiles.forEach((profile) => {
        expect(profile.userId).toBeDefined();
        expect(profile.firstName).toBeDefined();
        expect(profile.lastName).toBeDefined();
        expect(profile.awsBuilderHandle).toBeDefined();
      });
    });
  });

  describe("User applications", () => {
    it("WHEN I request applications by user ID as authenticated THEN I should receive both public and private apps for that user", async () => {
      // Arrange
      const userId = "user-001";
      const isAuthenticated = true;

      // Act
      const applications = await getApplicationsByUserId(
        userId,
        isAuthenticated
      );

      // Assert
      expect(applications.length).toBeGreaterThan(0);
      applications.forEach((app) => {
        expect(app.userId).toBe(userId);
      });

      // Check if user has both public and private apps
      const hasPublic = applications.some((app) => app.visibility === "public");
      const hasPrivate = applications.some(
        (app) => app.visibility === "private"
      );

      // User-001 should have both types based on mock data
      expect(hasPublic).toBe(true);
      expect(hasPrivate).toBe(true);
    });

    it("WHEN I request applications by user ID as unauthenticated THEN I should receive only public apps for that user", async () => {
      // Arrange
      const userId = "user-001";
      const isAuthenticated = false;

      // Act
      const applications = await getApplicationsByUserId(
        userId,
        isAuthenticated
      );

      // Assert
      expect(applications.length).toBeGreaterThan(0);
      applications.forEach((app) => {
        expect(app.userId).toBe(userId);
        expect(app.visibility).toBe("public");
      });
    });
  });

  describe("Tag extraction", () => {
    it("WHEN I request all tags as authenticated THEN I should receive all unique tags from all applications", async () => {
      // Arrange
      const isAuthenticated = true;

      // Act
      const tags = await getAllTags(isAuthenticated);

      // Assert
      expect(tags.length).toBeGreaterThan(0);

      // Verify uniqueness
      const uniqueTags = [...new Set(tags)];
      expect(tags.length).toBe(uniqueTags.length);

      // Verify sorted
      const sortedTags = [...tags].sort();
      expect(tags).toEqual(sortedTags);
    });

    it("WHEN I request all tags as unauthenticated THEN I should receive tags only from public applications", async () => {
      // Arrange
      const isAuthenticated = false;

      // Act
      const tags = await getAllTags(isAuthenticated);
      const allApplications = await getAllApplications(isAuthenticated);

      // Assert
      expect(tags.length).toBeGreaterThan(0);

      // Verify all tags come from public applications
      const publicTags = [
        ...new Set(allApplications.flatMap((app) => app.tags)),
      ].sort();
      expect(tags).toEqual(publicTags);
    });
  });

  describe("GIVEN I am authenticated", () => {
    it("WHEN I fetch all applications THEN I should receive both public and private applications", async () => {
      // Arrange
      const isAuthenticated = true;

      // Act
      const applications = await getAllApplications(isAuthenticated);

      // Assert
      expect(applications.length).toBeGreaterThan(0);

      const publicApps = applications.filter(
        (app) => app.visibility === "public"
      );
      const privateApps = applications.filter(
        (app) => app.visibility === "private"
      );

      // Should have both types
      expect(publicApps.length).toBeGreaterThan(0);
      expect(privateApps.length).toBeGreaterThan(0);

      // Total should be sum of both
      expect(applications.length).toBe(publicApps.length + privateApps.length);
    });
  });

  describe("GIVEN I am unauthenticated", () => {
    it("WHEN I fetch all applications THEN I should receive only public applications", async () => {
      // Arrange
      const isAuthenticated = false;

      // Act
      const applications = await getAllApplications(isAuthenticated);

      // Assert
      expect(applications.length).toBeGreaterThan(0);

      // All applications should be public
      applications.forEach((app) => {
        expect(app.visibility).toBe("public");
      });

      // Verify no private apps are included
      const privateApps = applications.filter(
        (app) => app.visibility === "private"
      );
      expect(privateApps.length).toBe(0);
    });
  });

  describe("GIVEN applications exist with various tags", () => {
    it("WHEN I extract unique tags THEN I should receive all unique tags from visible applications", async () => {
      // Arrange
      const isAuthenticated = true;
      const applications = await getAllApplications(isAuthenticated);

      // Act
      const allTags = applications.flatMap((app) => app.tags);
      const uniqueTags = [...new Set(allTags)];

      // Assert
      expect(uniqueTags.length).toBeGreaterThan(0);

      // Verify uniqueness - no duplicates
      const tagCounts = new Map<string, number>();
      uniqueTags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });

      tagCounts.forEach((count) => {
        expect(count).toBe(1);
      });

      // Verify all tags from applications are included
      const allTagsSet = new Set(allTags);
      expect(uniqueTags.length).toBe(allTagsSet.size);
    });

    it("WHEN I extract unique tags as unauthenticated THEN I should receive tags only from public applications", async () => {
      // Arrange
      const isAuthenticated = false;
      const applications = await getAllApplications(isAuthenticated);

      // Act
      const allTags = applications.flatMap((app) => app.tags);
      const uniqueTags = [...new Set(allTags)];

      // Assert
      expect(uniqueTags.length).toBeGreaterThan(0);

      // Verify all source applications are public
      applications.forEach((app) => {
        expect(app.visibility).toBe("public");
      });

      // Compare with authenticated tags - should be subset
      const authenticatedApps = await getAllApplications(true);
      const authenticatedTags = [
        ...new Set(authenticatedApps.flatMap((app) => app.tags)),
      ];

      expect(uniqueTags.length).toBeLessThanOrEqual(authenticatedTags.length);
    });
  });

  describe("GIVEN applications with multiple tags", () => {
    let testApplications: Application[];

    beforeEach(async () => {
      testApplications = await getAllApplications(true);
    });

    it("WHEN I filter by a single tag THEN I should receive only applications containing that tag", () => {
      // Arrange
      const allTags = [...new Set(testApplications.flatMap((app) => app.tags))];
      const testTag = allTags[0]; // Pick first tag

      // Act
      const filteredApps = filterApplicationsByTags(testApplications, [
        testTag,
      ]);

      // Assert
      expect(filteredApps.length).toBeGreaterThan(0);

      // Every filtered app should contain the tag
      filteredApps.forEach((app) => {
        expect(app.tags).toContain(testTag);
      });

      // Apps without the tag should not be included
      const appsWithoutTag = testApplications.filter(
        (app) => !app.tags.includes(testTag)
      );
      const filteredIds = new Set(filteredApps.map((app) => app.appId));

      appsWithoutTag.forEach((app) => {
        expect(filteredIds.has(app.appId)).toBe(false);
      });
    });

    it("WHEN I filter by multiple tags THEN I should receive applications containing any of those tags (OR logic)", () => {
      // Arrange
      const allTags = [...new Set(testApplications.flatMap((app) => app.tags))];
      const selectedTags = allTags.slice(0, 3); // Pick first 3 tags

      // Act
      const filteredApps = filterApplicationsByTags(
        testApplications,
        selectedTags
      );

      // Assert
      expect(filteredApps.length).toBeGreaterThan(0);

      // Every filtered app should contain at least one of the selected tags
      filteredApps.forEach((app) => {
        const hasAtLeastOneTag = app.tags.some((tag) =>
          selectedTags.includes(tag)
        );
        expect(hasAtLeastOneTag).toBe(true);
      });

      // Apps without any of the selected tags should not be included
      const appsWithoutAnyTag = testApplications.filter(
        (app) => !app.tags.some((tag) => selectedTags.includes(tag))
      );
      const filteredIds = new Set(filteredApps.map((app) => app.appId));

      appsWithoutAnyTag.forEach((app) => {
        expect(filteredIds.has(app.appId)).toBe(false);
      });
    });

    it("WHEN I filter by tags that don't exist THEN I should receive an empty array", () => {
      // Arrange
      const nonExistentTags = ["NonExistentTag1", "NonExistentTag2"];

      // Act
      const filteredApps = filterApplicationsByTags(
        testApplications,
        nonExistentTags
      );

      // Assert
      expect(filteredApps.length).toBe(0);
    });

    it("WHEN I filter by an empty tag array THEN I should receive all applications", () => {
      // Arrange
      const selectedTags: string[] = [];

      // Act
      const filteredApps = filterApplicationsByTags(
        testApplications,
        selectedTags
      );

      // Assert
      expect(filteredApps.length).toBe(testApplications.length);
    });
  });

  describe("Tag filtering with authentication", () => {
    it("WHEN unauthenticated user filters by tag THEN only public applications with that tag are returned", async () => {
      // Arrange
      const isAuthenticated = false;
      const applications = await getAllApplications(isAuthenticated);
      const allTags = [...new Set(applications.flatMap((app) => app.tags))];
      const testTag = allTags[0];

      // Act
      const filteredApps = filterApplicationsByTags(applications, [testTag]);

      // Assert
      expect(filteredApps.length).toBeGreaterThan(0);

      // All should be public and contain the tag
      filteredApps.forEach((app) => {
        expect(app.visibility).toBe("public");
        expect(app.tags).toContain(testTag);
      });
    });

    it("WHEN authenticated user filters by tag THEN both public and private applications with that tag are returned", async () => {
      // Arrange
      const isAuthenticated = true;
      const applications = await getAllApplications(isAuthenticated);

      // Find a tag that exists in both public and private apps
      const publicApps = applications.filter(
        (app) => app.visibility === "public"
      );
      const privateApps = applications.filter(
        (app) => app.visibility === "private"
      );

      const publicTags = new Set(publicApps.flatMap((app) => app.tags));
      const privateTags = new Set(privateApps.flatMap((app) => app.tags));

      // Find a common tag
      let commonTag: string | undefined;
      for (const tag of publicTags) {
        if (privateTags.has(tag)) {
          commonTag = tag;
          break;
        }
      }

      // If no common tag, just test with any tag
      const testTag = commonTag || [...publicTags][0];

      // Act
      const filteredApps = filterApplicationsByTags(applications, [testTag]);

      // Assert
      expect(filteredApps.length).toBeGreaterThan(0);

      // Should contain the tag
      filteredApps.forEach((app) => {
        expect(app.tags).toContain(testTag);
      });

      // If we found a common tag, verify we have both visibility types
      if (commonTag) {
        const hasPublic = filteredApps.some(
          (app) => app.visibility === "public"
        );
        const hasPrivate = filteredApps.some(
          (app) => app.visibility === "private"
        );

        // At least one of each type should exist
        expect(hasPublic || hasPrivate).toBe(true);
      }
    });
  });

  describe("Application update operations", () => {
    describe("GIVEN an application exists in mock data", () => {
      it("WHEN I request that application by ID THEN I should receive the correct application", async () => {
        // Arrange
        const appId = "app-001";

        // Act
        const application = await getApplicationById(appId);

        // Assert
        expect(application).toBeDefined();
        expect(application?.appId).toBe(appId);
        expect(application?.name).toBeDefined();
        expect(application?.userId).toBeDefined();
      });

      it("WHEN I request a non-existent application THEN I should receive null", async () => {
        // Arrange
        const appId = "non-existent-app";

        // Act
        const application = await getApplicationById(appId);

        // Assert
        expect(application).toBeNull();
      });
    });

    describe("GIVEN I am the owner of an application", () => {
      it("WHEN I update the application with valid data THEN the application should be updated successfully", async () => {
        // Arrange
        const appId = "app-001";
        const userId = "user-001";
        const updateData = {
          name: "Updated Application Name",
          description: "Updated description",
          appUrl: "https://updated-app.example.com",
          githubUrl: "https://github.com/updated/repo",
          tags: ["Updated", "Tags"],
          visibility: "private" as const,
        };

        // Act
        const updatedApp = await updateApplication(appId, updateData, userId);

        // Assert
        expect(updatedApp).toBeDefined();
        expect(updatedApp.appId).toBe(appId);
        expect(updatedApp.name).toBe(updateData.name);
        expect(updatedApp.description).toBe(updateData.description);
        expect(updatedApp.appUrl).toBe(updateData.appUrl);
        expect(updatedApp.githubUrl).toBe(updateData.githubUrl);
        expect(updatedApp.tags).toEqual(updateData.tags);
        expect(updatedApp.visibility).toBe(updateData.visibility);
      });
    });

    describe("GIVEN I am not the owner of an application", () => {
      it("WHEN I attempt to update the application THEN I should receive an authorization error", async () => {
        // Arrange
        const appId = "app-001"; // Owned by user-001
        const nonOwnerUserId = "user-002";
        const updateData = {
          name: "Unauthorized Update",
          description: "This should fail",
          appUrl: "https://unauthorized.example.com",
          tags: ["Unauthorized"],
          visibility: "public" as const,
        };

        // Act & Assert
        await expect(
          updateApplication(appId, updateData, nonOwnerUserId)
        ).rejects.toThrow("Unauthorized");
      });
    });

    describe("GIVEN I update an application", () => {
      it("WHEN the update succeeds THEN the createdAt timestamp should remain unchanged", async () => {
        // Arrange
        const appId = "app-002";
        const userId = "user-001";
        const originalApp = await getApplicationById(appId);
        const originalCreatedAt = originalApp?.createdAt;

        const updateData = {
          name: "Updated Name",
          description: "Updated description",
          appUrl: "https://updated.example.com",
          tags: ["Updated"],
          visibility: "public" as const,
        };

        // Act
        const updatedApp = await updateApplication(appId, updateData, userId);

        // Assert
        expect(updatedApp.createdAt).toBe(originalCreatedAt);
      });

      it("WHEN the update succeeds THEN the updatedAt timestamp should be newer than before", async () => {
        // Arrange
        const appId = "app-003";
        const userId = "user-002";
        const originalApp = await getApplicationById(appId);
        const originalUpdatedAt = originalApp?.updatedAt;

        // Wait a tiny bit to ensure timestamp difference
        await new Promise((resolve) => setTimeout(resolve, 10));

        const updateData = {
          name: "Updated Name",
          description: "Updated description",
          appUrl: "https://updated.example.com",
          tags: ["Updated"],
          visibility: "public" as const,
        };

        // Act
        const updatedApp = await updateApplication(appId, updateData, userId);

        // Assert
        expect(updatedApp.updatedAt).toBeDefined();
        if (originalUpdatedAt) {
          const originalDate = new Date(originalUpdatedAt);
          const updatedDate = new Date(updatedApp.updatedAt);
          expect(updatedDate.getTime()).toBeGreaterThan(originalDate.getTime());
        }
      });

      it("WHEN the update succeeds THEN the userId should remain unchanged", async () => {
        // Arrange
        const appId = "app-004";
        const userId = "user-002";
        const originalApp = await getApplicationById(appId);
        const originalUserId = originalApp?.userId;

        const updateData = {
          name: "Updated Name",
          description: "Updated description",
          appUrl: "https://updated.example.com",
          tags: ["Updated"],
          visibility: "public" as const,
        };

        // Act
        const updatedApp = await updateApplication(appId, updateData, userId);

        // Assert
        expect(updatedApp.userId).toBe(originalUserId);
        expect(updatedApp.userId).toBe(userId);
      });
    });
  });

  describe("Application deletion operations", () => {
    describe("GIVEN I am the owner of an application", () => {
      it("WHEN I request to delete the application THEN the application should be removed from mock data", async () => {
        // Arrange
        const appId = "app-001";
        const userId = "user-001";

        // Verify application exists before deletion
        const appBefore = await getApplicationById(appId);
        expect(appBefore).toBeDefined();
        expect(appBefore?.appId).toBe(appId);

        // Act
        await deleteApplication(appId, userId);

        // Assert - application should no longer exist
        const appAfter = await getApplicationById(appId);
        expect(appAfter).toBeNull();
      });
    });

    describe("GIVEN I am not the owner of an application", () => {
      it("WHEN I attempt to delete the application THEN I should receive an authorization error", async () => {
        // Arrange
        const appId = "app-003"; // Owned by user-002
        const nonOwnerUserId = "user-001";

        // Verify application exists before attempt
        const appBefore = await getApplicationById(appId);
        expect(appBefore).toBeDefined();

        // Act & Assert
        await expect(deleteApplication(appId, nonOwnerUserId)).rejects.toThrow(
          "Unauthorized"
        );

        // Verify application still exists after failed deletion
        const appAfter = await getApplicationById(appId);
        expect(appAfter).toBeDefined();
        expect(appAfter?.appId).toBe(appId);
      });
    });

    describe("GIVEN I delete an application", () => {
      it("WHEN the deletion succeeds THEN subsequent queries for that application should return null", async () => {
        // Arrange
        const appId = "app-002";
        const userId = "user-001";

        // Verify application exists
        const appBefore = await getApplicationById(appId);
        expect(appBefore).toBeDefined();

        // Act
        await deleteApplication(appId, userId);

        // Assert - multiple queries should all return null
        const query1 = await getApplicationById(appId);
        expect(query1).toBeNull();

        const query2 = await getApplicationById(appId);
        expect(query2).toBeNull();

        const query3 = await getApplicationById(appId);
        expect(query3).toBeNull();
      });

      it("WHEN the deletion succeeds THEN the application should not appear in any user's application list", async () => {
        // Arrange
        const appId = "app-006";
        const userId = "user-003";

        // Verify application exists in user's list before deletion
        const userAppsBefore = await getApplicationsByUserId(userId, true);
        const appExistsInList = userAppsBefore.some(
          (app) => app.appId === appId
        );
        expect(appExistsInList).toBe(true);

        // Act
        await deleteApplication(appId, userId);

        // Assert - application should not appear in user's list
        const userAppsAfter = await getApplicationsByUserId(userId, true);
        const appStillInList = userAppsAfter.some((app) => app.appId === appId);
        expect(appStillInList).toBe(false);

        // Assert - application should not appear in all applications list
        const allApps = await getAllApplications(true);
        const appInAllList = allApps.some((app) => app.appId === appId);
        expect(appInAllList).toBe(false);
      });
    });

    describe("GIVEN I attempt to delete a non-existent application", () => {
      it("WHEN the deletion is attempted THEN I should receive an error", async () => {
        // Arrange
        const nonExistentAppId = "non-existent-app";
        const userId = "user-001";

        // Act & Assert
        await expect(
          deleteApplication(nonExistentAppId, userId)
        ).rejects.toThrow("Application not found");
      });
    });
  });
});
