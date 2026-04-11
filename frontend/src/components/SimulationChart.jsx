import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts';

const SimulationChart = ({ data, improvedData }) => {
  // Merge current and improved data for comparison if both are provided
  const combinedData = data.map((item, idx) => ({
    ...item,
    improvedBP: improvedData ? improvedData[idx]?.bp : null,
    improvedSugar: improvedData ? improvedData[idx]?.sugar : null,
  }));

  return (
    <div style={{ width: '100%', height: 400, marginTop: 20 }}>
      <ResponsiveContainer>
        <LineChart data={combinedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
          <XAxis 
            dataKey="day" 
            label={{ value: 'Days In Future', position: 'insideBottom', offset: -5 }} 
          />
          <YAxis />
          <Tooltip 
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
          <Legend verticalAlign="top" height={36}/>
          
          {/* Safe Zones */}
          <ReferenceArea y1={0} y2={130} fill="rgba(76, 175, 80, 0.05)" stroke="none" label={{ position: 'insideTopLeft', value: 'Safe Zone (BP)', fontSize: 10, fill: '#4caf50' }} />
          <ReferenceArea y1={0} y2={140} fill="rgba(76, 175, 80, 0.02)" stroke="none" label={{ position: 'insideTopRight', value: 'Safe Zone (Sugar)', fontSize: 10, fill: '#4caf50' }} />

          {/* Current Path */}
          <Line 
            type="monotone" 
            dataKey="bp" 
            name="BP (Systolic) - Current" 
            stroke="#f44336" 
            strokeWidth={3}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
          <Line 
            type="monotone" 
            dataKey="sugar" 
            name="Sugar - Current" 
            stroke="#ff9800" 
            strokeWidth={3}
            dot={{ r: 4 }}
          />

          {/* Improved Path */}
          {improvedData && (
            <>
              <Line 
                type="monotone" 
                dataKey="improvedBP" 
                name="BP (Systolic) - Improved" 
                stroke="#4caf50" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                type="monotone" 
                dataKey="improvedSugar" 
                name="Sugar - Improved" 
                stroke="#2196f3" 
                strokeDasharray="5 5"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SimulationChart;
