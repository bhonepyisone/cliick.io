#!/usr/bin/env node

/**
 * Token Cost Analysis Report
 * Analyzes Gemini 2.5 Flash token consumption and pricing impact
 * 
 * Usage: node analyze-token-costs.js
 */

// Gemini 2.5 Flash Pricing (as of Dec 2024)
const PRICING = {
    input: 0.03,      // $0.03 per 1M input tokens
    output: 0.06,     // $0.06 per 1M output tokens
};

// Real-world token consumption estimates based on geminiService.ts analysis
// These are derived from Gemini API documentation and common patterns
const CONSUMPTION_ESTIMATES = {
    // System prompt overhead: ~150-300 tokens
    systemPromptBase: 200,
    
    // Per history message pair (user + bot)
    historyPerPair: 50,
    
    // Knowledge base overhead
    knowledgeBaseSmall: 300,      // ~2 sections, 200 chars content
    knowledgeBaseMedium: 1500,    // ~10 sections, 500 chars content
    knowledgeBaseLarge: 3500,     // ~30 sections, 1000 chars content
    
    // User message tokens (estimated as 1 token per 4 chars)
    userMessagePerChar: 0.25,
    
    // Average output tokens per message type
    shortResponse: 80,        // "Hi", simple greeting
    standardResponse: 200,    // Normal product inquiry
    longResponse: 400,        // Complex multi-part question
    orderResponse: 250,       // Order placement
};

const scenarios = [
    {
        name: 'Simple Greeting',
        messageChars: 2,
        historyLength: 0,
        knowledgeBase: 'small',
        expectedOutput: CONSUMPTION_ESTIMATES.shortResponse,
        description: 'Single word greeting with no context'
    },
    {
        name: 'Basic Price Inquiry',
        messageChars: 22,
        historyLength: 0,
        knowledgeBase: 'small',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Simple price question'
    },
    {
        name: 'Product Information Query',
        messageChars: 50,
        historyLength: 0,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Product inquiry with specific product name'
    },
    {
        name: 'Complex Multi-part Question',
        messageChars: 145,
        historyLength: 0,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.longResponse,
        description: 'Multiple questions about price, payment, delivery'
    },
    {
        name: 'Short Conversation',
        messageChars: 25,
        historyLength: 3,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Message with 3-message history'
    },
    {
        name: 'Medium Conversation',
        messageChars: 30,
        historyLength: 10,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Message with 10-message history'
    },
    {
        name: 'Long Conversation',
        messageChars: 20,
        historyLength: 20,
        knowledgeBase: 'large',
        expectedOutput: CONSUMPTION_ESTIMATES.shortResponse,
        description: 'Message with 20-message history and large KB'
    },
    {
        name: 'Order Placement',
        messageChars: 95,
        historyLength: 5,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.orderResponse,
        description: 'Customer places order with details'
    },
    {
        name: 'Knowledge Base Heavy Query',
        messageChars: 45,
        historyLength: 0,
        knowledgeBase: 'large',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Question requiring large KB lookup'
    },
    {
        name: 'Multilingual Query',
        messageChars: 35,
        historyLength: 0,
        knowledgeBase: 'medium',
        expectedOutput: CONSUMPTION_ESTIMATES.standardResponse,
        description: 'Query in non-English language'
    }
];

function calculateTokens(scenario) {
    const kbSizes = {
        'small': CONSUMPTION_ESTIMATES.knowledgeBaseSmall,
        'medium': CONSUMPTION_ESTIMATES.knowledgeBaseMedium,
        'large': CONSUMPTION_ESTIMATES.knowledgeBaseLarge,
    };
    
    // Calculate input tokens
    const systemPrompt = CONSUMPTION_ESTIMATES.systemPromptBase;
    const history = scenario.historyLength * CONSUMPTION_ESTIMATES.historyPerPair;
    const userMessage = Math.ceil(scenario.messageChars * CONSUMPTION_ESTIMATES.userMessagePerChar);
    const kb = kbSizes[scenario.knowledgeBase];
    
    const inputTokens = systemPrompt + history + userMessage + kb;
    const outputTokens = scenario.expectedOutput;
    const totalTokens = inputTokens + outputTokens;
    
    // Calculate costs
    const inputCost = (inputTokens / 1_000_000) * PRICING.input;
    const outputCost = (outputTokens / 1_000_000) * PRICING.output;
    const totalCost = inputCost + outputCost;
    
    return {
        inputTokens,
        outputTokens,
        totalTokens,
        inputCost,
        outputCost,
        totalCost
    };
}

function formatCost(cost) {
    return `$${cost.toFixed(6)}`;
}

function formatTokens(tokens) {
    return tokens.toLocaleString();
}

console.log('\n');
console.log('╔' + '═'.repeat(98) + '╗');
console.log('║' + ' '.repeat(20) + 'GEMINI 2.5 FLASH TOKEN CONSUMPTION ANALYSIS' + ' '.repeat(35) + '║');
console.log('╚' + '═'.repeat(98) + '╝');
console.log('\n');

console.log('📊 PRICING BASELINE');
console.log('─'.repeat(100));
console.log(`Input:  ${PRICING.input}/1M tokens = $${(PRICING.input / 1000).toFixed(9)} per 1K tokens`);
console.log(`Output: ${PRICING.output}/1M tokens = $${(PRICING.output / 1000).toFixed(9)} per 1K tokens`);
console.log('\n');

console.log('📋 SCENARIO ANALYSIS');
console.log('─'.repeat(100));

const results = [];
let totalCost = 0;
let totalMessages = 0;

scenarios.forEach((scenario, index) => {
    const tokens = calculateTokens(scenario);
    results.push({
        ...scenario,
        ...tokens
    });
    totalCost += tokens.totalCost;
    totalMessages++;
    
    const pctWidth = 8;
    const pctInput = (tokens.inputTokens / tokens.totalTokens * 100).toFixed(1);
    const pctOutput = (tokens.outputTokens / tokens.totalTokens * 100).toFixed(1);
    
    console.log(`\n${index + 1}. ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Input Tokens:  ${formatTokens(tokens.inputTokens).padStart(6)} (${pctInput.padStart(4)}%)`);
    console.log(`   Output Tokens: ${formatTokens(tokens.outputTokens).padStart(6)} (${pctOutput.padStart(4)}%)`);
    console.log(`   Total Tokens:  ${formatTokens(tokens.totalTokens).padStart(6)}`);
    console.log(`   Cost:          ${formatCost(tokens.totalCost)}`);
});

console.log('\n');
console.log('═'.repeat(100));
console.log('📈 SUMMARY STATISTICS');
console.log('═'.repeat(100));
console.log('\n');

const avgTokens = Math.round(results.reduce((sum, r) => sum + r.totalTokens, 0) / results.length);
const avgInput = Math.round(results.reduce((sum, r) => sum + r.inputTokens, 0) / results.length);
const avgOutput = Math.round(results.reduce((sum, r) => sum + r.outputTokens, 0) / results.length);
const avgCost = totalCost / results.length;

console.log(`Total Scenarios:      ${results.length}`);
console.log(`Average Message Cost: ${formatCost(avgCost)}`);
console.log(`Average Total Tokens: ${formatTokens(avgTokens)}`);
console.log(`  - Input:  ${formatTokens(avgInput)} (${(avgInput/avgTokens*100).toFixed(1)}%)`);
console.log(`  - Output: ${formatTokens(avgOutput)} (${(avgOutput/avgTokens*100).toFixed(1)}%)`);
console.log('\n');

console.log('💰 PRICING PROJECTIONS');
console.log('─'.repeat(100));
console.log('\n');

const volumes = [1000, 10000, 100000, 1000000];
const markups = [200, 300, 400, 500];

console.log('Cost Breakdown for Different Message Volumes:');
console.log('─'.repeat(100));
volumes.forEach(volume => {
    const monthlyInput = (avgInput * volume) / 1_000_000 * PRICING.input;
    const monthlyOutput = (avgOutput * volume) / 1_000_000 * PRICING.output;
    const monthlyTotal = monthlyInput + monthlyOutput;
    const costPerMsg = monthlyTotal / volume;
    
    console.log(`\n${formatTokens(volume).padStart(9)} messages/month:`);
    console.log(`  Input Cost:  ${formatCost(monthlyInput).padStart(12)}`);
    console.log(`  Output Cost: ${formatCost(monthlyOutput).padStart(12)}`);
    console.log(`  Total Cost:  ${formatCost(monthlyTotal).padStart(12)} (${formatCost(costPerMsg)} per message)`);
});

console.log('\n\n');
console.log('Recommended Pricing Strategy (with margin):');
console.log('─'.repeat(100));

markups.forEach(markup => {
    const multiplier = markup / 100;
    const pricePerMsg = avgCost * multiplier;
    
    console.log(`\n${markup}% Markup (${multiplier}x cost):`);
    console.log(`  Per Message:         ${formatCost(pricePerMsg)}`);
    
    volumes.forEach(volume => {
        const monthlyRevenue = pricePerMsg * volume;
        const monthlyCost = (avgCost * volume);
        const monthlyProfit = monthlyRevenue - monthlyCost;
        const profitMargin = (monthlyProfit / monthlyRevenue * 100).toFixed(1);
        
        console.log(`  ${formatTokens(volume).padStart(9)} msg/month: ${formatCost(monthlyRevenue).padStart(12)} revenue, ${formatCost(monthlyProfit).padStart(12)} profit (${profitMargin}% margin)`);
    });
});

console.log('\n\n');
console.log('═'.repeat(100));
console.log('📊 DETAILED COMPARISON TABLE');
console.log('═'.repeat(100));
console.log('\n');

console.log('Scenario                          | Input Tokens | Output Tokens | Total Tokens |    Cost     | Cost/1k Msgs');
console.log('─'.repeat(100));

const sortedByTotal = [...results].sort((a, b) => b.totalTokens - a.totalTokens);
sortedByTotal.forEach(r => {
    const costPerK = r.totalCost * 1000;
    console.log(
        `${r.name.padEnd(33)} | ${formatTokens(r.inputTokens).padStart(12)} | ${formatTokens(r.outputTokens).padStart(13)} | ${formatTokens(r.totalTokens).padStart(12)} | ${formatCost(r.totalCost).padStart(10)} | ${formatCost(costPerK).padStart(11)}`
    );
});

console.log('\n');
console.log('═'.repeat(100));
console.log('🎯 KEY INSIGHTS & RECOMMENDATIONS');
console.log('═'.repeat(100));
console.log('\n');

const minCost = Math.min(...results.map(r => r.totalCost));
const maxCost = Math.max(...results.map(r => r.totalCost));
const minTokens = Math.min(...results.map(r => r.totalTokens));
const maxTokens = Math.max(...results.map(r => r.totalTokens));

const minScenario = results.find(r => r.totalCost === minCost);
const maxScenario = results.find(r => r.totalCost === maxCost);

console.log(`1. COST RANGE`);
console.log(`   Cheapest:  ${minScenario.name} (${formatCost(minCost)} per message)`);
console.log(`   Most Expensive: ${maxScenario.name} (${formatCost(maxCost)} per message)`);
console.log(`   Ratio: ${(maxCost / minCost).toFixed(1)}x difference\n`);

console.log(`2. AVERAGE CONSUMPTION`);
console.log(`   Per Message: ${formatTokens(avgTokens)} tokens (${formatCost(avgCost)})`);
console.log(`   Monthly (10K msg): ${formatTokens(avgTokens * 10000)} tokens`);
console.log(`   Monthly Cost (10K msg): ${formatCost(avgCost * 10000)}\n`);

console.log(`3. TOKEN COMPOSITION`);
console.log(`   Average Input Tokens:  ${formatTokens(avgInput)} (${(avgInput/avgTokens*100).toFixed(1)}%) - System prompt, KB, history`);
console.log(`   Average Output Tokens: ${formatTokens(avgOutput)} (${(avgOutput/avgTokens*100).toFixed(1)}%) - Bot response\n`);

console.log(`4. COST OPTIMIZATION OPPORTUNITIES`);
const highInputScenarios = results.filter(r => r.inputTokens / r.totalTokens > 0.8);
if (highInputScenarios.length > 0) {
    console.log(`   ⚠️  High Input Overhead: ${highInputScenarios.map(s => s.name).join(', ')}`);
    console.log(`      Action: Consider reducing knowledge base size or conversation history in these scenarios\n`);
}

console.log(`5. PRICING RECOMMENDATION`);
const recommended = avgCost * 5; // 5x markup = 400% profit margin
console.log(`   Cost per Message:        ${formatCost(avgCost)}`);
console.log(`   Recommended Price (5x):  ${formatCost(recommended)}`);
console.log(`   Daily Profit (1000 msg): ${formatCost((recommended - avgCost) * 1000)}`);
console.log(`   Monthly Profit (30K msg): ${formatCost((recommended - avgCost) * 30000)}\n`);

console.log(`6. ARCHITECTURE CONSIDERATIONS`);
console.log(`   • Implement history trimming: Long conversations accumulate tokens (${formatTokens(CONSUMPTION_ESTIMATES.historyPerPair)}/pair)`);
console.log(`   • Consider KB compression: Large KB adds ${formatTokens(CONSUMPTION_ESTIMATES.knowledgeBaseLarge)} tokens`);
console.log(`   • Implement token budgets: Set monthly limits per user/shop to control costs`);
console.log(`   • Use caching: Cache common responses to reduce API calls`);
console.log(`   • Consider async processing: For non-critical features, use batch processing\n`);

console.log('═'.repeat(100) + '\n');
console.log('Generated: ' + new Date().toISOString());
console.log('\n');
