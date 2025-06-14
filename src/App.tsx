import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import TaskSection from './components/TaskSection';
import GoalsSection from './components/GoalsSection';
import History from './pages/History';
import Archive from './pages/Archive';
import { Goal, Task } from './types';

const GOALS_STORAGE_KEY = 'achieve_goals';
const SELECTED_GOAL_KEY = 'selected_goal_for_today';

const loadGoalsFromStorage = (): Goal[] => {
  const storedGoals = localStorage.getItem(GOALS_STORAGE_KEY);
  if (storedGoals) {
    const goals = JSON.parse(storedGoals);
    return goals.map((goal: Goal) => ({
      ...goal,
      streak: goal.streak ? goal.streak.map((date: string) => new Date(date)) : undefined
    }));
  }
  return [];
};

function App() {
  const [allGoals, setAllGoals] = useState<Goal[]>(() => loadGoalsFromStorage());
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(() => {
    const stored = localStorage.getItem(SELECTED_GOAL_KEY);
    return stored ? parseInt(stored, 10) : null;
  });
  const [taskCompletionSignal, setTaskCompletionSignal] = useState(0);

  // Filter out archived goals for main interface
  const activeGoals = allGoals.filter(goal => !goal.isArchived);

  // Helper functions for task management
  const loadTasksForGoal = (goalId: number): Task[] => {
    const storedTasks = localStorage.getItem(`tasks_${goalId}`);
    return storedTasks ? JSON.parse(storedTasks) : [];
  };

  const saveTasksForGoal = (goalId: number, tasks: Task[]) => {
    localStorage.setItem(`tasks_${goalId}`, JSON.stringify(tasks));
    // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs
  };

  // Helper function to check if a task was completed today
  const isTaskCompletedToday = (taskId: number, goalId: number): boolean => {
    const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${goalId}`) || '[]');
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

      // Handle goals changes
      if (e.key === GOALS_STORAGE_KEY) {
        const updatedGoals = JSON.parse(e.newValue);
        const goalsWithDates = updatedGoals.map((goal: Goal) => ({
          ...goal,
          streak: goal.streak ? goal.streak.map((date: string) => new Date(date)) : undefined
        }));
        setAllGoals(goalsWithDates);
      }

      // Handle selected goal changes
      if (e.key === SELECTED_GOAL_KEY) {
        setSelectedGoalId(parseInt(e.newValue, 10));
      }

      // Handle task completion changes
      if (e.key.startsWith('completed_tasks_') || e.key.startsWith('tasks_')) {
        setTaskCompletionSignal(prev => prev + 1);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Save goals to localStorage (removed manual StorageEvent dispatch)
  useEffect(() => {
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(allGoals));
  }, [allGoals]);

  // Save selected goal (removed manual StorageEvent dispatch)
  useEffect(() => {
    if (selectedGoalId !== null) {
      localStorage.setItem(SELECTED_GOAL_KEY, selectedGoalId.toString());
    } else {
      localStorage.removeItem(SELECTED_GOAL_KEY);
    }
  }, [selectedGoalId]);

  // Clear selected goal if it becomes archived
  useEffect(() => {
    if (selectedGoalId) {
      const selectedGoal = allGoals.find(g => g.id === selectedGoalId);
      if (selectedGoal?.isArchived) {
        setSelectedGoalId(null);
      }
    }
  }, [selectedGoalId, allGoals]);

  const handleTaskCompletionToggle = (taskId: number, goalId: number) => {
    const goal = allGoals.find(g => g.id === goalId);
    const tasks = loadTasksForGoal(goalId);
    const taskToToggle = tasks.find((task: Task) => task.id === taskId);

    if (!taskToToggle || !goal) return;

    const isCurrentlyCompleted = isTaskCompletedToday(taskId, goalId);

    if (isCurrentlyCompleted) {
      // Undo the completion
      const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${goalId}`) || '[]');
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Remove today's completion of this task
      const updatedCompletedTasks = completedTasks.filter((task: any) => {
        const completedDate = new Date(task.completedAt);
        completedDate.setHours(0, 0, 0, 0);
        return !(task.id === taskId && completedDate.getTime() === today.getTime());
      });
      localStorage.setItem(`completed_tasks_${goalId}`, JSON.stringify(updatedCompletedTasks));

      // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs

      if (goal.isHabit) {
        // For habit goals: check if we need to remove today from streak
        const hasOtherTasksCompletedToday = updatedCompletedTasks.some((task: any) => {
          const completedDate = new Date(task.completedAt);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate.getTime() === today.getTime();
        });

        if (!hasOtherTasksCompletedToday) {
          // Remove today from streak if no other tasks were completed
          const currentStreak = goal.streak || [];
          const updatedStreak = currentStreak.filter(date => {
            const streakDate = new Date(date);
            streakDate.setHours(0, 0, 0, 0);
            return streakDate.getTime() !== today.getTime();
          });

          const updatedGoal = {
            ...goal,
            streak: updatedStreak
          };

          setAllGoals(prevGoals =>
            prevGoals.map(g => g.id === goalId ? updatedGoal : g)
          );
        }
      }
    } else {
      // Complete the task
      const completedTasks = JSON.parse(localStorage.getItem(`completed_tasks_${goalId}`) || '[]');
      const newCompletedTask = {
        ...taskToToggle,
        completed: true,
        completedAt: new Date().toISOString()
      };
      const updatedCompletedTasks = [...completedTasks, newCompletedTask];

      localStorage.setItem(`completed_tasks_${goalId}`, JSON.stringify(updatedCompletedTasks));

      // Note: Removed manual StorageEvent dispatch - browser handles this automatically for other tabs

      if (goal.isHabit) {
        // For habit goals: move completed task to bottom and update streak
        const updatedTasks = tasks.filter((task: Task) => task.id !== taskId);
        const resetTask = { ...taskToToggle, completed: false };
        updatedTasks.push(resetTask);

        // Save the reordered tasks
        saveTasksForGoal(goalId, updatedTasks);

        // Update streak - add today's date if not already present
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentStreak = goal.streak || [];
        const todayExists = currentStreak.some(date => {
          const streakDate = new Date(date);
          streakDate.setHours(0, 0, 0, 0);
          return streakDate.getTime() === today.getTime();
        });

        if (!todayExists) {
          const updatedGoal = {
            ...goal,
            streak: [...currentStreak, today]
          };

          setAllGoals(prevGoals =>
            prevGoals.map(g => g.id === goalId ? updatedGoal : g)
          );
        }
      } else {
        // For non-habit goals: remove task from active tasks
        const updatedTasks = tasks.filter((task: Task) => task.id !== taskId);
        saveTasksForGoal(goalId, updatedTasks);
      }
    }

    // Signal that a task completion occurred
    setTaskCompletionSignal(prev => prev + 1);
  };

  return (
    <BrowserRouter basename="/goal-tracking-app">
      <div className="min-h-screen bg-white">
        <Header />
        <Routes>
          <Route
            path="/"
            element={
              <main className="max-w-5xl mx-auto px-4 py-8">
                <TaskSection
                  goals={activeGoals}
                  selectedGoalId={selectedGoalId}
                  onSelectGoal={setSelectedGoalId}
                  onTaskCompletionToggle={handleTaskCompletionToggle}
                  loadTasksForGoal={loadTasksForGoal}
                  taskCompletionSignal={taskCompletionSignal}
                  isTaskCompletedToday={isTaskCompletedToday}
                />
                <GoalsSection
                  goals={activeGoals}
                  setGoals={setAllGoals}
                  onTaskCompletionToggle={handleTaskCompletionToggle}
                  loadTasksForGoal={loadTasksForGoal}
                  saveTasksForGoal={saveTasksForGoal}
                />
              </main>
            }
          />
          <Route
            path="/history"
            element={<History goals={allGoals} />}
          />
          <Route
            path="/archive"
            element={<Archive goals={allGoals} setGoals={setAllGoals} />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;