import React, { useState } from 'react';
import { ArrowLeft, Plus, GripVertical, Trash2 } from 'lucide-react';
import ToggleSwitch from './ToggleSwitch';
import Calendar from './Calendar';
import { Goal, Task } from '../types';

interface AddGoalModalProps {
  onClose: () => void;
  onSave: (goal: Goal, tasks: Task[]) => void;
}

const AddGoalModal: React.FC<AddGoalModalProps> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isHabit, setIsHabit] = useState(false);
  const [streak, setStreak] = useState<Date[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editedTaskTitle, setEditedTaskTitle] = useState('');

  const handleSave = () => {
    if (!title.trim()) return;

    const newGoal: Goal = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      isHabit,
      streak: isHabit ? streak : undefined
    };

    // Assign the goal ID to all tasks
    const tasksWithGoalId = tasks.map(task => ({
      ...task,
      goalId: newGoal.id
    }));

    onSave(newGoal, tasksWithGoalId);
    onClose();
  };

  const handleDateToggle = (date: Date) => {
    const dateExists = streak.some(d => 
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    );

    setStreak(dateExists
      ? streak.filter(d => 
          d.getFullYear() !== date.getFullYear() ||
          d.getMonth() !== date.getMonth() ||
          d.getDate() !== date.getDate()
        )
      : [...streak, date]
    );
  };

  const handleAddTask = () => {
    if (newTask.trim()) {
      const task: Task = {
        id: Date.now() + Math.random(), // Add randomness to prevent ID conflicts
        title: newTask.trim(),
        completed: false,
        dueDate: new Date(),
        goalId: 0 // Will be set when saving the goal
      };
      setTasks([...tasks, task]);
      setNewTask('');
    }
  };

  const handleDeleteTask = (taskId: number) => {
    setTasks(tasks.filter(task => task.id !== taskId));
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
  };

  const handleTaskTitleClick = (task: Task) => {
    setEditingTaskId(task.id);
    setEditedTaskTitle(task.title);
  };

  const handleTaskTitleChange = (taskId: number) => {
    if (editedTaskTitle.trim()) {
      setTasks(tasks.map(task => 
        task.id === taskId 
          ? { ...task, title: editedTaskTitle.trim() }
          : task
      ));
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-6 flex items-center border-b">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="space-y-6">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-2xl font-semibold border-0 border-b-2 border-gray-200 focus:border-gray-900 focus:ring-0 pb-2"
              placeholder="Goal Title"
            />

            <div className="flex items-center justify-between py-4 border-b border-gray-200">
              <div>
                <h3 className="font-medium">Habit</h3>
                <p className="text-sm text-gray-500">Is this a lifestyle goal?</p>
              </div>
              <ToggleSwitch
                checked={isHabit}
                onChange={setIsHabit}
              />
            </div>

            <div>
              <h3 className="font-medium mb-2">Description</h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-32 p-3 border border-gray-200 rounded-lg focus:border-gray-900 focus:ring-0"
                placeholder="Goal description"
              />
            </div>

            <div>
              <h3 className="font-medium mb-2">Tasks</h3>
              <p className="text-sm text-gray-500 mb-3">
                {isHabit 
                  ? 'For habit goals, completing any task will mark today as done and move that task to the bottom of the list.'
                  : 'For regular goals, completing a task will move it to your completed tasks history.'
                }
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
                {tasks.map(task => (
                  <div 
                    key={task.id} 
                    className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg cursor-move group"
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragOver={(e) => handleDragOver(e, task)}
                  >
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
                          className="flex-1 cursor-pointer hover:bg-gray-50 p-1 rounded"
                          onClick={() => handleTaskTitleClick(task)}
                        >
                          {task.title}
                        </span>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={false}
                      readOnly
                      className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                    />
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title="Delete task"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-6 text-gray-500 border border-gray-200 rounded-lg border-dashed">
                    <p>No tasks added yet</p>
                  </div>
                )}
              </div>
            </div>

            {isHabit && (
              <div>
                <h3 className="font-medium mb-2">Streak</h3>
                <p className="text-sm text-gray-500 mb-3">
                  Click on dates to add or remove them from your streak.
                </p>
                <div className="border border-gray-200 rounded-lg p-4">
                  <Calendar
                    currentDate={currentDate}
                    onDateChange={handleDateToggle}
                    markedDates={streak}
                    onMonthChange={setCurrentDate}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t mt-auto">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddGoalModal;