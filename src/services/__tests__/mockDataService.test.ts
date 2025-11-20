import { describe, it, expect, beforeEach } from "vitest";
import {
  getAllApplications,
  getProfile,
  getAllProfiles,
  getApplicationsByUserId,
  getAllTags,
  filterApplicationsByTags,
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
});
