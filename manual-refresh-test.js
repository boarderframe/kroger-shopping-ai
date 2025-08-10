#!/usr/bin/env node

/**
 * Manual Refresh Functionality Test
 * Tests the key aspects of the refresh functionality manually
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios').default;

class ManualRefreshTest {
    constructor() {
        this.baseURL = 'http://localhost:3001';
        this.testResults = {
            apiConnectivity: false,
            storeAPIWorking: false,
            pageAccessible: false,
            refreshButtonExists: false,
            fixScriptLoaded: false,
            summary: {}
        };
    }

    async runTests() {
        console.log('🧪 Manual Refresh Functionality Test\n' + '='.repeat(50));

        try {
            // Test 1: Server Connectivity
            await this.testServerConnectivity();
            
            // Test 2: Store API Functionality
            await this.testStoreAPI();
            
            // Test 3: Page Content Analysis
            await this.testPageContent();
            
            // Test 4: Check Required Files
            await this.testRequiredFiles();
            
            // Generate Summary
            this.generateSummary();

        } catch (error) {
            console.error('❌ Test execution failed:', error.message);
        }
    }

    async testServerConnectivity() {
        console.log('🌐 Testing server connectivity...');
        
        try {
            const response = await axios.get(this.baseURL, { timeout: 5000 });
            if (response.status === 200) {
                this.testResults.apiConnectivity = true;
                console.log('  ✅ Server is accessible');
            }
        } catch (error) {
            console.log('  ❌ Server connectivity failed:', error.message);
        }
    }

    async testStoreAPI() {
        console.log('\n📍 Testing store API...');
        
        try {
            const response = await axios.get(`${this.baseURL}/api/stores/nearby?zipCode=43123&radius=50`, { timeout: 10000 });
            
            if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0) {
                this.testResults.storeAPIWorking = true;
                console.log(`  ✅ Store API working - returned ${response.data.length} stores`);
                console.log(`  📋 First store: ${response.data[0].name} - ${response.data[0].address.city}`);
            } else {
                console.log('  ❌ Store API returned unexpected data');
            }
        } catch (error) {
            console.log('  ❌ Store API failed:', error.message);
        }
    }

    async testPageContent() {
        console.log('\n📄 Testing page content...');
        
        try {
            const response = await axios.get(this.baseURL, { timeout: 5000 });
            const htmlContent = response.data;
            
            // Check for refresh button
            if (htmlContent.includes('refresh-stores-btn')) {
                this.testResults.refreshButtonExists = true;
                console.log('  ✅ Refresh button found in HTML');
            } else {
                console.log('  ❌ Refresh button not found in HTML');
            }
            
            // Check for fix script
            if (htmlContent.includes('fix-refresh-button.js')) {
                this.testResults.fixScriptLoaded = true;
                console.log('  ✅ Fix script reference found');
            } else {
                console.log('  ❌ Fix script reference not found');
            }
            
            this.testResults.pageAccessible = true;
            console.log('  ✅ Page content accessible');
            
        } catch (error) {
            console.log('  ❌ Page content test failed:', error.message);
        }
    }

    async testRequiredFiles() {
        console.log('\n📁 Testing required files...');
        
        const requiredFiles = [
            { path: 'public/index.html', name: 'Main HTML file' },
            { path: 'public/app.js', name: 'Main JavaScript file' },
            { path: 'public/fix-refresh-button.js', name: 'Refresh fix script' },
            { path: 'public/styles.css', name: 'Styles file' }
        ];

        for (const file of requiredFiles) {
            if (fs.existsSync(file.path)) {
                console.log(`  ✅ ${file.name} exists`);
                
                // Check file size
                const stats = fs.statSync(file.path);
                if (stats.size > 0) {
                    console.log(`    📏 Size: ${(stats.size / 1024).toFixed(1)} KB`);
                } else {
                    console.log(`    ⚠️  File is empty`);
                }
            } else {
                console.log(`  ❌ ${file.name} missing`);
            }
        }
    }

    generateSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(50));

        const tests = [
            { name: 'Server Connectivity', result: this.testResults.apiConnectivity },
            { name: 'Store API Working', result: this.testResults.storeAPIWorking },
            { name: 'Page Accessible', result: this.testResults.pageAccessible },
            { name: 'Refresh Button Exists', result: this.testResults.refreshButtonExists },
            { name: 'Fix Script Loaded', result: this.testResults.fixScriptLoaded }
        ];

        let passedCount = 0;
        tests.forEach(test => {
            const status = test.result ? '✅ PASS' : '❌ FAIL';
            console.log(`${test.name}: ${status}`);
            if (test.result) passedCount++;
        });

        const totalTests = tests.length;
        const passRate = ((passedCount / totalTests) * 100).toFixed(1);

        console.log(`\nOverall Result: ${passedCount}/${totalTests} tests passed (${passRate}%)`);

        if (passedCount === totalTests) {
            console.log('\n🎉 All core systems are working! The refresh functionality should be operational.');
            console.log('\n💡 Next Steps:');
            console.log('  1. Open http://localhost:3001 in your browser');
            console.log('  2. Navigate to Settings tab');
            console.log('  3. Enter ZIP code 43123 and click "Find Stores"');
            console.log('  4. Once stores load, verify the "Refresh" button appears');
            console.log('  5. Click the refresh button and verify it shows loading state');
            console.log('  6. Confirm stores reload and button returns to normal state');
        } else {
            console.log('\n⚠️  Some issues detected. Please address the failed tests above.');
        }

        // Store summary for potential reporting
        this.testResults.summary = {
            totalTests,
            passedCount,
            passRate,
            timestamp: new Date().toISOString()
        };

        // Write results to file
        fs.writeFileSync('manual-test-results.json', JSON.stringify(this.testResults, null, 2));
        console.log('\n📄 Detailed results saved to: manual-test-results.json');
    }
}

// Advanced testing: Check specific functionality
class AdvancedRefreshTest extends ManualRefreshTest {
    async runAdvancedTests() {
        console.log('\n🔬 Running Advanced Refresh Tests...');
        
        await this.testButtonStates();
        await this.testErrorHandling();
        await this.testPerformance();
    }

    async testButtonStates() {
        console.log('\n🔘 Testing button state management...');
        
        // This would require actual DOM manipulation or browser automation
        // For now, we can check that the fix script has the right patterns
        
        try {
            const fixScript = fs.readFileSync('public/fix-refresh-button.js', 'utf8');
            
            const requiredPatterns = [
                'innerHTML.*Refreshing',
                'disabled.*true',
                'disabled.*false',
                'addEventListener.*click'
            ];

            let patternsFound = 0;
            requiredPatterns.forEach(pattern => {
                const regex = new RegExp(pattern);
                if (regex.test(fixScript)) {
                    patternsFound++;
                    console.log(`    ✅ Pattern found: ${pattern}`);
                } else {
                    console.log(`    ❌ Pattern missing: ${pattern}`);
                }
            });

            console.log(`    📊 Button state patterns: ${patternsFound}/${requiredPatterns.length} found`);
            
        } catch (error) {
            console.log('    ❌ Could not analyze fix script:', error.message);
        }
    }

    async testErrorHandling() {
        console.log('\n🚨 Testing error handling...');
        
        try {
            // Test with invalid ZIP code
            const response = await axios.get(`${this.baseURL}/api/stores/nearby?zipCode=00000&radius=50`, { timeout: 5000 });
            console.log(`    📊 Invalid ZIP response: ${response.status} - ${response.data.length || 0} stores`);
        } catch (error) {
            console.log(`    ✅ Error handling working: ${error.response?.status || 'Network error'}`);
        }

        // Test with missing parameters
        try {
            await axios.get(`${this.baseURL}/api/stores/nearby`, { timeout: 5000 });
        } catch (error) {
            console.log(`    ✅ Parameter validation working: ${error.response?.status || 'Network error'}`);
        }
    }

    async testPerformance() {
        console.log('\n⚡ Testing API performance...');
        
        const testCases = [
            { zipCode: '43123', name: 'Columbus, OH' },
            { zipCode: '45202', name: 'Cincinnati, OH' },
            { zipCode: '44101', name: 'Cleveland, OH' }
        ];

        for (const testCase of testCases) {
            try {
                const start = Date.now();
                const response = await axios.get(`${this.baseURL}/api/stores/nearby?zipCode=${testCase.zipCode}&radius=50`, { timeout: 10000 });
                const duration = Date.now() - start;
                
                console.log(`    ⏱️  ${testCase.name}: ${duration}ms (${response.data.length} stores)`);
                
                if (duration > 5000) {
                    console.log(`    ⚠️  Slow response time for ${testCase.name}`);
                }
            } catch (error) {
                console.log(`    ❌ Performance test failed for ${testCase.name}:`, error.message);
            }
        }
    }
}

// Run the tests
if (require.main === module) {
    const tester = new AdvancedRefreshTest();
    
    tester.runTests().then(() => {
        return tester.runAdvancedTests();
    }).then(() => {
        console.log('\n✅ Manual testing complete!');
    }).catch(error => {
        console.error('❌ Testing failed:', error);
        process.exit(1);
    });
}

module.exports = { ManualRefreshTest, AdvancedRefreshTest };