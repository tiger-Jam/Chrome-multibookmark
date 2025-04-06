import React, { useState, useEffect } from 'react';

interface Weather {
  date: string;
  temperatureC: number;
  summary: string;
}

const App: React.FC = () => {
  const [weatherData, setWeatherData] = useState<Weather[]>([]);

  useEffect(() => {
    fetch('http://localhost:5043/weatherforecast')
      .then((response) => response.json())
      .then((data) => setWeatherData(data))
      .catch((error) => console.error('Error fetching weather data:', error));
  }, []);

  return (
    <div>
      <h1>Weather Forecast</h1>
      <ul>
        {weatherData.map((item, index) => (
          <li key={index}>
            <strong>{item.date}</strong>: {item.temperatureC}°C - {item.summary}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default App;
