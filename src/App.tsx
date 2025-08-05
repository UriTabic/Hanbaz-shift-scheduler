import React, { useState } from 'react';
import { Clock, Users, Calculator } from 'lucide-react';
import './App.css';

const ShiftScheduler = () => {
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [numShifts, setNumShifts] = useState(9);
  const [results, setResults] = useState(null);

  // Convert time string to minutes from midnight
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} `;
  };

  // Round to nearest 5 minutes
  const roundToFiveMinutes = (minutes) => {
    return Math.round(minutes / 5) * 5;
  };

  // Round time to nearest 5 minutes - handle :15, :30, :45 properly
  const roundTimeToFiveMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const roundedMinutes = Math.round(totalMinutes / 5) * 5;
    return minutesToTime(roundedMinutes);
  };

  // Handle time input changes - allow any input, round on blur
  const handleTimeBlur = (value, setter) => {
    const roundedTime = roundTimeToFiveMinutes(value);
    setter(roundedTime);
  };

  // Calculate total duration handling overnight shifts
  const calculateDuration = (start, end) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);

    if (endMins <= startMins) {
      // Overnight shift: add 24 hours to end time
      return (endMins + 24 * 60) - startMins;
    }
    return endMins - startMins;
  };

  // Generate shift times
  const generateShifts = (startMins, shiftDurations) => {
    const shifts = [];
    let currentStart = startMins;

    shiftDurations.forEach((duration, index) => {
      const shiftStart = currentStart % (24 * 60);
      const shiftEnd = (currentStart + duration) % (24 * 60);

      shifts.push({
        shiftNumber: index + 1,
        startTime: minutesToTime(shiftStart),
        endTime: minutesToTime(shiftEnd),
        duration: `${Math.floor(duration / 60)} שעות ${String(duration % 60)} דקות`
      });

      currentStart += duration;
    });

    return shifts;
  };

  // Component for the interactive slider table
  const SliderTable = ({ strategy }) => {
    // Round initial value to nearest 5 minutes
    const initialFirstExtra = Math.round(Math.floor(strategy.remainder / 2) / 5) * 5;
    const [firstShiftExtra, setFirstShiftExtra] = useState(initialFirstExtra);

    const generateSliderShifts = (firstExtra) => {
      const shifts = [...strategy.baseShifts];
      const lastExtra = strategy.remainder - firstExtra;
      shifts[0] += firstExtra;
      shifts[numShifts - 1] += lastExtra;
      return shifts;
    };

    const currentShifts = generateSliderShifts(firstShiftExtra);
    const startMins = timeToMinutes(strategy.adjustedStartTime);
    const shiftData = generateShifts(startMins, currentShifts);

    return (
      <div>
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            חלקו {strategy.remainder} דקות בין השמירה הראשונה והאחרונה (קפיצות של 5 דקות):
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 min-w-fit">ראשון: +{firstShiftExtra} דקות</span>
            <input
              type="range"
              min="0"
              max={strategy.remainder}
              step="5"
              value={firstShiftExtra}
              onChange={(e) => setFirstShiftExtra(parseInt(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <span className="text-sm text-gray-600 min-w-fit">אחרון: +{strategy.remainder - firstShiftExtra} דקות</span>
          </div>
          <div className="text-center text-xs text-gray-500 mt-1">
            בסיס: {Math.floor(strategy.baseShifts[0] / 60)} שעות {String(strategy.baseShifts[0] % 60)} דקות + תוספת
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">שמירה</th>
                <th className="border border-gray-300 px-4 py-2 text-left">זמן התחלה</th>
                <th className="border border-gray-300 px-4 py-2 text-left">זמן סיום</th>
                <th className="border border-gray-300 px-4 py-2 text-left">משך</th>
              </tr>
            </thead>
            <tbody>
              {shiftData.map((shift) => (
                <tr key={shift.shiftNumber} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2 font-medium">
                    {shift.shiftNumber}
                  </td>
                  <td className="border border-gray-300 px-4 py-2">{shift.startTime}</td>
                  <td className="border border-gray-300 px-4 py-2">{shift.endTime}</td>
                  <td className="border border-gray-300 px-4 py-2">{shift.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const calculateShifts = () => {
    const totalDuration = calculateDuration(startTime, endTime);
    const baseDuration = totalDuration / numShifts;
    const startMins = timeToMinutes(startTime);

    // Check if we can divide equally with 5-minute intervals
    const perfectShiftDuration = roundToFiveMinutes(baseDuration);
    const canDivideEqually = (perfectShiftDuration * numShifts) === totalDuration;

    if (canDivideEqually) {
      // Simple case: divide equally
      const equalShifts = Array(numShifts).fill(perfectShiftDuration);

      setResults({
        totalDuration: `${Math.floor(totalDuration / 60)} שעות ${String(totalDuration % 60)} דקות`,
        canDivideEqually: true,
        strategies: [{
          // name: 'חלוקה מושלמת',
          // description: 'חלוקה מושלמת!',
          shifts: generateShifts(startMins, equalShifts),
          totalTime: equalShifts.reduce((sum, duration) => sum + duration, 0),
          adjustedStartTime: startTime,
          adjustedEndTime: endTime
        }]
      });
    } else {
      // Need 3 strategies
      const maxShiftDuration = Math.floor(baseDuration / 5) * 5; // Round down to 5min
      const remainder = totalDuration - (maxShiftDuration * numShifts);

      // Strategy B: Add time to make equal shifts (adjust start time earlier)
      const equalDurationUp = Math.ceil(baseDuration / 5) * 5; // Round up to 5min
      const timeToAdd = (equalDurationUp * numShifts) - totalDuration;
      const adjustedStartTimeB = minutesToTime(startMins - timeToAdd);
      const equalShiftsB = Array(numShifts).fill(equalDurationUp);

      // Strategy C: Subtract time to make equal shifts (adjust start time later)
      const equalDurationDown = Math.floor(baseDuration / 5) * 5; // Round down to 5min
      const timeToSubtract = totalDuration - (equalDurationDown * numShifts);
      const adjustedStartTimeC = minutesToTime(startMins + timeToSubtract);
      const equalShiftsC = Array(numShifts).fill(equalDurationDown);

      setResults({
        totalDuration: `${Math.floor(totalDuration / 60)} שעות ${String(totalDuration % 60)} דקות`,
        canDivideEqually: false,
        strategies: [
          {
            name: 'מיקסום זמן שמירה',
            description: `שימוש בזמן שווה מקסימלי (${Math.floor(maxShiftDuration / 60)} שעות ${String(maxShiftDuration % 60)} דקות), לחלק את שארית הדקות (${remainder})`,
            hasSlider: true,
            baseShifts: Array(numShifts).fill(maxShiftDuration),
            remainder: remainder,
            adjustedStartTime: startTime,
            adjustedEndTime: endTime
          },
          {
            name: 'להתחיל קודם (להוסיף זמן)',
            description: `להוסיף ${timeToAdd} דקות ולהתחיל מוקדם יותר כדי להשוות את זמן השמירות`,
            shifts: generateShifts(startMins - timeToAdd, equalShiftsB),
            totalTime: equalShiftsB.reduce((sum, duration) => sum + duration, 0),
            adjustedStartTime: adjustedStartTimeB,
            adjustedEndTime: endTime
          },
          {
            name: 'להתחיל אחרי (לחסר זמן)',
            description: `חיסור ${timeToSubtract} דקות ולהתחיל יותר מאוחר כדי להשוות את זמן השמירות`,
            shifts: generateShifts(startMins + timeToSubtract, equalShiftsC),
            totalTime: equalShiftsC.reduce((sum, duration) => sum + duration, 0),
            adjustedStartTime: adjustedStartTimeC,
            adjustedEndTime: endTime
          }
        ]
      });
    }
  };

  const formatTotalTime = (minutes) => {
    return `${Math.floor(minutes / 60)} שעות ${String(minutes % 60)} דקות`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Clock className="text-blue-600" />
          מנהל שמירות
        </h1>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              זמן התחלה
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={(e) => handleTimeBlur(e.target.value, setStartTime)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              זמן סיום
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={(e) => handleTimeBlur(e.target.value, setEndTime)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Users size={16} />
              מספר שמירות
            </label>
            <input
              type="number"
              min="2"
              max="12"
              value={numShifts}
              onChange={(e) => setNumShifts(parseInt(e.target.value))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <button
          onClick={calculateShifts}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Calculator size={20} />
          חישוב השמירות
        </button>

        {timeToMinutes(endTime) <= timeToMinutes(startTime) && (
          <div className="mt-4 p-3 bg-blue-100 border border-blue-300 rounded-lg">
            <p className="text-blue-800 text-sm">
              📅 זוהתה שמירת לילה: מ{startTime} עד {endTime} למחרת
            </p>
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              סך זמן השמירות: {results.totalDuration}
            </h2>
            {results.canDivideEqually && (
              <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ מושלם! ניתן לחלק ל {numShifts} שמירות עגולות
                </p>
              </div>
            )}
            {!results.canDivideEqually && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                <p className="text-yellow-800 text-sm">
                  ⚠️ אי אפשר לחלק לשמירות עגולות, הנה 3 אלטרנטיבות:
                </p>
              </div>
            )}
          </div>

          {results.strategies.map((strategy, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-800">
                    {results.canDivideEqually ? strategy.name : `אפשרות ${index === 0 ? "א" : (index === 1 ? "ב" : "ג")}: ${strategy.name}`}
                  </h3>
                  <p className="text-gray-600 text-sm">{strategy.description}</p>
                  {strategy.adjustedStartTime && strategy.adjustedStartTime !== startTime && (
                    <p className="text-blue-600 text-sm mt-1">
                      📅 לוז חדש: {strategy.adjustedStartTime} - {strategy.adjustedEndTime}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">סך זמן השמירות: {strategy.hasSlider ? formatTotalTime(strategy.baseShifts.reduce((sum, d) => sum + d, 0) + strategy.remainder) : formatTotalTime(strategy.totalTime)}</p>

                </div>
              </div>

              <div className="overflow-x-auto">
                {strategy.hasSlider ? (
                  <SliderTable strategy={strategy} />
                ) : (
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-4 py-2 text-left">שמירה</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">זמן התחלה</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">זמן סיום</th>
                        <th className="border border-gray-300 px-4 py-2 text-left">משך</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategy.shifts.map((shift) => (
                        <tr key={shift.shiftNumber} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-4 py-2 font-medium">
                            {shift.shiftNumber}
                          </td>
                          <td className="border border-gray-300 px-4 py-2">{shift.startTime}</td>
                          <td className="border border-gray-300 px-4 py-2">{shift.endTime}</td>
                          <td className="border border-gray-300 px-4 py-2">{shift.duration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ShiftScheduler;