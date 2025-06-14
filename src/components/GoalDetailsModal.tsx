import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, GripVertical, Trash2, Archive, MoreVertical } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import Calendar from './Calendar';
import CompletedTasksViewer from './CompletedTasksViewer';
import { Goal, Task } from '../types';

interface GoalDetailsModalProps {
  goal: Goal;
  onClose: () => void;
  onSave: (updatedGoal: Goal) => void;
  onDelete?: (goalId: number) => void;
  onTaskCompletionToggle: (taskId: number, goalId: number) => void;
  loadTasksForGoal: (goalId: number) => Task[];
  saveTasksForGoal: (goalId: number, tasks: Task[]) => void;
}

const GoalDetailsModal: React.FC<GoalDetailsModalProps> = ({ 
  goal, 
  onClose, 
  onSave, 
  onDelete,
  onTaskCompletionToggle,
  loadTasksForGoal,
  saveTasksForGoal
}) => {
  const [editedGoal, setEditedGoal] = useState<Goal>(goal);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [newTask, setNewTask] = useState('');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksForGoal(goal.id));
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [selectedDateForTasks, setSelectedDateForTasks] = useState<Date | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [animatingTasks, setAnimatingTasks] = useState<Set<number>>(new Set());
  const [taskAnimationType, setTaskAnimationType] = useState<Record<number, 'complete' | 'undo'>>({});
  const [animatingTasksData, setAnimatingTasksData] = useState<Record<number, { task: Task; wasCompleted: boolean }>>({});

  // Helper function to check if a task was completed today
  const isTaskCompletedToday = (taskId: number): boolean => {
    const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${editedGoal.id}`) || '[]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return completedTasks.some((task: any) => {
      const completedDate = new Date(task.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return task.id === taskId && completedDate.getTime() === today.getTime();
    });
  };

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key || !e.newValue) return;

      // Update tasks if they changed in another tab
      if (e.key === `tasks_${editedGoal.id}`) {
        const updatedTasks = JSON.parse(e.newValue);
        setTasks(updatedTasks);
      }

      // Update completed tasks signal if completion status changed
      if (e.key === `completed_tasks_${editedGoal.id}`) {
        // Force re-render by updating a state that triggers useEffect
        setTasks(prevTasks => [...prevTasks]);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [editedGoal.id]);

  // Update the edited goal when the parent goal changes (e.g., from task completion)
  useEffect(() => {
    setEditedGoal(goal);
  }, [goal]);

  // Reload tasks when goal changes or when storage events occur
  useEffect(() => {
    const currentTasks = loadTasksForGoal(editedGoal.id);
    setTasks(currentTasks);
  }, [editedGoal.id, goal]);

  // Handle keyboard events for the delete confirmation dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (goalToDelete) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmDeleteGoal();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelDeleteGoal();
        }
      } else if (taskToDelete) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmDeleteTask();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelDeleteTask();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goalToDelete, taskToDelete]);

  const handleSave = () => {
    onSave(editedGoal);
    onClose();
  };

  const handleArchiveGoal = () => {
    const archivedGoal = { ...editedGoal, isArchived: true };
    onSave(archivedGoal);
    onClose();
  };

  const handleDeleteGoalClick = () => {
    setGoalToDelete(editedGoal);
    setShowGoalMenu(false);
  };

  const confirmDeleteGoal = () => {
    if (!goalToDelete) return;

    // Clean up associated data
    localStorage.removeItem(`tasks_${goalToDelete.id}`);
    localStorage.removeItem(`completed_tasks_${goalToDelete.id}`);

    // Clear selected goal if it was the deleted one
    const selectedGoalData = localStorage.getItem('selected_goal_for_today');
    if (selectedGoalData && parseInt(selectedGoalData, 10) === goalToDelete.id) {
      localStorage.removeItem('selected_goal_for_today');
    }

    // Call the onDelete callback to update parent state
    if (onDelete) {
      onDelete(goalToDelete.id);
    }

    setGoalToDelete(null);
    onClose();
  };

  const cancelDeleteGoal = () => {
    setGoalToDelete(null);
  };

  const handleDeleteTaskClick = (task: Task) => {
    setTaskToDelete(task);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;

    const updatedTasks = tasks.filter(task => task.id !== taskToDelete.id);
    setTasks(updatedTasks);
    saveTasksForGoal(editedGoal.id, updatedTasks);
    setTaskToDelete(null);
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
  };

  const handleDateToggle = (date: Date) => {
    const streak = editedGoal.streak || [];
    const dateExists = streak.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );

    if (dateExists) {
      // Check if there are completed tasks for this date
      const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${editedGoal.id}`) || '[]');
      const hasTasksForDate = completedTasks.some((task: any) => {
        const completedDate = new Date(task.completedAt);
        return (
          completedDate.getFullYear() === date.getFullYear() &&
          completedDate.getMonth() === date.getMonth() &&
          completedDate.getDate() === date.getDate()
        );
      });

      if (hasTasksForDate) {
        // If there are completed tasks, show them
        setSelectedDateForTasks(date);
        setShowCompletedTasks(true);
      } else {
        // If no completed tasks, remove the date from streak
        const updatedStreak = streak.filter(d => 
          !(d.getFullYear() === date.getFullYear() &&
            d.getMonth() === date.getMonth() &&
            d.getDate() === date.getDate())
        );
        setEditedGoal({
          ...editedGoal,
          streak: updatedStreak
        });
      }
    } else {
      // If date doesn't exist in streak, add it
      setEditedGoal({
        ...editedGoal,
        streak: [...streak, date]
      });
    }
  };

  const handleTaskDeleted = (goalId: number, selectedDate: Date) => {
    // Remove the date from the streak if no tasks remain for that date
    const updatedStreak = (editedGoal.streak || []).filter(date => {
      return !(
        date.getFullYear() === selectedDate.getFullYear() &&
        date.getMonth() === selectedDate.getMonth() &&
        date.getDate() === selectedDate.getDate()
      );
    });
    
    setEditedGoal({
      ...editedGoal,
      streak: updatedStreak
    });
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now() + Math.random(), // Add randomness to prevent ID conflicts across tabs
        title: newTask.trim(),
        completed: false,
        dueDate: new Date(),
        goalId: editedGoal.id
      };
      const updatedTasks = [...tasks, task];
      setTasks(updatedTasks);
      saveTasksForGoal(editedGoal.id, updatedTasks);
      setNewTask('');
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, task: Task) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.id === task.id) return;

    const taskList = Array.from(tasks);
    const draggedIndex = taskList.findIndex(t => t.id === draggedTask.id);
    const hoverIndex = taskList.findIndex(t => t.id === task.id);

    if (draggedIndex === -1 || hoverIndex === -1) return;

    const newTasks = [...taskList];
    const [removed] = newTasks.splice(draggedIndex, 1);
    newTasks.splice(hoverIndex, 0, removed);

    setTasks(newTasks);
    saveTasksForGoal(editedGoal.id, newTasks);
  };

  const handleTaskToggle = (taskId: number) => {
    if (animatingTasks.has(taskId)) return; // Prevent multiple clicks during animation

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const wasCompleted = isTaskCompletedToday(taskId);
    
    // Store task data for animation
    setAnimatingTasksData(prev => ({
      ...prev,
      [taskId]: { task, wasCompleted }
    }));
    
    // Set animation state
    setAnimatingTasks(prev => new Set(prev).add(taskId));
    setTaskAnimationType(prev => ({
      ...prev,
      [taskId]: wasCompleted ? 'undo' : 'complete'
    }));

    // Execute task completion based on animation type
    if (!wasCompleted) {
      // For completion: wait for strikethrough animation (400ms - 2x faster)
      setTimeout(() => {
        onTaskCompletionToggle(taskId, editedGoal.id);
        
        // Reload tasks to reflect changes made by parent
        setTimeout(() => {
          const updatedTasks = loadTasksForGoal(editedGoal.id);
          setTasks(updatedTasks);
        }, 100);
      }, 400);

      // End animation after fade out (600ms total - 2x faster)
      setTimeout(() => {
        setAnimatingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setTaskAnimationType(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
        setAnimatingTasksData(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }, 600);
    } else {
      // For undo: execute immediately
      setTimeout(() => {
        onTaskCompletionToggle(taskId, editedGoal.id);
        
        // Reload tasks to reflect changes made by parent
        setTimeout(() => {
          const updatedTasks = loadTasksForGoal(editedGoal.id);
          setTasks(updatedTasks);
        }, 100);
      }, 50);

      // End animation quickly for undo (200ms - 2x faster)
      setTimeout(() => {
        setAnimatingTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setTaskAnimationType(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
        setAnimatingTasksData(prev => {
          const newState = { ...prev };
          delete newState[taskId];
          return newState;
        });
      }, 200);
    }
  };

  const handleTaskTitleClick = (task: Task) => {
    setEditingTaskId(task.id);
    setEditedTaskTitle(task.title);
  };

  const handleTaskTitleChange = (taskId: number) => {
    if (editedTaskTitle.trim()) {
      const updatedTasks = tasks.map(task => 
        task.id === taskId 
          ? { ...task, title: editedTaskTitle.trim() }
          : task
      );
      setTasks(updatedTasks);
      saveTasksForGoal(editedGoal.id, updatedTasks);
    }
    setEditingTaskId(null);
    setEditedTaskTitle('');
  };

  const handleTaskTitleKeyDown = (e: React.KeyboardEvent, taskId: number) => {
    if (e.key === 'Enter') {
      handleTaskTitleChange(taskId);
    } else if (e.key === 'Escape') {
      setEditingTaskId(null);
      setEditedTaskTitle('');
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
          <div className="p-6 flex items-center justify-between border-b">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <MoreVertical size={20} />
              </button>
              
              {showGoalMenu && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    onClick={handleArchiveGoal}
                    className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <Archive size={18} />
                    <span>Archive Goal</span>
                  </button>
                  <button
                    onClick={handleDeleteGoalClick}
                    className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-left"
                  >
                    <Trash2 size={18} />
                    <span>Delete Goal</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 overflow-y-auto">
            <div className="space-y-6">
              <input
                type="text"
                value={editedGoal.title}
                onChange={(e) => setEditedGoal({ ...editedGoal, title: e.target.value })}
                className="w-full text-2xl font-semibold border-0 border-b-2 border-gray-200 focus:border-gray-900 focus:ring-0 pb-2"
                placeholder="Goal Title"
              />

              <div className="flex items-center justify-between py-4 border-b border-gray-200">
                <div>
                  <h3 className="font-medium">Habit</h3>
                  <p className="text-sm text-gray-500">Is this a lifestyle goal?</p>
                </div>
                <ToggleSwitch
                  checked={editedGoal.isHabit || false}
                  onChange={(checked) => setEditedGoal({ ...editedGoal, isHabit: checked })}
                />
              </div>

              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <textarea
                  value={editedGoal.description}
                  onChange={(e) => setEditedGoal({ ...editedGoal, description: e.target.value })}
                  className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0"
                  placeholder="Goal description"
                />
              </div>

              {editedGoal.isHabit ? (
                <>
                  <div>
                    <h3 className="font-medium mb-2">Tasks</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      For habit goals, completing any task will mark today as done and move that task to the bottom of the list. Click completed tasks to undo them.
                    </p>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTask}
                          onChange={(e) => setNewTask(e.target.value)}
                          placeholder="Add a new task"
                          className="flex-1 p-2 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                        />
                        <button
                          onClick={handleAddTask}
                          className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                      {tasks.map(task => {
                        const isAnimating = animatingTasks.has(task.id);
                        const animType = taskAnimationType[task.id];
                        const animData = animatingTasksData[task.id];
                        
                        // Use animation data during animation, otherwise use current state
                        const completedToday = isAnimating && animData ? 
                          (animType === 'complete' ? true : false) : 
                          isTaskCompletedToday(task.id);
                        
                        return (
                          <div 
                            key={task.id} 
                            className={`relative overflow-hidden transition-all duration-300 ${
                              isAnimating && animType === 'complete' ? 'animate-fade-out-delay' : ''
                            }`}
                            draggable={!isAnimating}
                            onDragStart={() => !isAnimating && handleDragStart(task)}
                            onDragOver={(e) => !isAnimating && handleDragOver(e, task)}
                          >
                            <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-move group bg-white">
                              <div className="text-gray-400 hover:text-gray-600 cursor-grab">
                                <GripVertical size={20} />
                              </div>
                              <div className="flex-1 flex items-center gap-2">
                                {editingTaskId === task.id ? (
                                  <input
                                    type="text"
                                    value={editedTaskTitle}
                                    onChange={(e) => setEditedTaskTitle(e.target.value)}
                                    onBlur={() => handleTaskTitleChange(task.id)}
                                    onKeyDown={(e) => handleTaskTitleKeyDown(e, task.id)}
                                    className="flex-1 p-1 border border-gray-300 rounded focus:border-gray-900 focus:ring-0"
                                    autoFocus
                                  />
                                ) : (
                                  <span 
                                    className={`flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded relative transition-all duration-300 ${
                                      completedToday && !isAnimating ? 'line-through text-gray-500' : 'text-gray-900'
                                    }`}
                                    onClick={() => !isAnimating && handleTaskTitleClick(task)}
                                  >
                                    {task.title}
                                    
                                    {/* Animated strikethrough overlay */}
                                    {isAnimating && animType === 'complete' && (
                                      <span className="absolute inset-0 overflow-hidden">
                                        <span 
                                          className="absolute top-1/2 left-0 h-0.5 bg-gray-500 transform -translate-y-1/2 animate-strikethrough"
                                          style={{
                                            animation: 'strikethrough 0.4s ease-out forwards'
                                          }}
                                        />
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              {completedToday && !isAnimating && (
                                <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded">
                                  Completed today
                                </span>
                              )}
                              <input
                                type="checkbox"
                                checked={completedToday}
                                onChange={() => handleTaskToggle(task.id)}
                                disabled={isAnimating}
                                className={`h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 transition-all duration-300 ${
                                  isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'
                                }`}
                                title={completedToday ? 'Click to undo completion' : 'Click to complete task'}
                              />
                              <button
                                onClick={() => handleDeleteTaskClick(task)}
                                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Streak</h3>
                    <p className="text-sm text-gray-500 mb-3">
                      Click on marked dates to see completed tasks. Click on unmarked dates to add them to your streak. Click on marked dates without tasks to remove them.
                    </p>
                    <div className="border border-gray-200 rounded-lg p-4">
                      <Calendar
                        currentDate={currentDate}
                        onDateChange={handleDateToggle}
                        markedDates={editedGoal.streak || []}
                        onMonthChange={setCurrentDate}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <h3 className="font-medium mb-2">Tasks</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    For regular goals, completing a task will move it to your completed tasks history.
                  </p>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTask}
                        onChange={(e) => setNewTask(e.target.value)}
                        placeholder="Add a new task"
                        className="flex-1 p-2 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                      />
                      <button
                        onClick={handleAddTask}
                        className="p-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                    {tasks.map(task => {
                      const isAnimating = animatingTasks.has(task.id);
                      const animType = taskAnimationType[task.id];
                      
                      return (
                        <div 
                          key={task.id} 
                          className={`relative overflow-hidden transition-all duration-300 ${
                            isAnimating && animType === 'complete' ? 'animate-fade-out-delay' : ''
                          }`}
                          draggable={!isAnimating}
                          onDragStart={() => !isAnimating && handleDragStart(task)}
                          onDragOver={(e) => !isAnimating && handleDragOver(e, task)}
                        >
                          <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-move group bg-white">
                            <div className="text-gray-400 hover:text-gray-600 cursor-grab">
                              <GripVertical size={20} />
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              {editingTaskId === task.id ? (
                                <input
                                  type="text"
                                  value={editedTaskTitle}
                                  onChange={(e) => setEditedTaskTitle(e.target.value)}
                                  onBlur={() => handleTaskTitleChange(task.id)}
                                  onKeyDown={(e) => handleTaskTitleKeyDown(e, task.id)}
                                  className="flex-1 p-1 border border-gray-300 rounded focus:border-gray-900 focus:ring-0"
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className={`flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded relative transition-all duration-300 ${
                                    task.completed ? 'line-through text-gray-500' : 'text-gray-900'
                                  }`}
                                  onClick={() => !isAnimating && handleTaskTitleClick(task)}
                                >
                                  {task.title}
                                  
                                  {/* Animated strikethrough overlay */}
                                  {isAnimating && animType === 'complete' && (
                                    <span className="absolute inset-0 overflow-hidden">
                                      <span 
                                        className="absolute top-1/2 left-0 h-0.5 bg-gray-500 transform -translate-y-1/2 animate-strikethrough"
                                        style={{
                                          animation: 'strikethrough 0.4s ease-out forwards'
                                        }}
                                      />
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => handleTaskToggle(task.id)}
                              disabled={isAnimating}
                              className={`h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 transition-all duration-300 ${
                                isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                            />
                            <button
                              onClick={() => handleDeleteTaskClick(task)}
                              className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                              title="Delete task"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t mt-auto">
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {showCompletedTasks && selectedDateForTasks && (
        <CompletedTasksViewer
          goal={editedGoal}
          selectedDate={selectedDateForTasks}
          onClose={() => {
            setShowCompletedTasks(false);
            setSelectedDateForTasks(null);
          }}
          onTaskDeleted={handleTaskDeleted}
        />
      )}

      {/* Goal Delete Confirmation Dialog */}
      {goalToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-red-800">Delete Goal Permanently</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to permanently delete this goal?
              </p>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="font-medium text-red-900">{goalToDelete.title}</p>
                {goalToDelete.description && (
                  <p className="text-sm text-red-700 mt-1">{goalToDelete.description}</p>
                )}
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This will permanently delete the goal and all associated tasks and history. This action cannot be undone.
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to confirm or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Escape</kbd> to cancel.
              </p>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={cancelDeleteGoal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteGoal}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Task</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this task?
              </p>
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium text-gray-900">{taskToDelete.title}</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to confirm or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Escape</kbd> to cancel.
              </p>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={cancelDeleteTask}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTask}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoalDetailsModal;