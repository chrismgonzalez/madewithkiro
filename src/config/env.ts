/**
 * Environment configuration for API endpoints and external services
 */

interface EnvironmentConfig {
  apiBaseUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
  cognitoDomain: string;
  environment: "development" | "production";
  isDevelopment: boolean;
  isProduction: boolean;
}

class EnvironmentValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvironmentValidationError";
  }
}

const getEnvVar = (key: string, required: boolean = false): string => {
  const value = import.meta.env[key];

  if (!value && required) {
    throw new EnvironmentValidationError(
      `Missing required environment variable: ${key}. Please check your .env file.`
    );
  }

  return value || "";
};

const validateConfig = (config: EnvironmentConfig): void => {
  const requiredFields: (keyof EnvironmentConfig)[] = [
    "apiBaseUrl",
    "cognitoUserPoolId",
    "cognitoClientId",
    "cognitoRegion",
  ];

  const missingFields = requiredFields.filter((field) => !config[field]);

  if (missingFields.length > 0) {
    throw new EnvironmentValidationError(
      `Missing required environment variables: ${missingFields.join(", ")}. ` +
        `Please ensure all required variables are set in your .env file.`
    );
  }

  // Validate URL format
  try {
    new URL(config.apiBaseUrl);
  } catch {
    throw new EnvironmentValidationError(
      `Invalid API base URL: ${config.apiBaseUrl}. Must be a valid URL.`
    );
  }

  // Validate Cognito region format
  const regionPattern = /^[a-z]{2}-[a-z]+-\d{1}$/;
  if (!regionPattern.test(config.cognitoRegion)) {
    throw new EnvironmentValidationError(
      `Invalid Cognito region: ${config.cognitoRegion}. Must be in format like 'us-east-1'.`
    );
  }
};

const createConfig = (): EnvironmentConfig => {
  const config: EnvironmentConfig = {
    apiBaseUrl:
      getEnvVar("VITE_API_BASE_URL", true) || getEnvVar("VITE_API_URL", true),
    cognitoUserPoolId: getEnvVar("VITE_USER_POOL_ID", true),
    cognitoClientId: getEnvVar("VITE_USER_POOL_CLIENT_ID", true),
    cognitoRegion: getEnvVar("VITE_AWS_REGION", true),
    cognitoDomain: getEnvVar("VITE_COGNITO_DOMAIN", false),
    environment:
      import.meta.env.MODE === "production" ? "production" : "development",
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
  };

  validateConfig(config);

  return config;
};

export const env: EnvironmentConfig = createConfig();

export default env;
