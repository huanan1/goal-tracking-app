import { Goal, Task } from '../types';

interface CompletedTask extends Task {
  completedAt: string;
}

interface ImportData {
  exportDate?: string;
  goals: Goal[];
  tasks: Record<number, Task[]>;
  completedTasks: Record<number, CompletedTask[]>;
  selectedGoal?: number | null;
}

export const importData = (file: File): Promise<{ success: boolean; message: string; stats?: any }> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importData: ImportData = JSON.parse(content);
        
        // Validate the imported data structure
        if (!importData.goals || !Array.isArray(importData.goals)) {
          resolve({ success: false, message: 'Invalid file format: missing or invalid goals data' });
          return;
        }

        // Get existing data
        const existingGoalsData = localStorage.getItem('achieve_goals');
        const existingGoals: Goal[] = existingGoalsData ? JSON.parse(existingGoalsData) : [];
        
        // Create ID mapping for imported goals to avoid conflicts
        const maxExistingId = existingGoals.length > 0 ? Math.max(...existingGoals.map(g => g.id)) : 0;
        const idMapping: Record<number, number> = {};
        
        // Process imported goals
        const processedGoals = importData.goals.map((goal, index) => {
          const newId = maxExistingId + index + 1;
          idMapping[goal.id] = newId;
          
          return {
            ...goal,
            id: newId,
            // Convert streak dates back to Date objects
            streak: goal.streak ? goal.streak.map(date => new Date(date)) : undefined
          };
        });

        // Merge goals
        const mergedGoals = [...existingGoals, ...processedGoals];
        localStorage.setItem('achieve_goals', JSON.stringify(mergedGoals));

        // Process and merge tasks for each imported goal
        let importedTaskCount = 0;
        let importedCompletedTaskCount = 0;

        Object.entries(importData.tasks || {}).forEach(([oldGoalId, tasks]) => {
          const newGoalId = idMapping[parseInt(oldGoalId)];
          if (!newGoalId) return;

          // Get existing tasks for this goal (if any)
          const existingTasksData = localStorage.getItem(`tasks_${newGoalId}`);
          const existingTasks: Task[] = existingTasksData ? JSON.parse(existingTasksData) : [];
          
          // Create new IDs for imported tasks to avoid conflicts
          const maxExistingTaskId = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.id)) : 0;
          
          const processedTasks = tasks.map((task, index) => ({
            ...task,
            id: maxExistingTaskId + index + 1,
            goalId: newGoalId,
            dueDate: new Date(task.dueDate)
          }));

          // Merge tasks
          const mergedTasks = [...existingTasks, ...processedTasks];
          localStorage.setItem(`tasks_${newGoalId}`, JSON.stringify(mergedTasks));
          importedTaskCount += processedTasks.length;
        });

        // Process and merge completed tasks
        Object.entries(importData.completedTasks || {}).forEach(([oldGoalId, completedTasks]) => {
          const newGoalId = idMapping[parseInt(oldGoalId)];
          if (!newGoalId) return;

          // Get existing completed tasks
          const existingCompletedData = localStorage.getItem(`completed_tasks_${newGoalId}`);
          const existingCompleted: CompletedTask[] = existingCompletedData ? JSON.parse(existingCompletedData) : [];
          
          // Create new IDs for imported completed tasks
          const maxExistingCompletedId = existingCompleted.length > 0 ? Math.max(...existingCompleted.map(t => t.id)) : 0;
          
          const processedCompletedTasks = completedTasks.map((task, index) => ({
            ...task,
            id: maxExistingCompletedId + index + 1,
            goalId: newGoalId,
            dueDate: new Date(task.dueDate)
          }));

          // Merge completed tasks
          const mergedCompleted = [...existingCompleted, ...processedCompletedTasks];
          localStorage.setItem(`completed_tasks_${newGoalId}`, JSON.stringify(mergedCompleted));
          importedCompletedTaskCount += processedCompletedTasks.length;
        });

        // Trigger storage events to update other tabs
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'achieve_goals',
          newValue: JSON.stringify(mergedGoals),
          storageArea: localStorage
        }));

        // Trigger events for task updates
        Object.values(idMapping).forEach(goalId => {
          window.dispatchEvent(new StorageEvent('storage', {
            key: `tasks_${goalId}`,
            newValue: localStorage.getItem(`tasks_${goalId}`),
            storageArea: localStorage
          }));
          
          window.dispatchEvent(new StorageEvent('storage', {
            key: `completed_tasks_${goalId}`,
            newValue: localStorage.getItem(`completed_tasks_${goalId}`),
            storageArea: localStorage
          }));
        });

        const stats = {
          goalsImported: processedGoals.length,
          tasksImported: importedTaskCount,
          completedTasksImported: importedCompletedTaskCount
        };

        resolve({ 
          success: true, 
          message: `Successfully imported ${stats.goalsImported} goals, ${stats.tasksImported} tasks, and ${stats.completedTasksImported} completed tasks.`,
          stats
        });

      } catch (error) {
        console.error('Error parsing import file:', error);
        resolve({ 
          success: false, 
          message: 'Failed to parse the import file. Please ensure it\'s a valid JSON file exported from Achieve.' 
        });
      }
    };

    reader.onerror = () => {
      resolve({ 
        success: false, 
        message: 'Failed to read the file. Please try again.' 
      });
    };

    reader.readAsText(file);
  });
};

export const validateImportFile = (file: File): { valid: boolean; message: string } => {
  // Check file type
  if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
    return { valid: false, message: 'Please select a valid JSON file.' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, message: 'File is too large. Maximum size is 10MB.' };
  }

  return { valid: true, message: '' };
};