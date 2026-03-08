#!/usr/bin/env node

/**
 * Omnia Light Scape Pro - Setup Verification Script
 *
 * This script verifies that all required environment variables are configured
 * before you begin development.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkEnvFile() {
  const envPath = path.join(__dirname, '.env');

  log('\nðŸ” Checking .env file...', 'cyan');

  if (!fs.existsSync(envPath)) {
    log('âŒ .env file not found!', 'red');
    log('   Run: cp .env.example .env', 'yellow');
    return false;
  }

  log('âœ… .env file exists', 'green');

  const envContent = fs.readFileSync(envPath, 'utf-8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].trim();
    }
  });

  return envVars;
}

function verifyRequiredVars(envVars) {
  log('\nðŸ“‹ Verifying required environment variables...', 'cyan');

  const required = {
    'VITE_GEMINI_API_KEY': {
      description: 'Gemini AI API Key',
      example: 'AIza...',
      url: 'https://aistudio.google.com/app/apikey'
    },
    'VITE_CLERK_PUBLISHABLE_KEY': {
      description: 'Clerk Publishable Key',
      example: '[REDACTED_CLERK_PUBLISHABLE_KEY]',
      url: 'https://clerk.com'
    },
    'VITE_STRIPE_PUBLISHABLE_KEY': {
      description: 'Stripe Publishable Key',
      example: '[REDACTED_CLERK_PUBLISHABLE_KEY]',
      url: 'https://stripe.com'
    },
    'VITE_STRIPE_PRICE_ID_MONTHLY': {
      description: 'Stripe Monthly Price ID ($250/month)',
      example: 'price_...',
      url: 'https://dashboard.stripe.com/products'
    },
    'VITE_STRIPE_PRICE_ID_YEARLY': {
      description: 'Stripe Yearly Price ID ($2000/year)',
      example: 'price_...',
      url: 'https://dashboard.stripe.com/products'
    }
  };

  let allConfigured = true;
  let missingCount = 0;

  for (const [key, config] of Object.entries(required)) {
    const value = envVars[key];

    if (!value || value === '') {
      log(`âŒ ${key}`, 'red');
      log(`   Description: ${config.description}`, 'yellow');
      log(`   Example: ${config.example}`, 'yellow');
      log(`   Get it: ${config.url}`, 'blue');
      console.log('');
      allConfigured = false;
      missingCount++;
    } else {
      log(`âœ… ${key}`, 'green');
    }
  }

  return { allConfigured, missingCount };
}

function checkGitignore() {
  log('\nðŸ”’ Checking .gitignore security...', 'cyan');

  const gitignorePath = path.join(__dirname, '.gitignore');

  if (!fs.existsSync(gitignorePath)) {
    log('âŒ .gitignore not found!', 'red');
    return false;
  }

  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

  const requiredEntries = ['.env', '.env.local', 'local-backup/'];
  let allPresent = true;

  requiredEntries.forEach(entry => {
    if (gitignoreContent.includes(entry)) {
      log(`âœ… ${entry} is ignored`, 'green');
    } else {
      log(`âŒ ${entry} is NOT ignored (security risk!)`, 'red');
      allPresent = false;
    }
  });

  return allPresent;
}

function checkPackageJson() {
  log('\nðŸ“¦ Checking dependencies...', 'cyan');

  const packagePath = path.join(__dirname, 'package.json');

  if (!fs.existsSync(packagePath)) {
    log('âŒ package.json not found!', 'red');
    return false;
  }

  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  const required = {
    '@clerk/clerk-react': 'Authentication',
    'react': 'UI Framework',
    '@google/genai': 'AI Image Generation'
  };

  let allInstalled = true;

  for (const [dep, description] of Object.entries(required)) {
    if (deps[dep]) {
      log(`âœ… ${dep} (${description})`, 'green');
    } else {
      log(`âŒ ${dep} missing (${description})`, 'red');
      allInstalled = false;
    }
  }

  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    log('\nâš ï¸  node_modules not found. Run: npm install', 'yellow');
    return false;
  }

  return allInstalled;
}

function printNextSteps(missingCount) {
  log('\n' + '='.repeat(60), 'cyan');
  log('ðŸ“ NEXT STEPS', 'cyan');
  log('='.repeat(60), 'cyan');

  if (missingCount > 0) {
    log(`\nâš ï¸  ${missingCount} environment variable(s) need to be configured\n`, 'yellow');

    log('1. ðŸš¨ URGENT: Revoke exposed API key', 'red');
    log('   Go to: https://aistudio.google.com/app/apikey', 'blue');
    log('   Delete key: [REDACTED_GEMINI_API_KEY]\n');

    log('2. Generate NEW Gemini API key', 'yellow');
    log('   Add to .env: VITE_GEMINI_API_KEY=your_new_key\n');

    log('3. Sign up for Clerk (https://clerk.com)', 'yellow');
    log('   Add to .env: VITE_CLERK_PUBLISHABLE_KEY=[REDACTED_CLERK_PUBLISHABLE_KEY]\n');

    log('4. Sign up for Stripe (https://stripe.com)', 'yellow');
    log('   Create products: $250/month and $2000/year');
    log('   Add price IDs to .env\n');

    log('5. Run this script again: node verify-setup.js\n', 'green');
  } else {
    log('\nâœ… All environment variables configured!', 'green');
    log('\nYou\'re ready to start development:', 'cyan');
    log('  1. npm install (if not done)', 'blue');
    log('  2. npm run dev', 'blue');
    log('  3. Open http://localhost:5173\n', 'blue');

    log('ðŸ“– See IMPLEMENTATION_GUIDE.md for next phases', 'cyan');
  }
}

// Main execution
function main() {
  log('\n' + '='.repeat(60), 'cyan');
  log('ðŸš€ Omnia Light Scape Pro - Setup Verification', 'cyan');
  log('='.repeat(60), 'cyan');

  const envVars = checkEnvFile();
  if (!envVars) {
    process.exit(1);
  }

  const { allConfigured, missingCount } = verifyRequiredVars(envVars);
  checkGitignore();
  checkPackageJson();

  printNextSteps(missingCount);

  if (!allConfigured) {
    log('\nâŒ Setup incomplete. Please configure missing variables.\n', 'red');
    process.exit(1);
  } else {
    log('\nâœ… Setup complete! Ready to build.\n', 'green');
    process.exit(0);
  }
}

main();

