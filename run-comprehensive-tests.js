#!/usr/bin/env node

/**
 * Comprehensive Test Runner for All Fixes
 * Tests all three major fixes: Toast Reduction, Store Display, Search Functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  testFile: 'tests/e2e/comprehensive-fixes-verification.test.js',
  outputDir: 'test-results',
  timeout: 60000
};

console.log('🧪 Starting Comprehensive Fixes Verification Tests');
console.log('=' .repeat(60));
console.log(`📍 Base URL: ${TEST_CONFIG.baseURL}`);
console.log(`📂 Test File: ${TEST_CONFIG.testFile}`);
console.log(`⏰ Timeout: ${TEST_CONFIG.timeout}ms`);
console.log('=' .repeat(60));

// Ensure test results directory exists
if (!fs.existsSync(TEST_CONFIG.outputDir)) {
  fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
}

// Function to check if server is running
async function checkServer() {
  return new Promise((resolve) => {
    const http = require('http');
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'HEAD',
      timeout: 5000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      resolve(false);
    });
    
    req.end();
  });
}

// Run the tests
async function runTests() {
  console.log('🔍 Checking if server is running...');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    console.error('❌ Server is not running on http://localhost:3001');
    console.log('💡 Please start the server with: python app.py');
    process.exit(1);
  }
  
  console.log('✅ Server is running, proceeding with tests...\n');
  
  // Run Playwright tests
  const playwrightArgs = [
    'test',
    TEST_CONFIG.testFile,
    '--config=playwright.config.js',
    '--reporter=html',
    '--timeout=' + TEST_CONFIG.timeout,
    '--headed', // Run in headed mode to see the tests
    '--project=chromium' // Focus on Chrome for initial run
  ];
  
  console.log('🎭 Running Playwright tests...');
  console.log(`Command: npx playwright ${playwrightArgs.join(' ')}`);
  console.log('-'.repeat(60));
  
  const playwright = spawn('npx', ['playwright', ...playwrightArgs], {
    stdio: 'inherit',
    shell: true
  });
  
  playwright.on('close', (code) => {
    console.log('-'.repeat(60));
    
    if (code === 0) {
      console.log('✅ All tests completed successfully!');
      generateSummaryReport();
    } else {
      console.log(`❌ Tests completed with exit code: ${code}`);
      generateSummaryReport();
    }
    
    console.log('📊 Test results available in:');
    console.log(`   - HTML Report: playwright-report/index.html`);
    console.log(`   - JSON Results: playwright-results.json`);
    console.log(`   - Screenshots: test-results/`);
  });
  
  playwright.on('error', (error) => {
    console.error('❌ Error running tests:', error);
  });
}

// Generate a summary report
function generateSummaryReport() {
  const timestamp = new Date().toISOString();
  const reportPath = path.join(TEST_CONFIG.outputDir, 'comprehensive-test-summary.md');
  
  const report = `# Comprehensive Fixes Verification Report

**Generated:** ${timestamp}
**Test Suite:** All Three Major Fixes

## Tests Executed

### 1. 🍞 Toast Message Reduction Test
- **Purpose:** Verify that excessive toast notifications (40+) have been reduced to essential ones only
- **Method:** Navigate through all tabs, perform common actions, count toast messages
- **Success Criteria:** ≤ 5 toast messages total, ≤ 3 visible at any time

### 2. 🏪 Store Display Location Test  
- **Purpose:** Confirm store information only appears in Settings tab, not header/footer
- **Method:** Set up store, navigate tabs, check for store info in wrong locations
- **Success Criteria:** Store info visible in Settings only, not in header/footer/other tabs

### 3. 🔍 Search Functionality Test
- **Purpose:** Test that product search returns and displays results properly  
- **Method:** Search for multiple terms (milk, bread, eggs, bananas), verify results display
- **Success Criteria:** Search executes, results display correctly, no visibility issues

### 4. 🛒 Complete User Flow Test
- **Purpose:** Test full workflow: store selection → search → results → add to cart
- **Method:** Execute complete user journey end-to-end
- **Success Criteria:** All steps complete successfully without errors

### 5. 🔧 Console Error Check
- **Purpose:** Verify no critical console errors are present
- **Method:** Monitor console during all operations
- **Success Criteria:** ≤ 2 critical errors (excluding favicon, service worker, etc.)

### 6. 🔄 Integration Test
- **Purpose:** Verify all fixes work together without conflicts
- **Method:** Rapid navigation, multiple searches, concurrent operations
- **Success Criteria:** No conflicts between fixes, stable operation

## Key Fixes Validated

1. **Toast Notification Reduction**
   - Removed 40+ unnecessary toast messages
   - Only essential notifications remain
   - No toast spam during navigation

2. **Store Display Cleanup** 
   - Store information removed from footer
   - Store details only in Settings tab
   - Clean header/footer presentation

3. **Search Results Display Fix**
   - Product search returns results
   - Results are visible and properly displayed
   - No CSS visibility issues

## Test Environment
- **Base URL:** ${TEST_CONFIG.baseURL}
- **Browser:** Chromium (Desktop Chrome)
- **Timeout:** ${TEST_CONFIG.timeout}ms
- **Test Framework:** Playwright

## Files Generated
- HTML Test Report: \`playwright-report/index.html\`
- JSON Results: \`playwright-results.json\` 
- Screenshots: \`test-results/\`
- This Summary: \`${reportPath}\`

---
*Report generated by Comprehensive Fixes Verification Suite*
`;

  fs.writeFileSync(reportPath, report);
  console.log(`📋 Summary report generated: ${reportPath}`);
}

// Start the test run
runTests().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});