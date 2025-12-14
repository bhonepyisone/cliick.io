import React, { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
}

interface SimpleBarChartProps {
    data: DataPoint[];
    title: string;
    color?: string;
    height?: number;
    className?: string;
}

/**
 * Simple SVG-based bar chart component for analytics visualization
 * Lightweight, no external dependencies, fully responsive
 */
const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
    data,
    title,
    color = '#3B82F6',
    height = 200,
    className = ''
}) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);

    const barWidth = useMemo(() => {
        return Math.max(20, Math.min(60, 100 / data.length - 10));
    }, [data.length]);

    return (
        <div className={`bg-gray-800 rounded-lg p-4 md:p-6 ${className}`}>
            <h3 className="text-sm md:text-base font-semibold text-white mb-4">{title}</h3>
            <div className="w-full overflow-x-auto">
                <svg
                    width="100%"
                    height={height}
                    className="min-w-full"
                    viewBox={`0 0 ${data.length * 80} ${height}`}
                    preserveAspectRatio="xMidYMid meet"
                >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
                        const y = height - 40 - (percent * (height - 60));
                        return (
                            <g key={i}>
                                <line
                                    x1="0"
                                    y1={y}
                                    x2={data.length * 80}
                                    y2={y}
                                    stroke="#374151"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x="-5"
                                    y={y + 4}
                                    fill="#9CA3AF"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {Math.round(maxValue * percent)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {data.map((item, index) => {
                        const barHeight = (item.value / maxValue) * (height - 60);
                        const x = index * 80 + 40 - barWidth / 2;
                        const y = height - 40 - barHeight;

                        return (
                            <g key={index}>
                                {/* Bar */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barHeight}
                                    fill={color}
                                    rx="4"
                                    className="transition-all duration-300 hover:opacity-80"
                                />
                                
                                {/* Value on top of bar */}
                                <text
                                    x={index * 80 + 40}
                                    y={y - 5}
                                    fill="#E5E7EB"
                                    fontSize="12"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                >
                                    {item.value}
                                </text>

                                {/* Label */}
                                <text
                                    x={index * 80 + 40}
                                    y={height - 20}
                                    fill="#9CA3AF"
                                    fontSize="11"
                                    textAnchor="middle"
                                    className="truncate"
                                >
                                    {item.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};

export default SimpleBarChart;
