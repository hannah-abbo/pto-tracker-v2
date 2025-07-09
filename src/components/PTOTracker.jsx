import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, User, Home, Coffee, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const PTOTracker = () => {
  const [teamMembers] = useState([
    'Kristina', 'Danielle', 'Danny', 'Annabelle', 'Hannah', 'Uros'
  ]);
  
  const [ptoEntries, setPtoEntries] = useState([]);
  const [ptoBalances, setPtoBalances] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [selectedMember, setSelectedMember] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Person colors for calendar
  const personColors = {
    'Kristina': { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-800' },
    'Danielle': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-800' },
    'Danny': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-800' },
    'Annabelle': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800' },
    'Hannah': { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-800' },
    'Uros': { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-800' }
  };

  const ptoTypes = {
    'vacation': { label: 'Vacation/PTO', icon: Calendar, color: '#3B82F6', bgColor: 'bg-blue-50', countsAgainstBalance: true },
    'wfh': { label: 'Work From Home', icon: Home, color: '#10B981', bgColor: 'bg-green-50', countsAgainstBalance: false },
    'personal': { label: 'Personal Day', icon: Coffee, color: '#F59E0B', bgColor: 'bg-yellow-50', countsAgainstBalance: true },
    'unpaid': { label: 'Unpaid Leave', icon: DollarSign, color: '#EF4444', bgColor: 'bg-red-50', countsAgainstBalance: false }
  };

  const [formData, setFormData] = useState({
    member: '',
    type: 'vacation',
    startDate: '',
    endDate: '',
    notes: ''
  });

  const [balanceFormData, setBalanceFormData] = useState({
    member: '',
    vacationDays: 20,
    personalDays: 5
  });

  // Load data from Supabase on component mount
  useEffect(() => {
    loadPTOEntries();
    loadPTOBalances();
  }, []);

  const loadPTOEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('pto_entries')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      
      // Convert snake_case from database to camelCase for frontend
      const entries = data.map(entry => ({
        id: entry.id,
        member: entry.member,
        type: entry.type,
        startDate: entry.start_date,
        endDate: entry.end_date,
        notes: entry.notes || ''
      }));
      
      setPtoEntries(entries);
      console.log('Loaded entries:', entries); // Debug log
    } catch (error) {
      console.error('Error loading PTO entries:', error);
    }
  };

  const loadPTOBalances = async () => {
    try {
      console.log('Loading PTO balances...');
      const { data, error } = await supabase
        .from('pto_balances')
        .select('*');
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Raw balance data from Supabase:', data);
      
      const balances = {};
      data.forEach(balance => {
        balances[balance.member] = {
          vacationDays: balance.vacation_days,
          personalDays: balance.personal_days
        };
      });
      
      console.log('Processed balances:', balances);
      
      // Initialize missing members with defaults
      teamMembers.forEach(member => {
        if (!balances[member]) {
          console.log(`Adding default balance for ${member}`);
          balances[member] = {
            vacationDays: 20,
            personalDays: 5
          };
        }
      });
      
      console.log('Final balances with defaults:', balances);
      setPtoBalances(balances);
      setLoading(false);
    } catch (error) {
      console.error('Error loading PTO balances:', error);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      member: '',
      type: 'vacation',
      startDate: '',
      endDate: '',
      notes: ''
    });
    setShowAddForm(false);
    setEditingEntry(null);
  };

  const resetBalanceForm = () => {
    setBalanceFormData({
      member: '',
      vacationDays: 20,
      personalDays: 5
    });
    setShowBalanceForm(false);
  };

  const handleSubmit = async () => {
    if (!formData.member || !formData.startDate) return;

    const daysRequested = getDaysCount(formData.startDate, formData.endDate || formData.startDate);
    const ptoType = ptoTypes[formData.type];
    
    if (ptoType.countsAgainstBalance) {
      const remainingDays = getRemainingDays(formData.member, formData.type);
      if (daysRequested > remainingDays && !editingEntry) {
        alert(`Not enough ${ptoType.label.toLowerCase()} days available. Remaining: ${remainingDays}, Requested: ${daysRequested}`);
        return;
      }
    }

    try {
      const entryData = {
        member: formData.member,
        type: formData.type,
        start_date: formData.startDate,
        end_date: formData.endDate || formData.startDate,
        notes: formData.notes
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('pto_entries')
          .update(entryData)
          .eq('id', editingEntry.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('pto_entries')
          .insert([entryData]);
        
        if (error) throw error;
      }

      await loadPTOEntries(); // Reload data
      resetForm();
    } catch (error) {
      console.error('Error saving PTO entry:', error);
      alert('Error saving entry. Please try again.');
    }
  };

  const handleBalanceSubmit = async () => {
    if (!balanceFormData.member) return;

    try {
      console.log('Submitting balance form:', balanceFormData);
      
      const balanceData = {
        member: balanceFormData.member,
        vacation_days: parseInt(balanceFormData.vacationDays),
        personal_days: parseInt(balanceFormData.personalDays)
      };

      console.log('Balance data to save:', balanceData);

      const { error } = await supabase
        .from('pto_balances')
        .upsert([balanceData], { onConflict: 'member' });

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }

      console.log('Balance saved successfully');
      await loadPTOBalances(); // Reload data
      resetBalanceForm();
    } catch (error) {
      console.error('Error saving PTO balance:', error);
      alert('Error saving balance. Please try again.');
    }
  };

  const handleEdit = (entry) => {
    setFormData(entry);
    setEditingEntry(entry);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      const { error } = await supabase
        .from('pto_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadPTOEntries(); // Reload data
    } catch (error) {
      console.error('Error deleting PTO entry:', error);
      alert('Error deleting entry. Please try again.');
    }
  };

  const getDateRange = (startDate, endDate) => {
    if (startDate === endDate) {
      return new Date(startDate).toLocaleDateString();
    }
    return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
  };

  const getDaysCount = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getUpcomingEntries = () => {
    const today = new Date();
    return ptoEntries
      .filter(entry => new Date(entry.startDate) >= today)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))
      .slice(0, 5);
  };

  const getEntriesForMember = (member) => {
    return ptoEntries
      .filter(entry => entry.member === member)
      .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  };

  const getTotalDaysByType = (member, type) => {
    return ptoEntries
      .filter(entry => entry.member === member && entry.type === type)
      .reduce((total, entry) => total + getDaysCount(entry.startDate, entry.endDate), 0);
  };

  const getRemainingDays = (member, type) => {
    if (!ptoBalances[member]) return 0;
    
    const usedDays = getTotalDaysByType(member, type);
    
    if (type === 'vacation') {
      return ptoBalances[member].vacationDays - usedDays;
    } else if (type === 'personal') {
      return ptoBalances[member].personalDays - usedDays;
    }
    
    return 0;
  };

  const getAllocatedDays = (member, type) => {
    if (!ptoBalances[member]) return 0;
    
    if (type === 'vacation') {
      return ptoBalances[member].vacationDays;
    } else if (type === 'personal') {
      return ptoBalances[member].personalDays;
    }
    
    return 0;
  };

  // Calendar functions
  const getMonthData = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEntriesForDate = (date) => {
    if (!date) return [];
    
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    return ptoEntries.filter(entry => {
      const entryStart = new Date(entry.startDate);
      const entryEnd = new Date(entry.endDate);
      entryStart.setHours(0, 0, 0, 0);
      entryEnd.setHours(0, 0, 0, 0);
      
      return checkDate >= entryStart && checkDate <= entryEnd;
    });
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading PTO data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Team PTO Tracker</h1>
              <p className="text-gray-600 mt-1">Manage time off, WFH days, and leave requests</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 transition-colors"
              >
                <Plus size={20} />
                Add Entry
              </button>
              <button
                onClick={() => setShowBalanceForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2 transition-colors"
              >
                <User size={20} />
                Set PTO Balances
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setSelectedView('dashboard')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'dashboard' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setSelectedView('calendar-view')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'calendar-view' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setSelectedView('all-entries')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedView === 'all-entries' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              All Entries
            </button>
            <select
              value={selectedMember}
              onChange={(e) => {
                setSelectedMember(e.target.value);
                setSelectedView('member');
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">View by Member</option>
              {teamMembers.map(member => (
                <option key={member} value={member}>{member}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Dashboard View */}
        {selectedView === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Team Overview */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Team Overview</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teamMembers.map(member => (
                    <div key={member} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-3">
                        <User size={20} className="text-gray-600" />
                        <h3 className="font-medium text-gray-900">{member}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {Object.entries(ptoTypes).map(([type, config]) => {
                          const usedDays = getTotalDaysByType(member, type);
                          const allocatedDays = getAllocatedDays(member, type);
                          const remainingDays = getRemainingDays(member, type);
                          
                          return (
                            <div key={type} className={`${config.bgColor} p-2 rounded border`}>
                              <div className="flex items-center gap-1 mb-1">
                                <config.icon size={12} />
                                <span className="font-medium text-gray-900">
                                  {config.countsAgainstBalance ? 
                                    `${usedDays}/${allocatedDays}` : 
                                    usedDays
                                  }
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 mb-1">{config.label}</div>
                              {config.countsAgainstBalance && (
                                <div className="text-xs font-medium text-gray-800">
                                  {remainingDays} left
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Time Off */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Upcoming Time Off</h2>
              <div className="space-y-3">
                {getUpcomingEntries().length > 0 ? (
                  getUpcomingEntries().map(entry => {
                    const TypeIcon = ptoTypes[entry.type].icon;
                    return (
                      <div key={entry.id} className="border-l-4 border-blue-500 pl-3 py-2 bg-blue-50 rounded-r">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIcon size={16} />
                          <span className="font-medium text-gray-900">{entry.member}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {getDateRange(entry.startDate, entry.endDate)}
                        </div>
                        <div className="text-xs text-gray-500">{ptoTypes[entry.type].label}</div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-center py-8">No upcoming time off scheduled</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Calendar View */}
        {selectedView === 'calendar-view' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Team Calendar - {formatMonthYear(currentDate)}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50 rounded">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {getMonthData(currentDate).map((date, index) => {
                const entries = date ? getEntriesForDate(date) : [];
                const isToday = date && date.toDateString() === new Date().toDateString();

                return (
                  <div 
                    key={index} 
                    className={`min-h-[120px] p-2 border border-gray-200 rounded ${
                      date ? 'bg-white hover:bg-gray-50' : 'bg-gray-50'
                    } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${
                          isToday ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {entries.slice(0, 4).map(entry => {
                            const personColor = personColors[entry.member] || { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-800' };
                            const TypeIcon = ptoTypes[entry.type].icon;
                            
                            return (
                              <div
                                key={entry.id}
                                className={`text-xs p-1 rounded border-l-2 ${personColor.bg} ${personColor.border} ${personColor.text}`}
                                title={`${entry.member} - ${ptoTypes[entry.type].label}${entry.notes ? ': ' + entry.notes : ''}`}
                              >
                                <div className="flex items-center gap-1">
                                  <TypeIcon size={10} />
                                  <span className="truncate font-medium">{entry.member}</span>
                                </div>
                                <div className="text-xs opacity-75 truncate">
                                  {ptoTypes[entry.type].label}
                                </div>
                              </div>
                            );
                          })}
                          {entries.length > 4 && (
                            <div className="text-xs text-gray-500 p-1">
                              +{entries.length - 4} more
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Team Members</h3>
              <div className="flex flex-wrap gap-4">
                {teamMembers.map(member => {
                  const personColor = personColors[member];
                  return (
                    <div key={member} className="flex items-center gap-2">
                      <div 
                        className={`w-4 h-4 rounded border-2 ${personColor.bg} ${personColor.border}`}
                      ></div>
                      <span className="text-sm text-gray-600">{member}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PTO Type Legend */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">PTO Types</h3>
              <div className="flex flex-wrap gap-4">
                {Object.entries(ptoTypes).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-2">
                    <config.icon size={16} style={{ color: config.color }} />
                    <span className="text-sm text-gray-600">{config.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Entries View */}
        {selectedView === 'all-entries' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">All PTO Entries</h2>
            {ptoEntries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left p-3 font-semibold text-gray-900">Team Member</th>
                      <th className="text-left p-3 font-semibold text-gray-900">Type</th>
                      <th className="text-left p-3 font-semibold text-gray-900">Dates</th>
                      <th className="text-left p-3 font-semibold text-gray-900">Days</th>
                      <th className="text-left p-3 font-semibold text-gray-900">Notes</th>
                      <th className="text-left p-3 font-semibold text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ptoEntries.map(entry => {
                      const TypeIcon = ptoTypes[entry.type].icon;
                      return (
                        <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <User size={16} className="text-gray-600" />
                              <span className="font-medium">{entry.member}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <TypeIcon size={16} />
                              <span className={`px-2 py-1 rounded text-xs font-medium ${ptoTypes[entry.type].bgColor} border`}>
                                {ptoTypes[entry.type].label}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-gray-900">{getDateRange(entry.startDate, entry.endDate)}</td>
                          <td className="p-3 text-gray-900 font-medium">{getDaysCount(entry.startDate, entry.endDate)}</td>
                          <td className="p-3 text-gray-600">{entry.notes || '-'}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(entry)}
                                className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(entry.id)}
                                className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500 text-lg">No PTO entries yet</p>
                <p className="text-gray-400">Click "Add Entry" to get started!</p>
              </div>
            )}
          </div>
        )}

        {/* Member View */}
        {selectedView === 'member' && selectedMember && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">{selectedMember}'s PTO Summary</h2>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(ptoTypes).map(([type, config]) => {
                const usedDays = getTotalDaysByType(selectedMember, type);
                const allocatedDays = getAllocatedDays(selectedMember, type);
                const remainingDays = getRemainingDays(selectedMember, type);
                
                return (
                  <div key={type} className={`${config.bgColor} p-4 rounded-lg border hover:shadow-md transition-shadow`}>
                    <div className="flex items-center gap-2 mb-2">
                      <config.icon size={20} />
                      <span className="font-semibold text-lg text-gray-900">
                        {config.countsAgainstBalance ? 
                          `${usedDays}/${allocatedDays}` : 
                          usedDays
                        }
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{config.label}</div>
                    {config.countsAgainstBalance && (
                      <div className="text-sm font-medium text-gray-800">
                        {remainingDays} days remaining
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Member's Entries */}
            <div className="space-y-3">
              {getEntriesForMember(selectedMember).length > 0 ? (
                getEntriesForMember(selectedMember).map(entry => {
                  const TypeIcon = ptoTypes[entry.type].icon;
                  return (
                    <div key={entry.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <TypeIcon size={18} />
                            <span className={`px-2 py-1 rounded text-sm font-medium ${ptoTypes[entry.type].bgColor} border`}>
                              {ptoTypes[entry.type].label}
                            </span>
                          </div>
                          <div className="text-gray-900 font-medium mb-1">
                            {getDateRange(entry.startDate, entry.endDate)}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {getDaysCount(entry.startDate, entry.endDate)} day{getDaysCount(entry.startDate, entry.endDate) !== 1 ? 's' : ''}
                          </div>
                          {entry.notes && (
                            <div className="text-sm text-gray-600">
                              <strong>Notes:</strong> {entry.notes}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 text-lg">No PTO entries for {selectedMember}</p>
                  <p className="text-gray-400">Click "Add Entry" to get started!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modals */}
        {showBalanceForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Set PTO Balance</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                  <select
                    value={balanceFormData.member}
                    onChange={(e) => setBalanceFormData({...balanceFormData, member: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select member</option>
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Vacation/PTO Days</label>
                  <input
                    type="number"
                    value={balanceFormData.vacationDays}
                    onChange={(e) => setBalanceFormData({...balanceFormData, vacationDays: e.target.value})}
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Annual Personal Days</label>
                  <input
                    type="number"
                    value={balanceFormData.personalDays}
                    onChange={(e) => setBalanceFormData({...balanceFormData, personalDays: e.target.value})}
                    min="0"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 border">
                  <strong>Note:</strong> WFH days and unpaid leave don't count against PTO balances.
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleBalanceSubmit}
                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Set Balance
                  </button>
                  <button
                    onClick={resetBalanceForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingEntry ? 'Edit Entry' : 'Add New PTO Entry'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Member</label>
                  <select
                    value={formData.member}
                    onChange={(e) => setFormData({...formData, member: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select member</option>
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Object.entries(ptoTypes).map(([key, config]) => (
                      <option key={key} value={key}>{config.label}</option>
                    ))}
                  </select>
                  {formData.member && formData.type && ptoTypes[formData.type].countsAgainstBalance && (
                    <div className="mt-1 text-sm text-gray-600 bg-blue-50 p-2 rounded border">
                      Remaining {ptoTypes[formData.type].label.toLowerCase()}: <strong>{getRemainingDays(formData.member, formData.type)} days</strong>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date (optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    min={formData.startDate}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Any additional notes..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleSubmit}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingEntry ? 'Update' : 'Add'} Entry
                  </button>
                  <button
                    onClick={resetForm}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PTOTracker;