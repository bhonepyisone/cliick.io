/**
 * Token Consumption Test Harness
 * Utilities for measuring actual token consumption across different operation types
 * Provides realistic baseline measurements for billing and optimization
 */

import { tokenTracker, TokenUsageLog } from './tokenTracker';
import { pricingService } from '../services/pricingService';

export interface TestResult {
    operationType: 'chat_message' | 'product_description' | 'photo_studio' | 'suggestion';
    testName: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    costPerToken: number;
    timestamp: Date;
}

export interface TestSummary {
    totalTests: number;
    operationTypeBreakdown: {
        operationType: string;
        averageInputTokens: number;
        averageOutputTokens: number;
        averageTotalTokens: number;
        averageCost: number;
        testCount: number;
    }[];
    totalTokensConsumed: number;
    totalCostIncurred: number;
    estimatedMonthlySpend: number; // Extrapolated to 30 days with 100 tests/day
}

/**
 * Baseline test measurements (typical ranges for different operations)
 */
export const BASELINE_MEASUREMENTS = {
    chat_message: {
        minInputTokens: 400,
        maxInputTokens: 3500,
        minOutputTokens: 100,
        maxOutputTokens: 400,
        avgInputTokens: 1200,
        avgOutputTokens: 200,
    },
    product_description: {
        minInputTokens: 300,
        maxInputTokens: 2000,
        minOutputTokens: 150,
        maxOutputTokens: 800,
        avgInputTokens: 800,
        avgOutputTokens: 400,
    },
    photo_studio: {
        minInputTokens: 500,
        maxInputTokens: 2500,
        minOutputTokens: 200,
        maxOutputTokens: 600,
        avgInputTokens: 1200,
        avgOutputTokens: 350,
    },
    suggestion: {
        minInputTokens: 200,
        maxInputTokens: 1500,
        minOutputTokens: 50,
        maxOutputTokens: 300,
        avgInputTokens: 600,
        avgOutputTokens: 150,
    },
};

class TokenConsumptionTestHarness {
    private testResults: TestResult[] = [];

    /**
     * Generate a simulated test result based on baseline measurements
     * Used for demonstrations and projections before real usage data
     */
    generateSimulatedTest(
        operationType: 'chat_message' | 'product_description' | 'photo_studio' | 'suggestion',
        testName: string
    ): TestResult {
        const baseline = BASELINE_MEASUREMENTS[operationType];
        
        // Random variation within the range
        const inputTokens = Math.floor(
            baseline.avgInputTokens + (Math.random() - 0.5) * (baseline.maxInputTokens - baseline.minInputTokens)
        );
        const outputTokens = Math.floor(
            baseline.avgOutputTokens + (Math.random() - 0.5) * (baseline.maxOutputTokens - baseline.minOutputTokens)
        );

        const inputCost = (inputTokens / 1_000_000) * 0.03; // $0.03 per 1M input tokens
        const outputCost = (outputTokens / 1_000_000) * 0.06; // $0.06 per 1M output tokens
        const totalCost = inputCost + outputCost;
        const totalTokens = inputTokens + outputTokens;

        return {
            operationType,
            testName,
            inputTokens: Math.max(baseline.minInputTokens, Math.min(baseline.maxInputTokens, inputTokens)),
            outputTokens: Math.max(baseline.minOutputTokens, Math.min(baseline.maxOutputTokens, outputTokens)),
            totalTokens,
            inputCost,
            outputCost,
            totalCost: Math.round(totalCost * 100000) / 100000, // Round to 5 decimals
            costPerToken: totalCost / totalTokens,
            timestamp: new Date(),
        };
    }

    /**
     * Record actual test result from real API call
     */
    recordActualTest(log: TokenUsageLog): TestResult {
        const result: TestResult = {
            operationType: log.operationType,
            testName: `Actual-${log.operationType}-${new Date().toISOString()}`,
            inputTokens: log.inputTokens,
            outputTokens: log.outputTokens,
            totalTokens: log.totalTokens,
            inputCost: log.inputCost,
            outputCost: log.outputCost,
            totalCost: log.totalCost,
            costPerToken: log.totalCost / log.totalTokens,
            timestamp: new Date(log.timestamp),
        };
        
        this.testResults.push(result);
        return result;
    }

    /**
     * Run a series of simulated tests
     */
    async runSimulatedTestSuite(
        testCounts: {
            chat_message?: number;
            product_description?: number;
            photo_studio?: number;
            suggestion?: number;
        } = {}
    ): Promise<TestResult[]> {
        const results: TestResult[] = [];

        const counts = {
            chat_message: testCounts.chat_message || 25,
            product_description: testCounts.product_description || 20,
            photo_studio: testCounts.photo_studio || 15,
            suggestion: testCounts.suggestion || 20,
        };

        // Generate tests for each operation type
        for (const [opType, count] of Object.entries(counts)) {
            for (let i = 0; i < count; i++) {
                const result = this.generateSimulatedTest(
                    opType as any,
                    `${opType}-test-${i + 1}`
                );
                results.push(result);
                this.testResults.push(result);
            }
        }

        return results;
    }

    /**
     * Generate summary statistics from test results
     */
    generateSummary(): TestSummary {
        if (this.testResults.length === 0) {
            return {
                totalTests: 0,
                operationTypeBreakdown: [],
                totalTokensConsumed: 0,
                totalCostIncurred: 0,
                estimatedMonthlySpend: 0,
            };
        }

        // Group by operation type
        const grouped = this.testResults.reduce((acc, result) => {
            if (!acc[result.operationType]) {
                acc[result.operationType] = [];
            }
            acc[result.operationType].push(result);
            return acc;
        }, {} as Record<string, TestResult[]>);

        // Calculate per-operation-type stats
        const operationTypeBreakdown = Object.entries(grouped).map(([opType, results]) => {
            const avgInputTokens = Math.round(
                results.reduce((sum, r) => sum + r.inputTokens, 0) / results.length
            );
            const avgOutputTokens = Math.round(
                results.reduce((sum, r) => sum + r.outputTokens, 0) / results.length
            );
            const avgTotalTokens = avgInputTokens + avgOutputTokens;
            const avgCost = results.reduce((sum, r) => sum + r.totalCost, 0) / results.length;

            return {
                operationType: opType,
                averageInputTokens: avgInputTokens,
                averageOutputTokens: avgOutputTokens,
                averageTotalTokens: avgTotalTokens,
                averageCost: Math.round(avgCost * 100000) / 100000,
                testCount: results.length,
            };
        });

        // Calculate totals
        const totalTokensConsumed = this.testResults.reduce((sum, r) => sum + r.totalTokens, 0);
        const totalCostIncurred = this.testResults.reduce((sum, r) => sum + r.totalCost, 0);

        // Extrapolate monthly spend (assuming 100 tests per day)
        const costPerTest = totalCostIncurred / this.testResults.length;
        const estimatedMonthlySpend = costPerTest * 100 * 30; // 100 tests/day * 30 days

        return {
            totalTests: this.testResults.length,
            operationTypeBreakdown,
            totalTokensConsumed,
            totalCostIncurred: Math.round(totalCostIncurred * 100000) / 100000,
            estimatedMonthlySpend: Math.round(estimatedMonthlySpend * 100) / 100,
        };
    }

    /**
     * Compare actual usage against simulated baseline
     */
    compareToBaseline(): {
        operationType: string;
        baselineAvg: number;
        actualAvg: number;
        variance: number;
        variancePercent: number;
    }[] {
        const grouped = this.testResults.reduce((acc, result) => {
            if (!acc[result.operationType]) {
                acc[result.operationType] = [];
            }
            acc[result.operationType].push(result);
            return acc;
        }, {} as Record<string, TestResult[]>);

        return Object.entries(grouped).map(([opType, results]) => {
            const baseline = BASELINE_MEASUREMENTS[opType as any];
            const actualAvg = Math.round(
                results.reduce((sum, r) => sum + r.totalTokens, 0) / results.length
            );
            const baselineAvg = baseline.avgInputTokens + baseline.avgOutputTokens;
            const variance = actualAvg - baselineAvg;
            const variancePercent = Math.round((variance / baselineAvg) * 100);

            return {
                operationType: opType,
                baselineAvg,
                actualAvg,
                variance,
                variancePercent,
            };
        });
    }

    /**
     * Export results for analysis
     */
    exportResults(): {
        timestamp: Date;
        testResults: TestResult[];
        summary: TestSummary;
        comparison: ReturnType<TokenConsumptionTestHarness['compareToBaseline']>;
    } {
        return {
            timestamp: new Date(),
            testResults: this.testResults,
            summary: this.generateSummary(),
            comparison: this.compareToBaseline(),
        };
    }

    /**
     * Clear all test results
     */
    clear(): void {
        this.testResults = [];
    }

    /**
     * Get test results for a specific operation type
     */
    getTestsByOperation(operationType: 'chat_message' | 'product_description' | 'photo_studio' | 'suggestion'): TestResult[] {
        return this.testResults.filter(r => r.operationType === operationType);
    }

    /**
     * Get all test results
     */
    getAllResults(): TestResult[] {
        return [...this.testResults];
    }
}

// Singleton instance
export const tokenConsumptionTestHarness = new TokenConsumptionTestHarness();

/**
 * Quick utility function to run a demo test suite
 */
export async function runDemoTokenTests(): Promise<void> {
    console.log('[TOKEN_TEST] Starting demo token consumption tests...');
    
    // Run simulated tests
    const results = await tokenConsumptionTestHarness.runSimulatedTestSuite({
        chat_message: 10,
        product_description: 8,
        photo_studio: 6,
        suggestion: 8,
    });

    const summary = tokenConsumptionTestHarness.generateSummary();
    const comparison = tokenConsumptionTestHarness.compareToBaseline();

    console.log('[TOKEN_TEST] Demo test results:');
    console.log('Summary:', summary);
    console.log('Comparison to Baseline:', comparison);
    console.log('Full export:', tokenConsumptionTestHarness.exportResults());
}
