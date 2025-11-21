import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * Acceptance Tests for Environment Configuration
 * Requirements: 11.1, 11.2, 11.3
 */

describe("Environment Configuration - Acceptance Tests", () => {
  let originalEnv: Record<string, any>;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...import.meta.env };
    vi.resetModules();
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(import.meta.env).forEach((key) => {
      delete (import.meta.env as any)[key];
    });
    Object.assign(import.meta.env, originalEnv);
  });

  describe("Development Environment", () => {
    /**
     * GIVEN the frontend application builds for development
     * WHEN the build process runs
     * THEN the system should use the API Gateway URL from the development environment variables
     * Requirements: 11.1
     */
    it("should use development API Gateway URL when building for development", async () => {
      // Arrange: Set up development environment variables
      const developmentApiUrl = "https://dev-api.madewithkiro.com";
      import.meta.env.VITE_API_BASE_URL = developmentApiUrl;
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-west-2_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "dev-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-west-2";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act: Import the env module
      const { env } = await import("../env");

      // Assert: Verify development API URL is used
      expect(env.apiBaseUrl).toBe(developmentApiUrl);
      expect(env.environment).toBe("development");
      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
    });

    it("should load all development environment variables correctly", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://dev-api.madewithkiro.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-west-2_devpool";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "dev-client-123";
      import.meta.env.VITE_COGNITO_REGION = "us-west-2";
      import.meta.env.VITE_COGNITO_DOMAIN =
        "https://dev.auth.us-west-2.amazoncognito.com";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act
      const { env } = await import("../env");

      // Assert
      expect(env.cognitoUserPoolId).toBe("us-west-2_devpool");
      expect(env.cognitoClientId).toBe("dev-client-123");
      expect(env.cognitoRegion).toBe("us-west-2");
      expect(env.cognitoDomain).toBe(
        "https://dev.auth.us-west-2.amazoncognito.com"
      );
    });
  });

  describe("Production Environment", () => {
    /**
     * GIVEN the frontend application builds for production
     * WHEN the build process runs
     * THEN the system should use the API Gateway URL from the production environment variables
     * Requirements: 11.2
     */
    it("should use production API Gateway URL when building for production", async () => {
      // Arrange: Set up production environment variables
      const productionApiUrl = "https://api.madewithkiro.com";
      import.meta.env.VITE_API_BASE_URL = productionApiUrl;
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_prod123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "prod-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "production";
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;

      // Act: Import the env module
      const { env } = await import("../env");

      // Assert: Verify production API URL is used
      expect(env.apiBaseUrl).toBe(productionApiUrl);
      expect(env.environment).toBe("production");
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(true);
    });

    it("should load all production environment variables correctly", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://api.madewithkiro.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_prodpool";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "prod-client-456";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.VITE_COGNITO_DOMAIN =
        "https://madewithkiro.auth.us-east-1.amazoncognito.com";
      import.meta.env.MODE = "production";
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;

      // Act
      const { env } = await import("../env");

      // Assert
      expect(env.cognitoUserPoolId).toBe("us-east-1_prodpool");
      expect(env.cognitoClientId).toBe("prod-client-456");
      expect(env.cognitoRegion).toBe("us-east-1");
      expect(env.cognitoDomain).toBe(
        "https://madewithkiro.auth.us-east-1.amazoncognito.com"
      );
    });
  });

  describe("Environment Variable Validation", () => {
    /**
     * GIVEN an environment variable is missing
     * WHEN the application initializes
     * THEN the system should throw a clear error during application initialization
     * Requirements: 11.3
     */
    it("should throw clear error when API base URL is missing", async () => {
      // Arrange: Set up environment without API base URL
      import.meta.env.VITE_API_BASE_URL = "";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert: Verify clear error is thrown
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(
        /Missing required environment variable.*VITE_API_BASE_URL/i
      );
    });

    it("should throw clear error when Cognito User Pool ID is missing", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(
        /Missing required environment variable.*VITE_COGNITO_USER_POOL_ID/i
      );
    });

    it("should throw clear error when Cognito Client ID is missing", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(
        /Missing required environment variable.*VITE_COGNITO_CLIENT_ID/i
      );
    });

    it("should throw clear error when Cognito Region is missing", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(
        /Missing required environment variable.*VITE_COGNITO_REGION/i
      );
    });

    it("should throw clear error when API base URL is invalid", async () => {
      // Arrange: Set up environment with invalid URL
      import.meta.env.VITE_API_BASE_URL = "not-a-valid-url";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(/Invalid API base URL/i);
    });

    it("should throw clear error when Cognito region format is invalid", async () => {
      // Arrange: Set up environment with invalid region format
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "invalid-region";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act & Assert
      await expect(async () => {
        await import("../env");
      }).rejects.toThrow(/Invalid Cognito region/i);
    });

    it("should allow optional Cognito domain to be empty", async () => {
      // Arrange: Set up environment without optional domain
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.VITE_COGNITO_DOMAIN = "";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act
      const { env } = await import("../env");

      // Assert: Should not throw, domain is optional
      expect(env.cognitoDomain).toBe("");
    });
  });

  describe("Environment Switching", () => {
    it("should correctly identify development environment", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://dev-api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "development";
      import.meta.env.DEV = true;
      import.meta.env.PROD = false;

      // Act
      const { env } = await import("../env");

      // Assert
      expect(env.environment).toBe("development");
      expect(env.isDevelopment).toBe(true);
      expect(env.isProduction).toBe(false);
    });

    it("should correctly identify production environment", async () => {
      // Arrange
      import.meta.env.VITE_API_BASE_URL = "https://api.test.com";
      import.meta.env.VITE_COGNITO_USER_POOL_ID = "us-east-1_test123";
      import.meta.env.VITE_COGNITO_CLIENT_ID = "test-client-id";
      import.meta.env.VITE_COGNITO_REGION = "us-east-1";
      import.meta.env.MODE = "production";
      import.meta.env.DEV = false;
      import.meta.env.PROD = true;

      // Act
      const { env } = await import("../env");

      // Assert
      expect(env.environment).toBe("production");
      expect(env.isDevelopment).toBe(false);
      expect(env.isProduction).toBe(true);
    });
  });
});
