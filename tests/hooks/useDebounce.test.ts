/**
 * useDebounce Hook Tests
 * Tests for the debouncing utility hook
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDebounce, useDebouncedCallback } from '../../hooks/useDebounce';

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    describe('useDebounce value', () => {
        it('should return initial value immediately', () => {
            const { result } = renderHook(() => useDebounce('initial', 300));
            expect(result.current).toBe('initial');
        });

        it('should debounce value changes', async () => {
            const { result, rerender } = renderHook(
                ({ value, delay }) => useDebounce(value, delay),
                { initialProps: { value: 'initial', delay: 300 } }
            );

            expect(result.current).toBe('initial');

            // Change value
            rerender({ value: 'updated', delay: 300 });
            
            // Value should not change immediately
            expect(result.current).toBe('initial');

            // Fast-forward time
            vi.advanceTimersByTime(300);

            // Wait for state update
            await waitFor(() => {
                expect(result.current).toBe('updated');
            });
        });

        it('should reset timer on rapid changes', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 300),
                { initialProps: { value: 'initial' } }
            );

            // Rapid changes
            rerender({ value: 'change1' });
            vi.advanceTimersByTime(100);
            
            rerender({ value: 'change2' });
            vi.advanceTimersByTime(100);
            
            rerender({ value: 'change3' });
            vi.advanceTimersByTime(100);

            // Should still be initial (timer keeps resetting)
            expect(result.current).toBe('initial');

            // Wait full delay
            vi.advanceTimersByTime(200);

            await waitFor(() => {
                expect(result.current).toBe('change3');
            });
        });

        it('should use custom delay', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 500),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            vi.advanceTimersByTime(300);
            expect(result.current).toBe('initial');

            vi.advanceTimersByTime(200);
            await waitFor(() => {
                expect(result.current).toBe('updated');
            });
        });
    });

    describe('useDebouncedCallback', () => {
        it('should debounce callback execution', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebouncedCallback(callback, 300));

            // Call multiple times rapidly
            result.current('arg1');
            result.current('arg2');
            result.current('arg3');

            // Callback should not be called yet
            expect(callback).not.toHaveBeenCalled();

            // Fast-forward time
            vi.advanceTimersByTime(300);

            // Callback should be called once with last arguments
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('arg3');
        });

        it('should cancel previous timeout on new call', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebouncedCallback(callback, 300));

            result.current('arg1');
            vi.advanceTimersByTime(100);

            result.current('arg2');
            vi.advanceTimersByTime(100);

            result.current('arg3');
            vi.advanceTimersByTime(100);

            // Not enough time has passed
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(200);

            // Should be called once with last args
            expect(callback).toHaveBeenCalledTimes(1);
            expect(callback).toHaveBeenCalledWith('arg3');
        });

        it('should use custom delay for callback', () => {
            const callback = vi.fn();
            const { result } = renderHook(() => useDebouncedCallback(callback, 500));

            result.current('test');
            
            vi.advanceTimersByTime(300);
            expect(callback).not.toHaveBeenCalled();

            vi.advanceTimersByTime(200);
            expect(callback).toHaveBeenCalledWith('test');
        });

        it('should handle multiple arguments', () => {
            const callback = vi.fn();
            const { result } = renderHook(() =>
                useDebouncedCallback((a: string, b: number, c: boolean) => callback(a, b, c), 300)
            );

            result.current('test', 123, true);
            vi.advanceTimersByTime(300);

            expect(callback).toHaveBeenCalledWith('test', 123, true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle zero delay', async () => {
            const { result, rerender } = renderHook(
                ({ value }) => useDebounce(value, 0),
                { initialProps: { value: 'initial' } }
            );

            rerender({ value: 'updated' });
            
            vi.advanceTimersByTime(0);

            await waitFor(() => {
                expect(result.current).toBe('updated');
            });
        });

        it('should cleanup timeout on unmount', () => {
            const { unmount } = renderHook(() => useDebounce('test', 300));
            
            // Should not throw error
            expect(() => unmount()).not.toThrow();
        });
    });
});
