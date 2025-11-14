import React from 'react';

interface PieChartProps {
  data: { label: string; value: number }[];
}

const COLORS = ['#059669', '#34D399', '#60A5FA', '#FBBF24', '#F87171', '#A78BFA'];

const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.reduce((acc, item) => acc + item.value, 0);
  let accumulatedAngle = 0;

  if (total === 0) return <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary">No data to display.</p>;

  const pieSlices = data.map((item, index) => {
    const angle = (item.value / total) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    const endAngle = accumulatedAngle;

    const largeArcFlag = angle > 180 ? 1 : 0;

    const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
    const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
    const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
    const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

    const pathData = `M 50,50 L ${startX},${startY} A 40,40 0 ${largeArcFlag},1 ${endX},${endY} Z`;

    return (
      <path
        key={index}
        d={pathData}
        fill={COLORS[index % COLORS.length]}
        style={{ animation: `pie-fade-in 0.5s ${index * 0.1}s ease-out both` }}
      >
        <title>{`${item.label}: ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(item.value)} (${((item.value/total)*100).toFixed(1)}%)`}</title>
      </path>
    );
  });

  return (
    <div className="flex flex-col items-center gap-6">
       <style>{`
        @keyframes pie-fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <svg viewBox="0 0 100 100" className="w-40 h-40 flex-shrink-0">
        {pieSlices}
      </svg>
      <div className="w-full">
        <ul className="space-y-2">
          {data.map((item, index) => (
            <li key={index} className="flex justify-between items-center text-sm">
              <div className="flex items-center truncate">
                <span
                  className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></span>
                <span className="text-light-text-primary dark:text-dark-text-primary truncate">{item.label}</span>
              </div>
              <span className="font-semibold text-light-text-secondary dark:text-dark-text-secondary whitespace-nowrap ml-2">
                {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(item.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PieChart;