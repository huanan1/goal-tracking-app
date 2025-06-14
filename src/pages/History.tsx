import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { Goal, Task } from '../types';

interface HistoryProps {
  goals: Goal[];
}

interface CompletedTask extends Task {
  completedAt: string;
}

const History: React.FC<HistoryProps> = ({ goals }) => {
  const [completedTasksData, setCompletedTasksData] = useState<Record<number, CompletedTask[]>>({});
  const [taskToDelete, setTaskToDelete] = useState<{
    task: CompletedTask;
    goalId: number;
  } | null>(null);

  const getCompletedTasks = (goalId: number): CompletedTask[] => {
    const storedTasks = localStorage.getItem(`completed_tasks_${goalId}`);
    return storedTasks ? JSON.parse(storedTasks) : [];
  };

  const loadAllCompletedTasks = () => {
    const data: Record<number, CompletedTask[]> = {};
    goals.forEach(goal => {
      data[goal.id] = getCompletedTasks(goal.id);
    });
    setCompletedTasksData(data);
  };

  // Load initial data
  useEffect(() => {
    loadAllCompletedTasks();
  }, [goals]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('completed_tasks_')) {
        loadAllCompletedTasks();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [goals]);

  const groupTasksByDate = (tasks: CompletedTask[]) => {
    return tasks.reduce((acc, task) => {
      const date = format(new Date(task.completedAt), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(task);
      return acc;
    }, {} as Record<string, CompletedTask[]>);
  };

  const handleDeleteClick = (task: CompletedTask, goalId: number) => {
    setTaskToDelete({ task, goalId });
  };

  const confirmDelete = () => {
    if (!taskToDelete) return;

    const { task, goalId } = taskToDelete;
    
    // Get all completed tasks for this goal
    const allCompletedTasks = getCompletedTasks(goalId);
    
    // Remove the specific task (match by id and completedAt to handle duplicates)
    const updatedTasks = allCompletedTasks.filter(t => 
      !(t.id === task.id && t.completedAt === task.completedAt)
    );
    
    // Save updated tasks
    localStorage.setItem(`completed_tasks_${goalId}`, JSON.stringify(updatedTasks));
    
    // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs

    // Update local state
    setCompletedTasksData(prev => ({
      ...prev,
      [goalId]: updatedTasks
    }));

    // Check if this was a habit goal and if we need to update the streak
    const goal = goals.find(g => g.id === goalId);
    if (goal?.isHabit) {
      const taskDate = new Date(task.completedAt);
      taskDate.setHours(0, 0, 0, 0);
      
      // Check if there are any remaining tasks for this date
      const remainingTasksForDate = updatedTasks.filter(t => {
        const completedDate = new Date(t.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return completedDate.getTime() === taskDate.getTime();
      });
      
      // If no tasks remain for this date, remove it from the streak
      if (remainingTasksForDate.length === 0) {
        const currentGoals = JSON.parse(localStorage.getItem('achieve_goals') || '[]');
        const updatedGoals = currentGoals.map((g: Goal) => {
          if (g.id === goalId && g.streak) {
            const updatedStreak = g.streak.filter((date: string | Date) => {
              const streakDate = new Date(date);
              streakDate.setHours(0, 0, 0, 0);
              return streakDate.getTime() !== taskDate.getTime();
            });
            return { ...g, streak: updatedStreak };
          }
          return g;
        });
        
        localStorage.setItem('achieve_goals', JSON.stringify(updatedGoals));
        
        // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs
      }
    }

    setTaskToDelete(null);
  };

  const cancelDelete = () => {
    setTaskToDelete(null);
  };

  // Handle keyboard events for the confirmation dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (taskToDelete) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmDelete();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelDelete();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [taskToDelete]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Task History</h1>
        
        {goals.map(goal => {
          const completedTasks = completedTasksData[goal.id] || [];
          if (completedTasks.length === 0) return null;

          const tasksByDate = groupTasksByDate(completedTasks);
          
          return (
            <div key={goal.id} className="mb-12">
              <h2 className="text-xl font-semibold mb-4">{goal.title}</h2>
              
              {Object.entries(tasksByDate)
                .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                .map(([date, tasks]) => (
                  <div key={date} className="mb-6">
                    <h3 className="text-lg font-medium text-gray-600 mb-3">
                      {format(new Date(date), 'MMMM d, yyyy')}
                    </h3>
                    <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                      {tasks.map((task, index) => (
                        <div
                          key={`${task.id}-${task.completedAt}-${index}`}
                          className={`p-4 flex items-center gap-3 group hover:bg-gray-50 transition-colors ${
                            index !== tasks.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full" />
                          <span className="flex-1">{task.title}</span>
                          <span className="text-sm text-gray-500">
                            {format(new Date(task.completedAt), 'h:mm a')}
                          </span>
                          <button
                            onClick={() => handleDeleteClick(task, goal.id)}
                            className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                            title="Delete completed task"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
        
        {goals.every(goal => (completedTasksData[goal.id] || []).length === 0) && (
          <div className="text-center text-gray-500 py-12">
            No completed tasks yet. Start completing tasks to see them here!
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Delete Completed Task</h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this completed task?
              </p>
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <p className="font-medium text-gray-900">{taskToDelete.task.title}</p>
                <p className="text-sm text-gray-500">
                  Completed on {format(new Date(taskToDelete.task.completedAt), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                This action cannot be undone. Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to confirm or <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Escape</kbd> to cancel.
              </p>
            </div>
            
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
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

export default History;