import React, { useState, useEffect } from 'react';
import { Clock, Users, Calculator, Copy, Plus, ToggleLeft, ToggleRight, Save, Trash2, UserPlus } from 'lucide-react';

const ShiftScheduler = () => {
  const [startTime, setStartTime] = useState('22:00');
  const [endTime, setEndTime] = useState('06:00');
  const [numShifts, setNumShifts] = useState(9);
  const [autoCalculateShifts, setAutoCalculateShifts] = useState(false);
  const [results, setResults] = useState(null);
  const [simplifiedView, setSimplifiedView] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [nameList, setNameList] = useState([]);
  const [copySuccess, setCopySuccess] = useState('');
  const [pairingMode, setPairingMode] = useState(false);

  useEffect(() => {
    try {
      const savedNames = JSON.parse(localStorage.getItem('shiftSchedulerNames') || '[]');
      if (Array.isArray(savedNames)) {
        setNameList(savedNames);
      }
    } catch (error) {
      console.error('Error loading names from localStorage:', error);
    }
  }, []);

  const getEffectiveNumShifts = () => {
    if (autoCalculateShifts) {
      const presentCount = nameList.filter(p => p.present).length;
      if (pairingMode) {
        // In pairing mode, number of shifts = number of pairs (rounded up for odd numbers)
        return presentCount > 0 ? Math.ceil(presentCount / 2) : 1;
      }
      return presentCount > 0 ? presentCount : 2;
    }
    return numShifts;
  };

  const saveNamesToStorage = () => {
    try {
      localStorage.setItem('shiftSchedulerNames', JSON.stringify(nameList));
      setCopySuccess('רשימת השמות נשמרה!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (error) {
      setCopySuccess('שגיאה בשמירה');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const clearAllNames = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את כל השמות?')) {
      setNameList([]);
      localStorage.removeItem('shiftSchedulerNames');
      setCopySuccess('כל השמות נמחקו');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
  };

  const roundToFiveMinutes = (minutes) => {
    return Math.round(minutes / 5) * 5;
  };

  const roundTimeToFiveMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const roundedMinutes = Math.round(totalMinutes / 5) * 5;
    return minutesToTime(roundedMinutes);
  };

  const handleTimeBlur = (value, setter) => {
    const roundedTime = roundTimeToFiveMinutes(value);
    setter(roundedTime);
  };

  const addName = () => {
    if (nameInput.trim() && !nameList.find(person => person.name === nameInput.trim())) {
      setNameList([...nameList, { name: nameInput.trim(), present: true }]);
      setNameInput('');
    }
  };

  const togglePresence = (index) => {
    const newList = [...nameList];
    newList[index].present = !newList[index].present;
    setNameList(newList);
  };

  const removeName = (index) => {
    const newList = nameList.filter((_, i) => i !== index);
    setNameList(newList);
  };

  const getPresentNames = () => {
    const presentNames = nameList.filter(person => person.present).map(person => person.name);
    const shuffled = [...presentNames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    if (pairingMode) {
      // Create pairs of names
      const pairs = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          pairs.push(`${shuffled[i]} + ${shuffled[i + 1]}`);
        } else {
          // If odd number, last person is alone
          pairs.push(shuffled[i]);
        }
      }
      return pairs;
    }

    return shuffled;
  };

  const calculateDuration = (start, end) => {
    const startMins = timeToMinutes(start);
    const endMins = timeToMinutes(end);

    if (endMins <= startMins) {
      return (endMins + 24 * 60) - startMins;
    }
    return endMins - startMins;
  };

  const generateShifts = (startMins, shiftDurations, names = []) => {
    const shifts = [];
    let currentStart = startMins;

    shiftDurations.forEach((duration, index) => {
      const shiftStart = currentStart % (24 * 60);
      const shiftEnd = (currentStart + duration) % (24 * 60);

      shifts.push({
        shiftNumber: index + 1,
        startTime: minutesToTime(shiftStart),
        endTime: minutesToTime(shiftEnd),
        duration: `${Math.floor(duration / 60)} שעות ${String(duration % 60)} דקות`,
        name: names[index] || ''
      });

      currentStart += duration;
    });

    return shifts;
  };

  const formatTotalTime = (totalMinutes) => {
    return `${Math.floor(totalMinutes / 60)} שעות ${String(totalMinutes % 60)} דקות`;
  };

  const copyToClipboard = (strategy = null) => {
    let textToCopy = '';
    try {

      if (simplifiedView) {
        // For simplified view
        const presentNames = getPresentNames();
        const totalDuration = calculateDuration(startTime, endTime);
        const effectiveNumShifts = getEffectiveNumShifts();
        const baseDuration = Math.floor(totalDuration / effectiveNumShifts);
        const rem = totalDuration % effectiveNumShifts;
        const shiftDurations = Array(effectiveNumShifts).fill(baseDuration).map((d, i) => d + (i < rem ? 1 : 0));
        const startMins = timeToMinutes(startTime);
        const shiftData = generateShifts(startMins, shiftDurations, presentNames);
        const hasNames = presentNames.length > 0;

        textToCopy = 'לוח שמירות\n\n';
        shiftData.forEach(shift => {
          textToCopy += `שמירה ${shift.shiftNumber}`;
          if (hasNames && shift.name) {
            textToCopy += ` - ${shift.name}`;
          }
          textToCopy += `: ${shift.startTime}-${shift.endTime}\n`;
        });
      } else if (strategy && strategy.shifts) {
        // For specific strategy
        textToCopy = `${strategy.name || 'לוח שמירות'}\n\n`;
        strategy.shifts.forEach(shift => {
          textToCopy += `שמירה ${shift.shiftNumber}`;
          if (shift.name) {
            textToCopy += ` - ${shift.name}`;
          }
          textToCopy += `: ${shift.startTime}-${shift.endTime} (${shift.duration})\n`;
        });
      }

      // Use modern clipboard API if available, fallback to text area method
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          setCopySuccess('הועתק בהצלחה!');
          setTimeout(() => setCopySuccess(''), 2000);
        }).catch(err => {
          fallbackCopyTextToClipboard(textToCopy);
        });
      } else {
        fallbackCopyTextToClipboard(textToCopy);
      }
    } catch (error) {
      fallbackCopyTextToClipboard(textToCopy);
    }
  };

  const fallbackCopyTextToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      setCopySuccess('הועתק בהצלחה!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      setCopySuccess('שגיאה בהעתקה');
      setTimeout(() => setCopySuccess(''), 2000);
    }

    document.body.removeChild(textArea);
  };

  const SliderTable = ({ strategy, presentNames }) => {
    const effectiveNumShifts = getEffectiveNumShifts();
    const initialFirstExtra = Math.round(Math.floor(strategy.remainder / 2) / 5) * 5;
    const [firstShiftExtra, setFirstShiftExtra] = useState(initialFirstExtra);

    const generateSliderShifts = (firstExtra) => {
      const shifts = [...strategy.baseShifts];
      const lastExtra = strategy.remainder - firstExtra;
      shifts[0] += firstExtra;
      shifts[effectiveNumShifts - 1] += lastExtra;
      return shifts;
    };

    const currentShifts = generateSliderShifts(firstShiftExtra);
    const startMins = timeToMinutes(strategy.adjustedStartTime);
    const shiftData = generateShifts(startMins, currentShifts, presentNames);
    const hasNames = presentNames.length > 0;

    return (
      <div>
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            חלקו {strategy.remainder} דקות בין השמירה הראשונה והאחרונה (קפיצות של 5 דקות):
          </label>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 min-w-fit">ראשון: +{firstShiftExtra} דקות</span>
            <input
              style={{ width: "90%" }}
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

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'center',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {hasNames && (
                  <th style={{
                    padding: '0.5rem 1rem',
                    textAlign: 'center',
                    fontWeight: '700'
                  }}>שומר</th>
                )}
                <th style={{
                  // padding: '0.5rem 1rem',
                  textAlign: 'center',
                  fontWeight: '700'
                }}>שמירה</th>
                <th style={{
                  padding: '0.5rem 1rem',
                  textAlign: 'center',
                  fontWeight: '700'
                }}>זמן התחלה</th>
                <th style={{
                  padding: '0.5rem 1rem',
                  textAlign: 'center',
                  fontWeight: '700'
                }}>זמן סיום</th>
                <th style={{
                  padding: '0.5rem 1rem',
                  textAlign: 'center',
                  fontWeight: '700'
                }}>משך</th>
              </tr>
            </thead>
            <tbody>
              {shiftData.map((shift) => (
                <tr
                  key={shift.shiftNumber}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                >
                  {hasNames && (
                    <td style={{
                      padding: '0.5rem 1rem',
                      fontWeight: '700'
                    }}>{shift.name}</td>
                  )}
                  <td style={{
                    padding: '0.5rem 1rem',
                    fontWeight: '700'
                  }}>{shift.shiftNumber}</td>
                  <td style={{
                    padding: '0.5rem 1rem',
                    fontWeight: '700'
                  }}>{shift.startTime}</td>
                  <td style={{
                    padding: '0.5rem 1rem',
                    fontWeight: '700'
                  }}>{shift.endTime}</td>
                  <td style={{
                    padding: '0.5rem 1rem',
                    fontWeight: '700'
                  }}>{shift.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const calculateShifts = () => {
    const presentNames = getPresentNames();
    const effectiveNumShifts = getEffectiveNumShifts();
    const totalDuration = calculateDuration(startTime, endTime);
    const baseDuration = totalDuration / effectiveNumShifts;
    const startMins = timeToMinutes(startTime);

    const perfectShiftDuration = roundToFiveMinutes(baseDuration);
    const canDivideEqually = (perfectShiftDuration * effectiveNumShifts) === totalDuration;

    if (canDivideEqually) {
      const equalShifts = Array(effectiveNumShifts).fill(perfectShiftDuration);

      setResults({
        totalDuration: `${Math.floor(totalDuration / 60)} שעות ${String(totalDuration % 60)} דקות`,
        canDivideEqually: true,
        effectiveNumShifts: effectiveNumShifts,
        strategies: [{
          shifts: generateShifts(startMins, equalShifts, presentNames),
          totalTime: equalShifts.reduce((sum, duration) => sum + duration, 0),
          adjustedStartTime: startTime,
          adjustedEndTime: endTime
        }]
      });
    } else {
      const maxShiftDuration = Math.floor(baseDuration / 5) * 5;
      const remainder = totalDuration - (maxShiftDuration * effectiveNumShifts);

      const equalDurationUp = Math.ceil(baseDuration / 5) * 5;
      const timeToAdd = (equalDurationUp * effectiveNumShifts) - totalDuration;
      const adjustedStartTimeB = minutesToTime(startMins - timeToAdd);
      const equalShiftsB = Array(effectiveNumShifts).fill(equalDurationUp);

      const equalDurationDown = Math.floor(baseDuration / 5) * 5;
      const timeToSubtract = totalDuration - (equalDurationDown * effectiveNumShifts);
      const adjustedStartTimeC = minutesToTime(startMins + timeToSubtract);
      const equalShiftsC = Array(effectiveNumShifts).fill(equalDurationDown);

      setResults({
        totalDuration: `${Math.floor(totalDuration / 60)} שעות ${String(totalDuration % 60)} דקות`,
        canDivideEqually: false,
        effectiveNumShifts: effectiveNumShifts,
        strategies: [
          {
            name: 'מיקסום זמן שמירה',
            description: `שימוש בזמן שווה מקסימלי (${Math.floor(maxShiftDuration / 60)} שעות ${String(maxShiftDuration % 60)} דקות), לחלק את שארית הדקות (${remainder})`,
            hasSlider: true,
            baseShifts: Array(effectiveNumShifts).fill(maxShiftDuration),
            remainder: remainder,
            adjustedStartTime: startTime,
            adjustedEndTime: endTime
          },
          {
            name: 'להתחיל קודם (להוסיף זמן)',
            description: `להוסיף ${timeToAdd} דקות ולהתחיל מוקדם יותר כדי להשוות את זמן השמירות`,
            shifts: generateShifts(startMins - timeToAdd, equalShiftsB, presentNames),
            totalTime: equalShiftsB.reduce((sum, duration) => sum + duration, 0),
            adjustedStartTime: adjustedStartTimeB,
            adjustedEndTime: endTime
          },
          {
            name: 'להתחיל מאוחר (להפחית זמן)',
            description: `להפחית ${timeToSubtract} דקות ולהתחיל מאוחר יותר כדי להשוות את זמן השמירות`,
            shifts: generateShifts(startMins + timeToSubtract, equalShiftsC, presentNames),
            totalTime: equalShiftsC.reduce((sum, duration) => sum + duration, 0),
            adjustedStartTime: adjustedStartTimeC,
            adjustedEndTime: endTime
          }
        ]
      });
    }
  };

  return (
    <div style={{
      direction: 'rtl',
      maxWidth: '1152px',
      margin: '0 auto',
      padding: '.7rem',
      backgroundColor: '#f9fafb',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', sans-serif"
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.5rem',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <h1 style={{
          fontSize: '1.875rem',
          fontWeight: '700',
          color: '#1f2937',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <Clock style={{ color: '#2563eb' }} />
          מנהל שמירות
        </h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem',
            }}>
              זמן התחלה
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              onBlur={(e) => handleTimeBlur(e.target.value, setStartTime)}
              style={{
                width: '90%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
              }}
            />
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              זמן סיום
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onBlur={(e) => handleTimeBlur(e.target.value, setEndTime)}
              style={{
                width: '90%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
              }}
            />
          </div>
          <div>
            <label style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <Users size={16} />
              מספר שמירות
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {autoCalculateShifts ? (
                <div style={{
                  flex: 1,
                  padding: '0.75rem',
                  backgroundColor: '#dbeafe',
                  border: '1px solid #3b82f6',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  color: '#1e40af',
                  textAlign: 'center',
                  fontWeight: '500'
                }}>
                  חישוב אוטומטי: {nameList.filter(p => p.present).length} שמירות                 </div>
              ) : (
                <input
                  type="number"
                  min="2"
                  max="12"
                  value={numShifts}
                  onChange={(e) => setNumShifts(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                  }}
                />
              )}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}>
                <input
                  type="checkbox"
                  checked={autoCalculateShifts}
                  onChange={(e) => setAutoCalculateShifts(e.target.checked)}
                  style={{
                    height: '1rem',
                    width: '1rem',
                    color: '#2563eb',
                    borderColor: '#d1d5db',
                    borderRadius: '0.25rem'
                  }}
                />
                <span style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '0.25rem'
                }}>אוטו</span>
              </div>
            </div>
            {autoCalculateShifts && (
              <p style={{
                fontSize: '0.75rem',
                color: '#2563eb',
                marginTop: '0.25rem'
              }}>
                {/* חישוב אוטומטי: {nameList.filter(p => p.present).length} שמירות */}
              </p>
            )}
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              חלוקה ישירה
            </label>
            <button
              onClick={() => setSimplifiedView(!simplifiedView)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                width: '100%',
                justifyContent: 'center',
                backgroundColor: simplifiedView ? '#dbeafe' : '#f3f4f6',
                color: simplifiedView ? '#1e40af' : '#6b7280',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.15s ease-in-out'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = simplifiedView ? '#bfdbfe' : '#e5e7eb'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = simplifiedView ? '#dbeafe' : '#f3f4f6'; }}
            >
              {simplifiedView ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {simplifiedView ? 'פעיל' : 'כבוי'}
            </button>
          </div>
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '0.5rem'
            }}>
              שמירה בזוגות
            </label>
            <button
              onClick={() => setPairingMode(!pairingMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.5rem',
                width: '100%',
                justifyContent: 'center',
                backgroundColor: pairingMode ? '#dbeafe' : '#f3f4f6',
                color: pairingMode ? '#1e40af' : '#6b7280',
                border: '1px solid #d1d5db',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '500',
                transition: 'background-color 0.15s ease-in-out'
              }}
              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = pairingMode ? '#bfdbfe' : '#e5e7eb'; }}
              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = pairingMode ? '#dbeafe' : '#f3f4f6'; }}
            >
              {pairingMode ? <UserPlus size={20} /> : <Users size={20} />}
              {pairingMode ? 'פעיל' : 'כבוי'}
            </button>
          </div>
        </div>

        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          border: '1px solid #e5e7eb'
        }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.75rem'
          }}>
            ניהול רשימת שמות
          </label>

          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addName()}
              placeholder="הכנס שם חדש..."
              style={{
                flex: '1 1 200px',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
              }}
            />
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              flex: '0 0 auto'
            }}>
              <button
                onClick={addName}
                style={{
                  backgroundColor: '#059669',
                  color: 'white',
                  padding: '0.5rem .5rem',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  transition: 'background-color 0.15s ease-in-out',
                  whiteSpace: 'nowrap'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#047857'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
              >
                <Plus size={16} />
                הוסף
              </button>
              {(
                <>
                  <button
                    onClick={saveNamesToStorage}
                    style={{
                      backgroundColor: '#7c3aed',
                      color: 'white',
                      padding: '0.2rem .5rem',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'background-color 0.15s ease-in-out',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#6d28d9'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#7c3aed'; }}
                  >
                    <Save size={16} />
                    שמור
                  </button>
                  <button
                    onClick={clearAllNames}
                    style={{
                      backgroundColor: '#dc2626',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      transition: 'background-color 0.15s ease-in-out',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                  >
                    <Trash2 size={16} />
                    מחק הכל
                  </button>
                </>
              )}
            </div>
          </div>

          {nameList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '0.5rem'
              }}>לחץ על שם כדי לשנות נוכחות:</p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                {nameList.map((person, index) => (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <button
                      onClick={() => togglePresence(index)}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '0.5rem',
                        backgroundColor: person.present ? '#059669' : '#dc2626',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        transition: 'background-color 0.15s ease-in-out'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = person.present ? '#047857' : '#b91c1c'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = person.present ? '#059669' : '#dc2626'; }}
                    >
                      {person.name} {person.present ? '✓' : '✗'}
                    </button>
                    <button
                      onClick={() => removeName(index)}
                      style={{
                        color: '#dc2626',
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        width: '1.5rem',
                        height: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '0.25rem',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s ease-in-out'
                      }}
                      onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                      onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginTop: '0.5rem'
              }}>
                נוכחים: {nameList.filter(p => p.present).length} | סה"כ: {nameList.length}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={calculateShifts}
          style={{
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1rem',
            width: '100%',
            maxWidth: '300px',
            margin: '0 auto'
          }}
          onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
          onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
        >
          <Calculator size={20} />
          חישוב השמירות
        </button>

        {timeToMinutes(endTime) <= timeToMinutes(startTime) && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            backgroundColor: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: '0.5rem'
          }}>
            <p style={{
              color: '#1e40af',
              fontSize: '0.875rem'
            }}>
              📅 זוהתה שמירת לילה: מ{startTime} עד {endTime} למחרת
            </p>
          </div>
        )}
      </div>

      {
        copySuccess && (
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            backgroundColor: '#059669',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            zIndex: 50,
            fontSize: '0.875rem'
          }}>
            {copySuccess}
          </div>
        )
      }

      {
        results && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {simplifiedView ? (
              (() => {
                const presentNames = getPresentNames();
                const totalDuration = calculateDuration(startTime, endTime);
                const effectiveNumShifts = getEffectiveNumShifts();
                const baseDuration = Math.floor(totalDuration / effectiveNumShifts);
                const rem = totalDuration % effectiveNumShifts;
                const shiftDurations = Array(effectiveNumShifts).fill(baseDuration).map((d, i) => d + (i < rem ? 1 : 0));
                const startMins = timeToMinutes(startTime);
                const shiftData = generateShifts(startMins, shiftDurations, presentNames);
                const durationText =
                  rem === 0
                    ? `${Math.floor(baseDuration / 60)} שעות ${baseDuration % 60} דקות`
                    : `${Math.floor(baseDuration / 60)} שעות ${baseDuration % 60} דקות (ל-${rem} ראשונים +1 דקה)`;
                const hasNames = presentNames.length > 0;

                return (
                  <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    padding: '1.5rem'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                      flexWrap: 'wrap',
                      gap: '1rem'
                    }}>
                      <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#1f2937'
                      }}>חלוקה ישירה</h2>
                      <button
                        onClick={() => copyToClipboard()}
                        style={{
                          backgroundColor: '#059669',
                          color: 'white',
                          padding: '0.5rem 1rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          transition: 'background-color 0.15s ease-in-out'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#047857'; }}
                        onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                      >
                        <Copy size={16} />
                        העתק לוואטסאפ
                      </button>
                    </div>
                    <p style={{
                      color: '#6b7280',
                      marginBottom: '1rem'
                    }}>
                      {autoCalculateShifts && `${effectiveNumShifts} שמירות | `}משך: {durationText}
                    </p>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        textAlign: 'center'
                      }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f3f4f6' }}>
                            {hasNames && (
                              <th style={{
                                padding: '0.5rem 1rem',
                                textAlign: 'center',
                                fontWeight: '700'
                              }}>שומר</th>
                            )}
                            <th style={{
                              padding: '0.5rem 1rem',
                              textAlign: 'center',
                              fontWeight: '700'
                            }}>שמירה</th>
                            <th style={{
                              padding: '0.5rem 1rem',
                              textAlign: 'center',
                              fontWeight: '700'
                            }}>זמן התחלה</th>
                            <th style={{
                              padding: '0.5rem 1rem',
                              textAlign: 'center',
                              fontWeight: '700'
                            }}>זמן סיום</th>
                          </tr>
                        </thead>
                        <tbody>
                          {shiftData.map((shift) => (
                            <tr key={shift.shiftNumber}>
                              {hasNames && (
                                <td style={{
                                  padding: '0.5rem 1rem',
                                  fontWeight: '700'
                                }}>{shift.name}</td>
                              )}
                              <td style={{
                                padding: '0.5rem 1rem',
                                fontWeight: '700'
                              }}>{shift.shiftNumber}</td>
                              <td style={{
                                padding: '0.5rem 1rem',
                                fontWeight: '700'
                              }}>{shift.startTime}</td>
                              <td style={{
                                padding: '0.5rem 1rem',
                                fontWeight: '700'
                              }}>{shift.endTime}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  padding: '1.5rem'
                }}>
                  <h2 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: '#1f2937',
                    marginBottom: '1rem'
                  }}>
                    סך זמן השמירות: {results.totalDuration}
                    {autoCalculateShifts && ` | ${results.effectiveNumShifts} שמירות`}
                  </h2>
                  {results.canDivideEqually && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#d1fae5',
                      border: '1px solid #10b981',
                      borderRadius: '0.5rem'
                    }}>
                      <p style={{
                        color: '#065f46',
                        fontSize: '0.875rem'
                      }}>
                        ✅ מושלם! ניתן לחלק ל {results.effectiveNumShifts} שמירות עגולות
                      </p>
                    </div>
                  )}
                  {!results.canDivideEqually && (
                    <div style={{
                      padding: '0.75rem',
                      backgroundColor: '#fef9c3',
                      border: '1px solid #eab308',
                      borderRadius: '0.5rem'
                    }}>
                      <p style={{
                        color: '#92400e',
                        fontSize: '0.875rem'
                      }}>
                        ⚠️ אי אפשר לחלק לשמירות עגולות, הנה 3 אלטרנטיבות:
                      </p>
                    </div>
                  )}
                </div>

                {results.strategies.map((strategy, index) => {
                  const presentNames = getPresentNames();
                  const hasNames = presentNames.length > 0;
                  return (
                    <div key={index} style={{
                      backgroundColor: 'white',
                      borderRadius: '0.5rem',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      padding: '1.5rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        flexWrap: 'wrap',
                        gap: '1rem'
                      }}>
                        <div>
                          <h3 style={{
                            fontSize: '1.25rem',
                            fontWeight: '600',
                            color: '#1f2937'
                          }}>
                            {results.canDivideEqually ? strategy.name : `אפשרות ${index === 0 ? "א" : (index === 1 ? "ב" : "ג")}: ${strategy.name}`}
                          </h3>
                          <p style={{
                            color: '#6b7280',
                            fontSize: '0.875rem'
                          }}>{strategy.description}</p>
                          {strategy.adjustedStartTime && strategy.adjustedStartTime !== startTime && (
                            <p style={{
                              color: '#2563eb',
                              fontSize: '0.875rem',
                              marginTop: '0.25rem'
                            }}>
                              📅 לוז חדש: {strategy.adjustedStartTime} - {strategy.adjustedEndTime}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{
                            fontSize: '0.875rem',
                            color: '#6b7280'
                          }}>סך זמן השמירות: {strategy.hasSlider ? formatTotalTime(strategy.baseShifts.reduce((sum, d) => sum + d, 0) + strategy.remainder) : formatTotalTime(strategy.totalTime)}</p>
                          {!strategy.hasSlider && (
                            <button
                              onClick={() => copyToClipboard(strategy)}
                              style={{
                                backgroundColor: '#059669',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                marginTop: '0.5rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                transition: 'background-color 0.15s ease-in-out'
                              }}
                              onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#047857'; }}
                              onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#059669'; }}
                            >
                              <Copy size={16} />
                              העתק
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        {strategy.hasSlider ? (
                          <SliderTable strategy={strategy} presentNames={presentNames} />
                        ) : (
                          <table style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                            textAlign: 'center',
                          }}>
                            <thead>
                              <tr style={{ backgroundColor: '#f3f4f6' }}>
                                {hasNames && (
                                  <th style={{
                                    // padding: '0.5rem 1rem',
                                    textAlign: 'center',
                                    fontWeight: '700'
                                  }}>שומר</th>
                                )}
                                <th style={{
                                  padding: '0.5rem 1rem',
                                  textAlign: 'center',
                                  fontWeight: '700'
                                }}>שמירה</th>
                                <th style={{
                                  padding: '0.5rem 1rem',
                                  textAlign: 'center',
                                  fontWeight: '700'
                                }}>זמן התחלה</th>
                                <th style={{
                                  padding: '0.5rem 1rem',
                                  textAlign: 'center',
                                  fontWeight: '700'
                                }}>זמן סיום</th>
                                <th style={{
                                  padding: '0.5rem 1rem',
                                  textAlign: 'center',
                                  fontWeight: '700'
                                }}>משך</th>
                              </tr>
                            </thead>
                            <tbody>
                              {strategy.shifts.map((shift) => (
                                <tr key={shift.shiftNumber}>
                                  {hasNames && (
                                    <td style={{
                                      padding: '0.5rem 1rem',
                                      fontWeight: '700'
                                    }}>{shift.name}</td>
                                  )}
                                  <td style={{
                                    padding: '0.5rem 1rem',
                                    fontWeight: '700'
                                  }}>{shift.shiftNumber}</td>
                                  <td style={{
                                    padding: '0.5rem 1rem',
                                    fontWeight: '700'
                                  }}>{shift.startTime}</td>
                                  <td style={{
                                    padding: '0.5rem 1rem',
                                    fontWeight: '700'
                                  }}>{shift.endTime}</td>
                                  <td style={{
                                    padding: '0.5rem 1rem',
                                    fontWeight: '700'
                                  }}>{shift.duration}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )
      }
    </div >
  );
};

export default ShiftScheduler;