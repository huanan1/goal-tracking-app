import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { Goal, Task } from '../types';

interface TaskSectionProps {
  goals: Goal[];
  selectedGoalId: number | null;
  onSelectGoal: (goalId: number | null) => void;
  onTaskCompletionToggle: (taskId: number, goalId: number) => void;
  loadTasksForGoal: (goalId: number) => Task[];
  taskCompletionSignal: number;
  isTaskCompletedToday: (taskId: number, goalId: number) => boolean;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  goals,
  selectedGoalId,
  onSelectGoal,
  onTaskCompletionToggle,
  loadTasksForGoal,
  taskCompletionSignal,
  isTaskCompletedToday
}) => {
  const [currentDailyTask, setCurrentDailyTask] = useState<Task | null>(null);
  const [hasCompletedTaskToday, setHasCompletedTaskToday] = useState(false);
  const [showNextTaskOverride, setShowNextTaskOverride] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationType, setAnimationType] = useState<'complete' | 'undo' | null>(null);
  const [animatingTask, setAnimatingTask] = useState<Task | null>(null);

  const selectedGoal = goals.find(goal => goal.id === selectedGoalId);

  // Check if any task for the selected goal has been completed today
  const checkTaskCompletionToday = (goalId: number): boolean => {
    const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${goalId}`) || '[]');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return completedTasks.some((task: any) => {
      const completedDate = new Date(task.completedAt);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    });
  };

  // Update task display when goal selection or completion changes
  useEffect(() => {
    if (!selectedGoalId) {
      setCurrentDailyTask(null);
      setHasCompletedTaskToday(false);
      setShowNextTaskOverride(false);
      return;
    }

    const tasks = loadTasksForGoal(selectedGoalId);
    const completedToday = checkTaskCompletionToday(selectedGoalId);
    
    setHasCompletedTaskToday(completedToday);

    // If completed today and not overridden, don't show a task
    if (completedToday && !showNextTaskOverride) {
      setCurrentDailyTask(null);
    } else {
      // Show the first available task
      setCurrentDailyTask(tasks.length > 0 ? tasks[0] : null);
    }
  }, [selectedGoalId, goals, showNextTaskOverride, taskCompletionSignal]);

  // Reset showNextTaskOverride at the start of each new day
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeout = setTimeout(() => {
      setShowNextTaskOverride(false);
    }, timeUntilMidnight);

    return () => clearTimeout(timeout);
  }, []);

  const handleShowNextTask = () => {
    setShowNextTaskOverride(true);
  };

  const handleTaskComplete = (taskId: number, goalId: number) => {
    if (!currentDailyTask || !selectedGoal || isAnimating) return;

    const wasCompleted = isTaskCompletedToday(taskId, goalId);
    
    // Store the current task for animation
    setAnimatingTask(currentDailyTask);
    
    // Set animation type based on current state
    setAnimationType(wasCompleted ? 'undo' : 'complete');
    setIsAnimating(true);

    // For completion animation, wait for strikethrough to complete before executing
    if (!wasCompleted) {
      // Wait for strikethrough animation to complete (400ms - 2x faster)
      setTimeout(() => {
        onTaskCompletionToggle(taskId, goalId);
        setShowNextTaskOverride(false);
      }, 400);

      // Start fade out after strikethrough completes
      setTimeout(() => {
        // Fade out animation happens here via CSS
      }, 400);

      // End animation completely (600ms total - 2x faster)
      setTimeout(() => {
        setIsAnimating(false);
        setAnimationType(null);
        setAnimatingTask(null);
      }, 600);
    } else {
      // For undo, execute immediately
      setTimeout(() => {
        onTaskCompletionToggle(taskId, goalId);
        setShowNextTaskOverride(false);
      }, 50);

      setTimeout(() => {
        setIsAnimating(false);
        setAnimationType(null);
        setAnimatingTask(null);
      }, 200);
    }
  };

  // Check if the current task is completed today
  const isCurrentTaskCompleted = currentDailyTask && selectedGoal ? 
    isTaskCompletedToday(currentDailyTask.id, selectedGoal.id) : false;

  // Use animating task during animation, otherwise use current task
  const displayTask = isAnimating && animatingTask ? animatingTask : currentDailyTask;
  const displayTaskCompleted = isAnimating && animatingTask && selectedGoal ? 
    (animationType === 'complete' ? true : false) : isCurrentTaskCompleted;
  
  return (
    <section className="mb-12">
      <div className="text-center font-medium text-lg my-8 flex items-center justify-center gap-2">
        <span>You are working towards</span>
        <select
          value={selectedGoalId || ''}
          onChange={(e) => onSelectGoal(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="font-medium text-lg border-0 border-b-2 border-gray-200 focus:border-gray-900 focus:ring-0 bg-transparent"
        >
          <option value="">Select a goal</option>
          {goals.map(goal => (
            <option key={goal.id} value={goal.id}>
              {goal.title}
            </option>
          ))}
        </select>
      </div>
      
      <div className="bg-gray-100 rounded-lg p-6">
        <div className="space-y-3">
          {selectedGoal ? (
            hasCompletedTaskToday && !showNextTaskOverride && !isAnimating ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Great job! You've completed a task for {selectedGoal.title} today.
                </h3>
                <p className="text-gray-600 mb-4">
                  You can take a break or continue with the next task.
                </p>
                {loadTasksForGoal(selectedGoal.id).length > 0 && (
                  <button
                    onClick={handleShowNextTask}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    See next task
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            ) : displayTask ? (
              <div className={`relative overflow-hidden transition-all duration-300 ${
                isAnimating && animationType === 'complete' ? 'opacity-100' : ''
              }`}>
                <div className={`flex items-center bg-white p-4 rounded-md shadow-sm transition-all duration-300 ${
                  isAnimating && animationType === 'complete' && 'animate-fade-out-delay'
                }`}>
                  <button
                    onClick={() => handleTaskComplete(displayTask.id, selectedGoal.id)}
                    disabled={isAnimating}
                    className={`mr-4 flex-shrink-0 transition-all duration-300 ${
                      displayTaskCompleted 
                        ? 'text-green-600 hover:text-gray-400' 
                        : 'text-gray-400 hover:text-green-600'
                    } ${isAnimating ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    title={displayTaskCompleted ? 'Click to undo completion' : 'Click to complete task'}
                  >
                    <CheckCircle size={24} />
                  </button>
                  
                  <span className={`flex-grow relative transition-all duration-300 ${
                    displayTaskCompleted && !isAnimating ? 'line-through text-gray-500' : 'text-gray-900'
                  }`}>
                    {displayTask.title}
                    
                    {/* Animated strikethrough overlay */}
                    {isAnimating && animationType === 'complete' && (
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
                  
                  {selectedGoal.isHabit && (
                    <span className="ml-4 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      Habit
                    </span>
                  )}
                  {displayTaskCompleted && selectedGoal.isHabit && !isAnimating && (
                    <span className="ml-2 px-2 py-1 bg-green-100 text-green-600 text-xs rounded">
                      Completed today
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                No tasks available for this goal. Add tasks in the goal details.
              </div>
            )
          ) : (
            <div className="text-center text-gray-500 py-4">
              Select a goal to see your top task for today.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TaskSection;