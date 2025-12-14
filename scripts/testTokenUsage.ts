/**
 * Token Usage Test Script
 * Measures actual token consumption across different scenarios
 * 
 * Run with: npm run test:tokens
 */

import { generateChatResponse, generateProductDescriptionsFromModel } from '../services/geminiService';
import { tokenTracker } from '../utils/tokenTracker';
import { AssistantConfig, KnowledgeBase, AIGlobalConfig, ShopPaymentMethod } from '../types';

// Test scenarios
interface TestScenario {
    name: string;
    description: string;
    message: string;
    historyLength: number;
    knowledgeBaseSize: 'small' | 'medium' | 'large';
}

const scenarios: TestScenario[] = [
    {
        name: 'Simple Greeting',
        description: 'Single word greeting with no history',
        message: 'Hi',
        historyLength: 0,
        knowledgeBaseSize: 'small',
    },
    {
        name: 'Simple Question',
        description: 'Basic price inquiry',
        message: 'What are your prices?',
        historyLength: 0,
        knowledgeBaseSize: 'small',
    },
    {
        name: 'Product Inquiry',
        description: 'Asking about specific product',
        message: 'Tell me about your iPhone 15 Pro Max',
        historyLength: 0,
        knowledgeBaseSize: 'medium',
    },
    {
        name: 'Complex Question',
        description: 'Multi-part question requiring detailed response',
        message: 'I want to buy an iPhone 15 Pro Max in blue color, 256GB storage. What payment methods do you accept and how long is delivery?',
        historyLength: 0,
        knowledgeBaseSize: 'medium',
    },
    {
        name: 'Short Conversation',
        description: 'Message with 3-message history',
        message: 'Yes, I want the blue one',
        historyLength: 3,
        knowledgeBaseSize: 'medium',
    },
    {
        name: 'Medium Conversation',
        description: 'Message with 10-message history',
        message: 'Can you ship it to Yangon?',
        historyLength: 10,
        knowledgeBaseSize: 'medium',
    },
    {
        name: 'Long Conversation',
        description: 'Message with 20-message history',
        message: 'What about warranty?',
        historyLength: 20,
        knowledgeBaseSize: 'large',
    },
    {
        name: 'Order Placement',
        description: 'Customer wants to place order (triggers tool)',
        message: 'I want to order it now. My name is John Doe, phone is 09123456789, address is 123 Main St, Yangon',
        historyLength: 5,
        knowledgeBaseSize: 'medium',
    },
    {
        name: 'Knowledge Base Query',
        description: 'Question requiring KB lookup',
        message: 'What are your store locations in Mandalay?',
        historyLength: 0,
        knowledgeBaseSize: 'large',
    },
    {
        name: 'Multi-language',
        description: 'Question in Myanmar language',
        message: 'မင်္ဂလာပါ။ iPhone ၁၅ Pro Max အကြောင်းပြောပြပါ။',
        historyLength: 0,
        knowledgeBaseSize: 'medium',
    },
];

// Mock data generators
const generateMockHistory = (length: number) => {
    const history = [];
    for (let i = 0; i < length; i++) {
        if (i % 2 === 0) {
            history.push({
                role: 'user',
                parts: [{ text: `User message ${i + 1}` }],
            });
        } else {
            history.push({
                role: 'model',
                parts: [{ text: `Bot response ${i + 1}. This is a sample response with some detail.` }],
            });
        }
    }
    return history;
};

const generateMockKnowledgeBase = (size: 'small' | 'medium' | 'large'): KnowledgeBase => {
    const sizes = {
        small: {
            sections: 2,
            contentLength: 100,
            products: 5,
        },
        medium: {
            sections: 10,
            contentLength: 500,
            products: 20,
        },
        large: {
            sections: 30,
            contentLength: 1000,
            products: 50,
        },
    };

    const config = sizes[size];
    const sections = [];

    for (let i = 0; i < config.sections; i++) {
        sections.push({
            id: `section_${i}`,
            title: `Knowledge Section ${i + 1}`,
            content: 'A'.repeat(config.contentLength),
            isCustom: true,
            includeInQuickReplies: false,
        });
    }

    // Add location section for large KB
    if (size === 'large') {
        sections.push({
            id: 'locations',
            title: 'Store Locations',
            content: 'Our stores',
            isCustom: false,
            includeInQuickReplies: false,
            type: 'location_list' as const,
            locations: [
                {
                    id: 'loc_1',
                    name: 'Yangon Store',
                    addressLine1: '123 Main St',
                    city: 'Yangon',
                    stateRegion: 'Yangon',
                    phone: '09123456789',
                    operatingHours: '9AM-9PM',
                },
                {
                    id: 'loc_2',
                    name: 'Mandalay Store',
                    addressLine1: '456 Second St',
                    city: 'Mandalay',
                    stateRegion: 'Mandalay',
                    phone: '09987654321',
                    operatingHours: '10AM-8PM',
                },
            ],
        });
    }

    const productData = Array(config.products)
        .fill(null)
        .map((_, i) => `Product ${i + 1}: Description here. Price: ${1000 + i * 100} MMK`)
        .join('\n');

    return {
        userDefined: sections,
        productData,
    };
};

const mockAssistantConfig: AssistantConfig = {
    selectedModel: 'STANDARD' as any,
    systemPrompt: 'You are a helpful shop assistant.',
    language: 'en',
    tone: 'neutral',
    responseDelay: 0,
};

const mockGlobalConfig: AIGlobalConfig = {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
};

const mockPaymentMethods: ShopPaymentMethod[] = [
    {
        id: 'pm_1',
        name: 'KBZ Pay',
        instructions: 'Send to 09123456789',
        requiresProof: true,
        enabled: true,
    },
];

// Test execution
async function runTests() {
    console.log('\n🧪 TOKEN USAGE TEST SUITE\n');
    console.log('━'.repeat(80));
    console.log('Testing Gemini 2.5 Flash token consumption across different scenarios');
    console.log('━'.repeat(80));
    console.log('\n');

    // Clear previous logs
    tokenTracker.clearLogs();

    const results: any[] = [];

    for (const scenario of scenarios) {
        console.log(`\n📊 Testing: ${scenario.name}`);
        console.log(`   ${scenario.description}`);
        console.log(`   Message: "${scenario.message}"`);
        console.log(`   History length: ${scenario.historyLength}`);
        console.log(`   KB size: ${scenario.knowledgeBaseSize}`);

        try {
            const history = generateMockHistory(scenario.historyLength);
            const knowledgeBase = generateMockKnowledgeBase(scenario.knowledgeBaseSize);

            const startTime = Date.now();
            
            const response = await generateChatResponse(
                'test_shop',
                'test_conversation',
                'gemini-2.5-flash',
                mockGlobalConfig,
                history as any,
                scenario.message,
                mockAssistantConfig,
                knowledgeBase,
                'en',
                'neutral',
                mockPaymentMethods
            );

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Get the latest log
            const logs = tokenTracker.getLogsByShop('test_shop');
            const latestLog = logs[logs.length - 1];

            if (latestLog) {
                console.log(`   ✅ Success in ${duration}ms`);
                console.log(`   📥 Input tokens:  ${latestLog.inputTokens.toLocaleString()}`);
                console.log(`   📤 Output tokens: ${latestLog.outputTokens.toLocaleString()}`);
                console.log(`   📊 Total tokens:  ${latestLog.totalTokens.toLocaleString()}`);
                console.log(`   💰 Cost:          $${latestLog.totalCost.toFixed(6)}`);
                console.log(`   📝 Response length: ${response.text.length} chars`);

                results.push({
                    scenario: scenario.name,
                    inputTokens: latestLog.inputTokens,
                    outputTokens: latestLog.outputTokens,
                    totalTokens: latestLog.totalTokens,
                    cost: latestLog.totalCost,
                    duration,
                    responseLength: response.text.length,
                });
            }
        } catch (error) {
            console.log(`   ❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            results.push({
                scenario: scenario.name,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    // Print summary
    console.log('\n\n━'.repeat(80));
    console.log('📈 SUMMARY REPORT');
    console.log('━'.repeat(80));
    console.log('\n');

    const successfulTests = results.filter(r => !r.error);
    
    if (successfulTests.length > 0) {
        const avgInput = Math.round(
            successfulTests.reduce((sum, r) => sum + r.inputTokens, 0) / successfulTests.length
        );
        const avgOutput = Math.round(
            successfulTests.reduce((sum, r) => sum + r.outputTokens, 0) / successfulTests.length
        );
        const avgTotal = Math.round(
            successfulTests.reduce((sum, r) => sum + r.totalTokens, 0) / successfulTests.length
        );
        const avgCost = successfulTests.reduce((sum, r) => sum + r.cost, 0) / successfulTests.length;
        const totalCost = successfulTests.reduce((sum, r) => sum + r.cost, 0);

        console.log(`Total tests:        ${scenarios.length}`);
        console.log(`Successful:         ${successfulTests.length}`);
        console.log(`Failed:             ${scenarios.length - successfulTests.length}`);
        console.log();
        console.log(`Average input tokens:   ${avgInput.toLocaleString()}`);
        console.log(`Average output tokens:  ${avgOutput.toLocaleString()}`);
        console.log(`Average total tokens:   ${avgTotal.toLocaleString()}`);
        console.log(`Average cost per message: $${avgCost.toFixed(6)}`);
        console.log(`Total cost for all tests: $${totalCost.toFixed(6)}`);
        console.log();
        console.log('💡 Pricing Insights:');
        console.log(`   - At $${avgCost.toFixed(6)} per message:`);
        console.log(`     • 10,000 messages/month = $${(avgCost * 10000).toFixed(2)}`);
        console.log(`     • 100,000 messages/month = $${(avgCost * 100000).toFixed(2)}`);
        console.log(`     • 1,000,000 messages/month = $${(avgCost * 1000000).toFixed(2)}`);
        console.log();
        console.log(`   - Suggested pricing (with 500% markup):`);
        console.log(`     • $${(avgCost * 5).toFixed(6)} per message`);
        console.log(`     • $${(avgCost * 5 * 1000).toFixed(2)} per 1,000 messages`);
        console.log();
    }

    // Print detailed table
    console.log('📋 DETAILED RESULTS\n');
    console.log('Scenario                    | Input   | Output  | Total   | Cost       | Duration');
    console.log('─'.repeat(85));
    results.forEach(r => {
        if (r.error) {
            console.log(`${r.scenario.padEnd(28)}| ERROR: ${r.error}`);
        } else {
            console.log(
                `${r.scenario.padEnd(28)}| ${String(r.inputTokens).padStart(7)} | ${String(r.outputTokens).padStart(7)} | ${String(r.totalTokens).padStart(7)} | $${r.cost.toFixed(6)} | ${r.duration}ms`
            );
        }
    });

    console.log('\n━'.repeat(80));
    console.log('✅ Test suite completed!');
    console.log('━'.repeat(80));
    console.log('\n');

    // Export results
    const csvData = tokenTracker.exportToCSV();
    console.log('📄 CSV export available. Call tokenTracker.exportToCSV() to download.');
}

// Run tests if executed directly
if (require.main === module) {
    runTests().catch(console.error);
}

export { runTests };
