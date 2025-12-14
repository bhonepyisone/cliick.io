import React, { useMemo } from 'react';

interface DataPoint {
    label: string;
    value: number;
}

interface SimpleLineChartProps {
    data: DataPoint[];
    title: string;
    color?: string;
    height?: number;
    className?: string;
}

/**
 * Simple SVG-based line chart component for trend visualization
 * Lightweight, no external dependencies, fully responsive
 */
const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
    data,
    title,
    color = '#10B981',
    height = 200,
    className = ''
}) => {
    const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
    const minValue = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
    const range = maxValue - minValue || 1;

    const points = useMemo(() => {
        if (data.length === 0) return '';
        
        const padding = 20;
        const chartWidth = data.length * 80;
        const chartHeight = height - 60;

        return data.map((point, index) => {
            const x = (index / (data.length - 1 || 1)) * (chartWidth - 2 * padding) + padding;
            const normalizedValue = (point.value - minValue) / range;
            const y = height - 40 - (normalizedValue * chartHeight);
            return `${x},${y}`;
        }).join(' ');
    }, [data, height, maxValue, minValue, range]);

    const areaPath = useMemo(() => {
        if (data.length === 0 || !points) return '';
        
        const padding = 20;
        const chartWidth = data.length * 80;
        const pointsArray = points.split(' ');
        const firstPoint = pointsArray[0];
        const lastPoint = pointsArray[pointsArray.length - 1];
        const [firstX] = firstPoint.split(',');
        const [lastX] = lastPoint.split(',');
        
        return `M ${firstX},${height - 40} L ${points} L ${lastX},${height - 40} Z`;
    }, [points, data.length, height]);

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
                        const value = minValue + (range * percent);
                        const y = height - 40 - (percent * (height - 60));
                        return (
                            <g key={i}>
                                <line
                                    x1="20"
                                    y1={y}
                                    x2={data.length * 80}
                                    y2={y}
                                    stroke="#374151"
                                    strokeWidth="1"
                                    strokeDasharray="4,4"
                                />
                                <text
                                    x="10"
                                    y={y + 4}
                                    fill="#9CA3AF"
                                    fontSize="10"
                                    textAnchor="end"
                                >
                                    {Math.round(value)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Area under the line */}
                    {areaPath && (
                        <path
                            d={areaPath}
                            fill={color}
                            fillOpacity="0.1"
                        />
                    )}

                    {/* Line */}
                    {points && (
                        <polyline
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {/* Data points */}
                    {data.map((item, index) => {
                        const x = (index / (data.length - 1 || 1)) * (data.length * 80 - 40) + 20;
                        const normalizedValue = (item.value - minValue) / range;
                        const y = height - 40 - (normalizedValue * (height - 60));

                        return (
                            <g key={index}>
                                {/* Point circle */}
                                <circle
                                    cx={x}
                                    cy={y}
                                    r="4"
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="2"
                                    className="transition-all duration-300 hover:r-6"
                                />

                                {/* Label */}
                                <text
                                    x={x}
                                    y={height - 20}
                                    fill="#9CA3AF"
                                    fontSize="11"
                                    textAnchor="middle"
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

export default SimpleLineChart;
