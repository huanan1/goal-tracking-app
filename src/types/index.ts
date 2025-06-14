export interface Goal {
  id: number;
  title: string;
  description: string;
  progress?: number;
  isHabit?: boolean;
  streak?: Date[];
  isArchived?: boolean;
}

export interface Task {
  id: number;
  title: string;
  completed: boolean;
  dueDate: Date;
  goalId?: number;
}