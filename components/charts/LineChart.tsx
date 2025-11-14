import React from 'react';

interface LineChartProps {
  data: { label: string; value: number }[];
}

const LineChart: React.FC<LineChartProps> = ({ data }) => {
  if (data.length < 2) {
    return <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary">Not enough data to draw a trend.</p>;
  }

  const width = 500;
  const height = 200;
  const padding = 40;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = 0; // Or Math.min(...)

  const getX = (index: number) => padding + (index / (data.length - 1)) * (width - 2 * padding);
  const getY = (value: number) => height - padding - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding);

  const pathData = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.value)}`).join(' ');

  return (
    <div className="w-full overflow-x-auto">
        <style>{`
            .line-path {
                stroke-dasharray: 1000;
                stroke-dashoffset: 1000;
                animation: line-draw 2s ease-out forwards;
            }
            .line-dot {
                animation: dot-fade-in 0.5s ease-out forwards;
                opacity: 0;
            }
            @keyframes line-draw {
                to { stroke-dashoffset: 0; }
            }
            @keyframes dot-fade-in {
                to { opacity: 1; }
            }
        `}</style>
      <svg viewBox={`0 0 ${width} ${height}`} className="font-sans">
        {/* Y-axis labels */}
        {[0, 0.5, 1].map(tick => (
          <text key={tick} x={padding - 10} y={getY(maxValue * tick)} textAnchor="end" dy="0.3em" className="text-xs fill-current text-light-text-secondary dark:text-dark-text-secondary">
            {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact' }).format(maxValue * tick)}
          </text>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
            (i === 0 || i === data.length - 1 || data.length < 10) && (
              <text key={d.label} x={getX(i)} y={height - padding + 20} textAnchor="middle" className="text-xs fill-current text-light-text-secondary dark:text-dark-text-secondary">
                {new Date(d.label).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
              </text>
            )
        ))}

        {/* Line */}
        <path d={pathData} fill="none" stroke="#059669" strokeWidth="2" className="line-path" />

        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={getX(i)} cy={getY(d.value)} r="3" fill="#059669" className="line-dot" style={{ animationDelay: `${(i / data.length) * 1.5}s` }}>
            <title>{`${new Date(d.label).toLocaleDateString('en-IN')}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(d.value)}`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
};

export default LineChart;