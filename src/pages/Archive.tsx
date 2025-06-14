import React, { useState } from 'react';
import { Trash2, RotateCcw, Archive as ArchiveIcon } from 'lucide-react';
import { Goal } from '../types';

interface ArchiveProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}

const Archive: React.FC<ArchiveProps> = ({ goals, setGoals }) => {
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const archivedGoals = goals.filter(goal => goal.isArchived);

  const handleUnarchive = (goalId: number) => {
    setGoals(prevGoals => 
      prevGoals.map(goal => 
        goal.id === goalId 
          ? { ...goal, isArchived: false }
          : goal
      )
    );
  };

  const handleDeleteClick = (goal: Goal) => {
    setGoalToDelete(goal);
  };

  const confirmDelete = () => {
    if (!goalToDelete) return;

    // Remove the goal from the goals array
    setGoals(prevGoals => prevGoals.filter(goal => goal.id !== goalToDelete.id));

    // Clean up associated data
    localStorage.removeItem(`tasks_${goalToDelete.id}`);
    localStorage.removeItem(`completed_tasks_${goalToDelete.id}`);

    // Clear selected goal if it was the deleted one
    const selectedGoalData = localStorage.getItem('selected_goal_for_today');
    if (selectedGoalData && parseInt(selectedGoalData, 10) === goalToDelete.id) {
      localStorage.removeItem('selected_goal_for_today');
    }

    setGoalToDelete(null);
  };

  const cancelDelete = () => {
    setGoalToDelete(null);
  };

  // Handle keyboard events for the confirmation dialog
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (goalToDelete) {
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
  }, [goalToDelete]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ArchiveIcon size={28} className="text-gray-600" />
          <h1 className="text-2xl font-bold">Archived Goals</h1>
        </div>
        
        {archivedGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {archivedGoals.map(goal => (
              <div
                key={goal.id}
                className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-lg text-gray-900">{goal.title}</h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUnarchive(goal.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Unarchive goal"
                    >
                      <RotateCcw size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(goal)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete goal permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                {goal.description && (
                  <p className="text-gray-600 text-sm mb-3">{goal.description}</p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  {goal.isHabit && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      Habit
                    </span>
                  )}
                  {goal.isHabit && goal.streak && goal.streak.length > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                      {goal.streak.length} day streak
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArchiveIcon size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No archived goals</h3>
            <p className="text-gray-500">
              Goals you archive will appear here. You can unarchive them or delete them permanently.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {goalToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Archive;