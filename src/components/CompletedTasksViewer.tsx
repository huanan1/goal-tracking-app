import React, { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Goal, Task } from '../types';

interface CompletedTask extends Task {
  completedAt: string;
}

interface CompletedTasksViewerProps {
  goal: Goal;
  selectedDate: Date;
  onClose: () => void;
  onTaskDeleted?: (goalId: number, selectedDate: Date) => void;
}

const CompletedTasksViewer: React.FC<CompletedTasksViewerProps> = ({
  goal,
  selectedDate,
  onClose,
  onTaskDeleted
}) => {
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);

  const getCompletedTasksForDate = (): CompletedTask[] => {
    const storedTasks = localStorage.getItem(`completed_tasks_${goal.id}`);
    const allCompletedTasks: CompletedTask[] = storedTasks ? JSON.parse(storedTasks) : [];
    
    // Filter tasks completed on the selected date
    return allCompletedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return (
        completedDate.getFullYear() === selectedDate.getFullYear() &&
        completedDate.getMonth() === selectedDate.getMonth() &&
        completedDate.getDate() === selectedDate.getDate()
      );
    });
  };

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `completed_tasks_${goal.id}`) {
        setCompletedTasks(getCompletedTasksForDate());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [goal.id, selectedDate]);

  // Load initial tasks
  useEffect(() => {
    setCompletedTasks(getCompletedTasksForDate());
  }, [goal.id, selectedDate]);

  const handleDeleteTask = (taskToDelete: CompletedTask) => {
    // Get all completed tasks
    const storedTasks = localStorage.getItem(`completed_tasks_${goal.id}`);
    const allCompletedTasks: CompletedTask[] = storedTasks ? JSON.parse(storedTasks) : [];
    
    // Remove the specific task
    const updatedTasks = allCompletedTasks.filter(task => 
      !(task.id === taskToDelete.id && task.completedAt === taskToDelete.completedAt)
    );
    localStorage.setItem(`completed_tasks_${goal.id}`, JSON.stringify(updatedTasks));
    
    // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs
    
    // Update local state
    setCompletedTasks(getCompletedTasksForDate());
    
    // Check if there are any remaining tasks for this date
    const remainingTasksForDate = updatedTasks.filter(task => {
      const completedDate = new Date(task.completedAt);
      return (
        completedDate.getFullYear() === selectedDate.getFullYear() &&
        completedDate.getMonth() === selectedDate.getMonth() &&
        completedDate.getDate() === selectedDate.getDate()
      );
    });
    
    // If no tasks remain for this date and it's a habit goal, remove from streak
    if (remainingTasksForDate.length === 0 && goal.isHabit && onTaskDeleted) {
      onTaskDeleted(goal.id, selectedDate);
    }
    
    // Force re-render by closing and reopening if no tasks remain
    if (remainingTasksForDate.length === 0) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{goal.title}</h3>
            <p className="text-sm text-gray-500">
              {format(selectedDate, 'MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {completedTasks.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-700">
                Tasks completed ({completedTasks.length})
              </h4>
              {completedTasks.map((task, index) => (
                <div
                  key={`${task.id}-${task.completedAt}-${index}`}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg group"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-gray-900">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">
                      {format(new Date(task.completedAt), 'h:mm a')}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title="Delete completed task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : goal.isHabit ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              </div>
              <p className="text-gray-500">
                {goal.streak?.some(date => {
                  const streakDate = new Date(date);
                  return (
                    streakDate.getFullYear() === selectedDate.getFullYear() &&
                    streakDate.getMonth() === selectedDate.getMonth() &&
                    streakDate.getDate() === selectedDate.getDate()
                  );
                }) ? 'Habit completed on this day' : 'No activity on this day'}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="w-3 h-3 bg-gray-400 rounded-full" />
              </div>
              <p className="text-gray-500">No tasks completed on this day</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompletedTasksViewer;