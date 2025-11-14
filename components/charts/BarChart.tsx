import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const chartHeight = 200;
  const barWidth = 30;
  const barMargin = 15;

  if (data.length === 0) {
      return <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary">No data to display.</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
       <style>{`
        .bar {
          transition: height 0.5s ease-out, y 0.5s ease-out;
        }
        @keyframes bar-grow {
            from { height: 0; y: ${chartHeight}; }
        }
      `}</style>
      <svg width={data.length * (barWidth + barMargin)} height={chartHeight + 40} className="font-sans">
        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * chartHeight : 0;
          return (
            <g key={d.label}>
              <rect
                className="bar fill-current text-brand-primary"
                x={i * (barWidth + barMargin)}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                style={{ animation: `bar-grow 0.5s ${i*0.05}s ease-out both` }}
              >
                 <title>{`${d.label}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(d.value)}`}</title>
              </rect>
              <text
                x={i * (barWidth + barMargin) + barWidth / 2}
                y={chartHeight + 20}
                textAnchor="middle"
                className="text-xs fill-current text-light-text-secondary dark:text-dark-text-secondary truncate"
              >
                {d.label}
              </text>
            </g>
          );
        })}
        <line x1="0" y1={chartHeight} x2={data.length * (barWidth + barMargin)} y2={chartHeight} stroke="#D1D5DB" />
      </svg>
    </div>
  );
};

export default BarChart;