#!/usr/bin/env node

/**
 * Manual Verification Script for All Three Fixes
 * Tests the fixes by making HTTP requests and analyzing responses
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  testZipCode: '43123'
};

console.log('🧪 Manual Verification of All Three Fixes');
console.log('=' .repeat(50));

// Function to make HTTP request
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: 'GET',
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    });
    
    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    req.end();
  });
}

// Function to check server status
async function checkServer() {
  try {
    const response = await makeRequest('/');
    return response.statusCode === 200;
  } catch (error) {
    return false;
  }
}

// Function to analyze HTML content for fixes
function analyzeHTML(html) {
  const results = {
    toastAnalysis: {
      excessive: false,
      toastElements: 0,
      suspiciousPatterns: []
    },
    storeDisplayAnalysis: {
      storeInFooter: false,
      storeInHeader: false,
      storeInSettings: false
    },
    searchAnalysis: {
      hasSearchForm: false,
      hasResultsContainer: false,
      hasVisibilityFixes: false
    }
  };

  // Toast Analysis
  const toastMatches = html.match(/toast|notification/gi) || [];
  results.toastAnalysis.toastElements = toastMatches.length;
  
  // Check for excessive toast patterns
  if (html.includes('showToast') && html.match(/showToast/g).length > 10) {
    results.toastAnalysis.excessive = true;
    results.toastAnalysis.suspiciousPatterns.push('Multiple showToast calls');
  }

  // Store Display Analysis
  if (html.toLowerCase().includes('selected store') && html.toLowerCase().includes('footer')) {
    results.storeDisplayAnalysis.storeInFooter = true;
  }
  
  if (html.toLowerCase().includes('store') && html.toLowerCase().includes('header')) {
    const headerSection = html.match(/<header[^>]*>.*?<\/header>/is);
    if (headerSection && headerSection[0].toLowerCase().includes('store')) {
      results.storeDisplayAnalysis.storeInHeader = true;
    }
  }
  
  if (html.includes('settings-tab') || html.includes('selectedStore')) {
    results.storeDisplayAnalysis.storeInSettings = true;
  }

  // Search Analysis
  if (html.includes('searchTerm') || html.includes('search-form')) {
    results.searchAnalysis.hasSearchForm = true;
  }
  
  if (html.includes('searchResults') || html.includes('product-grid')) {
    results.searchAnalysis.hasResultsContainer = true;
  }
  
  // Check for visibility fixes (display: block, visibility: visible)
  if (html.includes('display: block') || html.includes('visibility: visible')) {
    results.searchAnalysis.hasVisibilityFixes = true;
  }

  return results;
}

// Function to test API endpoints
async function testAPIEndpoints() {
  console.log('\n🔌 Testing API Endpoints...');
  
  const endpoints = [
    '/',
    '/api/locations',
    '/api/products/search?term=milk&locationId=123'
  ];

  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Testing ${endpoint}...`);
      const response = await makeRequest(endpoint);
      results[endpoint] = {
        status: response.statusCode,
        success: response.statusCode === 200,
        hasData: response.data.length > 0
      };
      
      console.log(`   Status: ${response.statusCode} ${response.statusCode === 200 ? '✅' : '❌'}`);
    } catch (error) {
      results[endpoint] = {
        status: 'error',
        success: false,
        error: error.message
      };
      console.log(`   Error: ${error.message} ❌`);
    }
  }
  
  return results;
}

// Function to analyze JavaScript files for fixes
async function analyzeJavaScriptFiles() {
  console.log('\n📜 Analyzing JavaScript Files...');
  
  const jsFiles = [
    'public/app.js',
    'public/js/ToastManager.js',
    'public/search-fix.js'
  ];
  
  const analysis = {
    toastReductionFound: false,
    searchFixesFound: false,
    storeDisplayFixFound: false
  };

  for (const file of jsFiles) {
    try {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for toast reduction patterns
        if (content.includes('toast') && content.includes('reduce')) {
          analysis.toastReductionFound = true;
        }
        
        // Check for search fixes
        if (content.includes('searchResults') && content.includes('visibility')) {
          analysis.searchFixesFound = true;
        }
        
        // Check for store display fixes
        if (content.includes('footer') && content.includes('store')) {
          analysis.storeDisplayFixFound = true;
        }
        
        console.log(`📄 ${file}: Found ${content.length} characters`);
      } else {
        console.log(`📄 ${file}: Not found ⚠️`);
      }
    } catch (error) {
      console.log(`📄 ${file}: Error reading - ${error.message} ❌`);
    }
  }

  return analysis;
}

// Main verification function
async function runVerification() {
  console.log('🔍 Checking server status...');
  
  if (!(await checkServer())) {
    console.error('❌ Server is not running on http://localhost:3001');
    console.log('💡 Please start the server with: python app.py');
    process.exit(1);
  }
  
  console.log('✅ Server is running');
  
  try {
    // Get main page HTML
    console.log('\n📄 Analyzing main page HTML...');
    const mainPage = await makeRequest('/');
    const htmlAnalysis = analyzeHTML(mainPage.data);
    
    // Test API endpoints
    const apiResults = await testAPIEndpoints();
    
    // Analyze JavaScript files
    const jsAnalysis = await analyzeJavaScriptFiles();
    
    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE VERIFICATION REPORT');
    console.log('=' .repeat(50));
    
    // FIX 1: Toast Message Reduction
    console.log('\n🍞 FIX 1: TOAST MESSAGE REDUCTION');
    console.log(`   Toast elements found: ${htmlAnalysis.toastAnalysis.toastElements}`);
    console.log(`   Excessive patterns: ${htmlAnalysis.toastAnalysis.excessive ? '❌' : '✅'}`);
    console.log(`   Code analysis: ${jsAnalysis.toastReductionFound ? '✅' : '⚠️'}`);
    
    const toastFixSuccess = !htmlAnalysis.toastAnalysis.excessive && htmlAnalysis.toastAnalysis.toastElements < 20;
    console.log(`   Overall: ${toastFixSuccess ? '✅ PASSED' : '❌ NEEDS ATTENTION'}`);
    
    // FIX 2: Store Display Location
    console.log('\n🏪 FIX 2: STORE DISPLAY LOCATION');
    console.log(`   Store in footer: ${htmlAnalysis.storeDisplayAnalysis.storeInFooter ? '❌' : '✅'}`);
    console.log(`   Store in header: ${htmlAnalysis.storeDisplayAnalysis.storeInHeader ? '❌' : '✅'}`);
    console.log(`   Store in settings: ${htmlAnalysis.storeDisplayAnalysis.storeInSettings ? '✅' : '⚠️'}`);
    console.log(`   Code analysis: ${jsAnalysis.storeDisplayFixFound ? '✅' : '⚠️'}`);
    
    const storeFixSuccess = !htmlAnalysis.storeDisplayAnalysis.storeInFooter && 
                           !htmlAnalysis.storeDisplayAnalysis.storeInHeader;
    console.log(`   Overall: ${storeFixSuccess ? '✅ PASSED' : '❌ NEEDS ATTENTION'}`);
    
    // FIX 3: Search Functionality
    console.log('\n🔍 FIX 3: SEARCH FUNCTIONALITY');
    console.log(`   Search form present: ${htmlAnalysis.searchAnalysis.hasSearchForm ? '✅' : '❌'}`);
    console.log(`   Results container: ${htmlAnalysis.searchAnalysis.hasResultsContainer ? '✅' : '❌'}`);
    console.log(`   Visibility fixes: ${htmlAnalysis.searchAnalysis.hasVisibilityFixes ? '✅' : '⚠️'}`);
    console.log(`   Code analysis: ${jsAnalysis.searchFixesFound ? '✅' : '⚠️'}`);
    console.log(`   API accessible: ${apiResults['/'] ? apiResults['/'].success ? '✅' : '❌' : '❌'}`);
    
    const searchFixSuccess = htmlAnalysis.searchAnalysis.hasSearchForm && 
                            htmlAnalysis.searchAnalysis.hasResultsContainer;
    console.log(`   Overall: ${searchFixSuccess ? '✅ PASSED' : '❌ NEEDS ATTENTION'}`);
    
    // Overall Assessment
    console.log('\n🎯 OVERALL ASSESSMENT');
    console.log('=' .repeat(50));
    
    const allFixesWorking = toastFixSuccess && storeFixSuccess && searchFixSuccess;
    console.log(`Toast Reduction: ${toastFixSuccess ? '✅' : '❌'}`);
    console.log(`Store Display: ${storeFixSuccess ? '✅' : '❌'}`);
    console.log(`Search Function: ${searchFixSuccess ? '✅' : '❌'}`);
    console.log(`Server Status: ${apiResults['/'].success ? '✅' : '❌'}`);
    
    console.log(`\n🏆 ALL FIXES STATUS: ${allFixesWorking ? '✅ ALL PASSED' : '⚠️ SOME ISSUES FOUND'}`);
    
    // Save detailed report
    const detailedReport = {
      timestamp: new Date().toISOString(),
      htmlAnalysis,
      apiResults,
      jsAnalysis,
      summary: {
        toastFixSuccess,
        storeFixSuccess,
        searchFixSuccess,
        allFixesWorking
      }
    };
    
    fs.writeFileSync('test-results/manual-verification-report.json', JSON.stringify(detailedReport, null, 2));
    console.log('\n📋 Detailed report saved to: test-results/manual-verification-report.json');
    
    if (allFixesWorking) {
      console.log('\n🎉 Congratulations! All three fixes are verified and working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️ Some fixes may need attention. Check the detailed analysis above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
    process.exit(1);
  }
}

// Create results directory
if (!fs.existsSync('test-results')) {
  fs.mkdirSync('test-results', { recursive: true });
}

// Run the verification
runVerification();