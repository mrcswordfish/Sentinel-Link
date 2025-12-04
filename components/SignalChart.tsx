import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { SignalDataPoint } from '../types';

interface SignalChartProps {
  data: SignalDataPoint[];
}

export const SignalChart: React.FC<SignalChartProps> = ({ data }) => {
  return (
    <div className="w-full h-full min-h-[150px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
           <defs>
            <linearGradient id="colorStrength" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00cc66" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#00cc66" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="time" 
            tick={{fontSize: 10, fill: '#666'}} 
            axisLine={false}
            tickLine={false}
          />
          <YAxis 
            hide={true} 
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '4px' }}
            itemStyle={{ color: '#00cc66', fontFamily: 'monospace' }}
          />
          <Area 
            type="monotone" 
            dataKey="strength" 
            stroke="#00cc66" 
            fillOpacity={1} 
            fill="url(#colorStrength)" 
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};