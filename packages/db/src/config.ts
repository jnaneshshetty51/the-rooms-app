const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
];

const optionalEnvVars = [
    'REDIS_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
];

export function validateEnv() {
    const missing = requiredEnvVars.filter(v => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Warn about missing optional
    const missingOptional = optionalEnvVars.filter(v => !process.env[v]);
    if (missingOptional.length > 0) {
        console.warn(`Missing optional environment variables: ${missingOptional.join(', ')}`);
    }
}

// Call at app startup
validateEnv();
