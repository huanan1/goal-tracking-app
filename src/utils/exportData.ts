import { Goal, Task } from '../types';

interface CompletedTask extends Task {
  completedAt: string;
}

interface ExportData {
  exportDate: string;
  goals: Goal[];
  tasks: Record<number, Task[]>;
  completedTasks: Record<number, CompletedTask[]>;
  selectedGoal: number | null;
}

export const exportAllData = (): void => {
  try {
    // Get all goals
    const goalsData = localStorage.getItem('achieve_goals');
    const goals: Goal[] = goalsData ? JSON.parse(goalsData) : [];

    // Get selected goal
    const selectedGoalData = localStorage.getItem('selected_goal_for_today');
    const selectedGoal = selectedGoalData ? parseInt(selectedGoalData, 10) : null;

    // Get tasks and completed tasks for each goal
    const tasks: Record<number, Task[]> = {};
    const completedTasks: Record<number, CompletedTask[]> = {};

    goals.forEach(goal => {
      // Get active tasks
      const goalTasks = localStorage.getItem(`tasks_${goal.id}`);
      tasks[goal.id] = goalTasks ? JSON.parse(goalTasks) : [];

      // Get completed tasks
      const goalCompletedTasks = localStorage.getItem(`completed_tasks_${goal.id}`);
      completedTasks[goal.id] = goalCompletedTasks ? JSON.parse(goalCompletedTasks) : [];
    });

    // Create export data object
    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      goals: goals.map(goal => ({
        ...goal,
        // Convert streak dates to ISO strings for proper serialization
        streak: goal.streak ? goal.streak.map(date => 
          typeof date === 'string' ? date : date.toISOString()
        ) : undefined
      })),
      tasks,
      completedTasks,
      selectedGoal
    };

    // Create and download file
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `achieve-data-export-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    console.log('Data exported successfully');
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data. Please try again.');
  }
};

export const getExportStats = (): { goalCount: number; taskCount: number; completedTaskCount: number } => {
  try {
    const goalsData = localStorage.getItem('achieve_goals');
    const goals: Goal[] = goalsData ? JSON.parse(goalsData) : [];

    let taskCount = 0;
    let completedTaskCount = 0;

    goals.forEach(goal => {
      const goalTasks = localStorage.getItem(`tasks_${goal.id}`);
      const tasks = goalTasks ? JSON.parse(goalTasks) : [];
      taskCount += tasks.length;

      const goalCompletedTasks = localStorage.getItem(`completed_tasks_${goal.id}`);
      const completedTasks = goalCompletedTasks ? JSON.parse(goalCompletedTasks) : [];
      completedTaskCount += completedTasks.length;
    });

    return {
      goalCount: goals.length,
      taskCount,
      completedTaskCount
    };
  } catch (error) {
    console.error('Error getting export stats:', error);
    return { goalCount: 0, taskCount: 0, completedTaskCount: 0 };
  }
};