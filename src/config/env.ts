/**
 * Environment configuration for API endpoints and external services
 */

interface EnvironmentConfig {
  apiBaseUrl: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoRegion: string;
  cognitoDomain: string;
  isDevelopment: boolean;
  isProduction: boolean;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key] || defaultValue;
  if (!value) {
    console.warn(`Environment variable ${key} is not set`);
  }
  return value || "";
};

export const env: EnvironmentConfig = {
  apiBaseUrl: getEnvVar("VITE_API_BASE_URL", "http://localhost:3000"),
  cognitoUserPoolId: getEnvVar("VITE_COGNITO_USER_POOL_ID", ""),
  cognitoClientId: getEnvVar("VITE_COGNITO_CLIENT_ID", ""),
  cognitoRegion: getEnvVar("VITE_COGNITO_REGION", "us-east-1"),
  cognitoDomain: getEnvVar("VITE_COGNITO_DOMAIN", ""),
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export default env;
