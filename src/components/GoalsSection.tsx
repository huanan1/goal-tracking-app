import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import GoalCard from './GoalCard';
import GoalDetailsModal from './GoalDetailsModal';
import AddGoalModal from './AddGoalModal';
import { Goal, Task } from '../types';

interface GoalsSectionProps {
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  onTaskCompletionToggle: (taskId: number, goalId: number) => void;
  loadTasksForGoal: (goalId: number) => Task[];
  saveTasksForGoal: (goalId: number, tasks: Task[]) => void;
}

const GoalsSection: React.FC<GoalsSectionProps> = ({ 
  goals, 
  setGoals, 
  onTaskCompletionToggle,
  loadTasksForGoal,
  saveTasksForGoal
}) => {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleGoalClick = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsModalOpen(true);
  };

  const handleGoalSave = (updatedGoal: Goal) => {
    setGoals(goals.map(goal => goal.id === updatedGoal.id ? updatedGoal : goal));
  };

  const handleGoalDelete = (goalId: number) => {
    setGoals(goals.filter(goal => goal.id !== goalId));
  };

  const handleAddGoal = (newGoal: Goal, tasks: Task[]) => {
    // Add the new goal
    setGoals([...goals, newGoal]);
    
    // Save the tasks for this goal if any were provided
    if (tasks.length > 0) {
      saveTasksForGoal(newGoal.id, tasks);
    }
  };
  
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Goals</h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Add Goal
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map(goal => (
          <GoalCard 
            key={goal.id}
            title={goal.title}
            description={goal.description}
            onClick={() => handleGoalClick(goal)}
          />
        ))}
        
        {goals.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p>No goals yet. Create your first goal to get started!</p>
          </div>
        )}
      </div>

      {isModalOpen && selectedGoal && (
        <GoalDetailsModal
          goal={selectedGoal}
          onClose={() => setIsModalOpen(false)}
          onSave={handleGoalSave}
          onDelete={handleGoalDelete}
          onTaskCompletionToggle={onTaskCompletionToggle}
          loadTasksForGoal={loadTasksForGoal}
          saveTasksForGoal={saveTasksForGoal}
        />
      )}

      {isAddModalOpen && (
        <AddGoalModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleAddGoal}
        />
      )}
    </section>
  );
};

export default GoalsSection;