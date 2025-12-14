import React, { useState, useMemo, useRef, useCallback, ReactNode } from 'react';
import { Shop, Expense, OrderedItem, OrderStatus, FormSubmission, TodoItem, CalendarTask, Role } from '../types';
import { useLocalization } from '../hooks/useLocalization';
import DollarSignIcon from './icons/DollarSignIcon';
import TrendingUpIcon from './icons/TrendingUpIcon';
import TrendingDownIcon from './icons/TrendingDownIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import ShoppingCartIcon from './icons/ShoppingCartIcon';
import CalendarIcon from './icons/CalendarIcon';
import ChevronDownIcon from './icons/ChevronDownIcon';
import XIcon from './icons/XIcon';
import { useToast } from '../contexts/ToastContext';

interface AccountantPanelProps {
    shop: Shop;
    onUpdateShop: (updater: (prevShop: Shop) => Shop) => void;
    currentUserRole: Role | null;
}

const toISODateString = (date: Date) => {
    const tzoffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
};

// --- WIDGETS ---

const FinancialKpisWidget: React.FC<{ metrics: { netRevenue: number; grossProfit: number; totalExpenses: number; netProfit: number; } }> = ({ metrics }) => {
    const { t } = useLocalization();
    const kpis = [
        { title: t('netRevenue'), value: metrics.netRevenue, icon: <DollarSignIcon className="w-6 h-6 text-green-400"/> },
        { title: t('grossProfit'), value: metrics.grossProfit, icon: <TrendingUpIcon className="w-6 h-6 text-green-400"/> },
        { title: t('totalExpenses'), value: metrics.totalExpenses, icon: <TrendingDownIcon className="w-6 h-6 text-red-400"/> },
        { title: t('netProfit'), value: metrics.netProfit, icon: metrics.netProfit >= 0 ? <TrendingUpIcon className="w-6 h-6 text-green-400"/> : <TrendingDownIcon className="w-6 h-6 text-red-400"/>, valueClass: metrics.netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
    ];
    return (
        <div className="bg-[#1D3B59] p-4 rounded-lg">
            <h4 className="font-bold text-white mb-4">{t('financialKpis')}</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {kpis.map(kpi => (
                    <div key={kpi.title} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                            {kpi.icon}
                            <h5 className="text-sm text-gray-400">{kpi.title}</h5>
                        </div>
                        <p className={`text-2xl font-bold mt-2 ${kpi.valueClass || 'text-white'}`}>{kpi.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};


const CalendarWidget: React.FC<{ tasks: CalendarTask[], onTaskChange: (tasks: CalendarTask[]) => void }> = ({ tasks, onTaskChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const startingDay = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();

    const tasksByDate = useMemo(() => {
        const map = new Map<string, CalendarTask[]>();
        (tasks || []).forEach(task => {
            if (!map.has(task.date)) {
                map.set(task.date, []);
            }
            map.get(task.date)!.push(task);
        });
        return map;
    }, [tasks]);

    const changeMonth = (delta: number) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
    };

    const handleOpenTaskEditor = (date: string) => {
        setSelectedDate(date);
    };

    const handleSaveTask = (task: CalendarTask) => {
        const isNew = !tasks.some(t => t.id === task.id);
        if (isNew) {
            onTaskChange([...(tasks || []), task]);
        } else {
            onTaskChange((tasks || []).map(t => t.id === task.id ? task : t));
        }
    };
    
    const handleDeleteTask = (taskId: string) => {
        onTaskChange((tasks || []).filter(t => t.id !== taskId));
    };

    return (
        <>
            {selectedDate && (
                <TaskEditorModal
                    date={selectedDate}
                    tasksForDate={tasksByDate.get(selectedDate) || []}
                    onClose={() => setSelectedDate(null)}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                />
            )}
            <div className="bg-[#1D3B59] p-4 rounded-lg h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-700">‹</button>
                    <h4 className="font-bold text-white text-lg">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-700">›</button>
                </div>
                <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 flex-grow">
                    {Array.from({ length: startingDay }).map((_, i) => <div key={`empty-${i}`} className="bg-gray-800/30 rounded-md"></div>)}
                    {Array.from({ length: daysInMonth }).map((_, day) => {
                        const dateNum = day + 1;
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
                        const tasksForDay = tasksByDate.get(dateStr) || [];
                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), dateNum).toDateString();
                        
                        return (
                            <button key={dateNum} onClick={() => handleOpenTaskEditor(dateStr)} className={`p-1.5 rounded-md h-full flex flex-col items-start justify-start text-sm transition-colors text-left ${isToday ? 'bg-blue-600/50' : 'bg-gray-800 hover:bg-gray-700'}`}>
                                <span className={`font-semibold ${isToday ? 'text-white' : ''}`}>{dateNum}</span>
                                {tasksForDay.length > 0 && (
                                    <div className="mt-1 w-full space-y-0.5 overflow-hidden">
                                        {tasksForDay.slice(0, 1).map(task => (
                                            <p key={task.id} className="text-[10px] bg-yellow-400/20 text-yellow-200 px-1 rounded truncate leading-tight">{task.title}</p>
                                        ))}
                                        {tasksForDay.length > 1 && (
                                            <p className="text-[9px] text-gray-400">+ {tasksForDay.length - 1} more</p>
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

const TodoWidget: React.FC<{ todos: TodoItem[], onTodosChange: (todos: TodoItem[]) => void, onDeleteTodo: (id: string) => void }> = ({ todos, onTodosChange, onDeleteTodo }) => {
    const { t } = useLocalization();
    const [newTodoText, setNewTodoText] = useState('');
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const visibleTodos = useMemo(() => {
        return (todos || [])
            .filter(t => !t.isCompleted || (t.completedAt && t.completedAt > sevenDaysAgo))
            .sort((a, b) => {
                if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
                if (a.isCompleted) return (b.completedAt || 0) - (a.completedAt || 0);
                return b.createdAt - a.createdAt;
            });
    }, [todos, sevenDaysAgo]);

    const handleAddTodo = () => {
        if (newTodoText.trim()) {
            const newTodo: TodoItem = {
                id: `todo_${Date.now()}`,
                text: newTodoText.trim(),
                isCompleted: false,
                createdAt: Date.now(),
            };
            onTodosChange([...(todos || []), newTodo]);
            setNewTodoText('');
        }
    };
    
    const handleToggleTodo = (id: string) => {
        onTodosChange((todos || []).map(t => t.id === id ? { ...t, isCompleted: !t.isCompleted, completedAt: !t.isCompleted ? Date.now() : undefined } : t));
    };

    return (
        <div className="bg-[#1D3B59] p-4 rounded-lg h-full flex flex-col overflow-hidden">
            <h4 className="font-bold text-white mb-3">{t('todoList')}</h4>
            <div className="flex gap-2 mb-3">
                <input type="text" value={newTodoText} onChange={e => setNewTodoText(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleAddTodo()} placeholder="Add a new task..." className="flex-grow bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"/>
                <button onClick={handleAddTodo} className="p-2 bg-blue-600 hover:bg-blue-700 rounded"><PlusIcon className="w-5 h-5"/></button>
            </div>
            <div className="flex-grow overflow-y-auto space-y-2 pr-2">
                {visibleTodos.map(todo => (
                     <div key={todo.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-700/50 group">
                        <label className="flex items-center gap-3 cursor-pointer flex-grow">
                            <input type="checkbox" checked={todo.isCompleted} onChange={() => handleToggleTodo(todo.id)} className="h-5 w-5 rounded-md bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 flex-shrink-0" />
                            <span className={`text-sm ${todo.isCompleted ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{todo.text}</span>
                        </label>
                        <button onClick={() => onDeleteTodo(todo.id)} className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const NotepadWidget: React.FC<{ note: string, onNoteChange: (note: string) => void }> = ({ note, onNoteChange }) => {
    const { t } = useLocalization();
    const [text, setText] = useState(note);
    const timeoutRef = useRef<number | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => {
            onNoteChange(e.target.value);
        }, 500); // Debounce save
    };
    
    return (
        <div className="bg-[#1D3B59] p-4 rounded-lg h-full flex flex-col">
            <h4 className="font-bold text-white mb-2">{t('quickNote')}</h4>
            <textarea value={text} onChange={handleChange} className="w-full h-full flex-grow bg-transparent text-sm text-gray-300 resize-none focus:outline-none" placeholder="Jot down some notes..."></textarea>
        </div>
    );
};

const ExpenseChartWidget: React.FC<{ expenses: Expense[] }> = ({ expenses }) => {
    const { t } = useLocalization();
    const data = useMemo(() => {
        const aggregated: { [key: string]: number } = {};
        (expenses || []).forEach(exp => {
            aggregated[exp.category] = (aggregated[exp.category] || 0) + exp.amount;
        });
        const total = Object.values(aggregated).reduce((sum, val) => sum + val, 0);
        return Object.entries(aggregated)
            .map(([name, value]) => ({ name, value, percentage: total > 0 ? (value / total) * 100 : 0 }))
            .sort((a, b) => b.value - a.value);
    }, [expenses]);
    
    const colors = ['#635BFF', '#A09CFF', '#3F83F8', '#34D399', '#FBBF24', '#F87171'];
    let cumulativePercentage = 0;

    return (
        <div className="bg-[#1D3B59] p-4 rounded-lg h-full flex flex-col items-center">
            <h4 className="font-bold text-white mb-4">{t('expenseBreakdown')}</h4>
            {data.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center gap-4 w-full">
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <svg viewBox="0 0 36 36" className="transform -rotate-90">
                            {data.map((segment, index) => {
                                const offset = cumulativePercentage;
                                cumulativePercentage += segment.percentage;
                                return (
                                    <circle
                                        key={segment.name}
                                        cx="18"
                                        cy="18"
                                        r="15.915"
                                        fill="transparent"
                                        stroke={colors[index % colors.length]}
                                        strokeWidth="4"
                                        strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                                        strokeDashoffset={-offset}
                                    />
                                );
                            })}
                        </svg>
                    </div>
                    <div className="text-xs space-y-1 overflow-y-auto">
                        {data.map((segment, index) => (
                            <div key={segment.name} className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }}></div>
                                <span className="text-gray-300">{segment.name}:</span>
                                <span className="font-semibold text-white">{segment.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : <p className="text-sm text-gray-500 mt-8">No expense data.</p>}
        </div>
    );
};

const TaskEditorModal: React.FC<{
    date: string;
    tasksForDate: CalendarTask[];
    onClose: () => void;
    onSave: (task: CalendarTask) => void;
    onDelete: (taskId: string) => void;
}> = ({ date, tasksForDate, onClose, onSave, onDelete }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSave = () => {
        if (!title.trim()) return;
        const newTask: CalendarTask = {
            id: `task_${Date.now()}`,
            date,
            title: title.trim(),
            description: description.trim(),
        };
        onSave(newTask);
        setTitle('');
        setDescription('');
    };

    return (
         <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg border border-gray-700 flex flex-col max-h-[90vh]">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">Tasks for {new Date(date.replace(/-/g, '/')).toLocaleDateString()}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white"><XIcon className="w-5 h-5" /></button>
                </header>
                <div className="flex-grow overflow-y-auto p-4 space-y-4">
                     {tasksForDate.length > 0 ? (
                        tasksForDate.map(task => (
                            <div key={task.id} className="bg-gray-700/50 p-3 rounded-md flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-white">{task.title}</p>
                                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{task.description}</p>
                                </div>
                                <button onClick={() => onDelete(task.id)} className="p-1 text-gray-400 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        ))
                     ) : <p className="text-center text-gray-500">No tasks for this day.</p>}
                </div>
                <div className="p-4 border-t border-gray-700 space-y-2">
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="New task title" className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"/>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-sm text-white"/>
                    <button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded">Add Task</button>
                </div>
            </div>
        </div>
    );
};


// Main Panel
const AccountantPanel: React.FC<AccountantPanelProps> = ({ shop, onUpdateShop, currentUserRole }) => {
    const { t } = useLocalization();
    const [endDate, setEndDate] = useState(new Date());
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 29); // 30 days including today
        return d;
    });

     const filteredData = useMemo(() => {
        const startOfDay = new Date(startDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        const expenses = (shop.expenses || []).filter(exp => {
            const expDate = new Date(exp.date);
            expDate.setMinutes(expDate.getMinutes() + expDate.getTimezoneOffset());
            return expDate >= startOfDay && expDate <= endOfDay;
        });

        const submissions = (shop.formSubmissions || []).filter(sub => {
            const subDate = new Date(sub.submittedAt);
            return subDate >= startOfDay && subDate <= endOfDay;
        });
        
        return { expenses, submissions };
    }, [shop.expenses, shop.formSubmissions, startDate, endDate]);


    const financialMetrics = useMemo(() => {
        const completedSubs = filteredData.submissions.filter(s => s.status === OrderStatus.Completed);
        const totalExpenses = filteredData.expenses.reduce((sum, exp) => sum + exp.amount, 0);

        let netRevenue = 0;
        let grossProfit = 0;

        completedSubs.forEach(sub => {
            sub.orderedProducts.forEach(item => {
                const revenue = item.unitPrice * item.quantity;
                netRevenue += revenue;
                const productDetails = shop.items.find(p => p.id === item.productId);
                if (productDetails && productDetails.originalPrice) {
                    const cost = productDetails.originalPrice * item.quantity;
                    grossProfit += (revenue - cost);
                } else {
                    grossProfit += revenue; // Assume 100% profit for services or items without cost
                }
            });
        });
        
        const netProfit = grossProfit - totalExpenses;

        return { netRevenue, grossProfit, totalExpenses, netProfit };
    }, [filteredData, shop.items]);


    const widgets = useMemo(() => {
        const allWidgets = shop.operationWidgets || [];
        return [...allWidgets].sort((a, b) => a.order - b.order);
    }, [shop.operationWidgets]);

    const handleDeleteTodo = useCallback((todoId: string) => {
        onUpdateShop(s => ({
            ...s,
            todos: (s.todos || []).filter(t => t.id !== todoId),
        }));
    }, [onUpdateShop]);

    return (
        <div className="h-full overflow-y-auto pr-2 space-y-6">
             <div className="flex items-center gap-4">
                <label className="text-sm text-gray-400">{t('dateRange')}:</label>
                <input type="date" value={toISODateString(startDate)} onChange={e => setStartDate(new Date(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white"/>
                <span>-</span>
                <input type="date" value={toISODateString(endDate)} onChange={e => setEndDate(new Date(e.target.value))} className="bg-gray-700 border border-gray-600 rounded-md p-2 text-sm text-white"/>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 auto-rows-min gap-6">
                {widgets.map(widget => {
                    const className = `lg:col-span-${widget.width}`;
                    switch (widget.id) {
                        case 'financial_kpis':
                            if (currentUserRole !== Role.OWNER && currentUserRole !== Role.ADMIN) return null;
                            return <div key={widget.id} className={className}><FinancialKpisWidget metrics={financialMetrics} /></div>;
                        case 'task_calendar':
                            return <div key={widget.id} className={`${className} lg:row-span-2 min-h-[400px]`}><CalendarWidget tasks={shop.calendarTasks || []} onTaskChange={(tasks) => onUpdateShop(s => ({...s, calendarTasks: tasks}))}/></div>;
                        case 'todo_list':
                            return <div key={widget.id} className={`${className} min-h-[400px] overflow-hidden`}><TodoWidget todos={shop.todos || []} onTodosChange={(todos) => onUpdateShop(s => ({...s, todos: todos}))} onDeleteTodo={handleDeleteTodo} /></div>;
                        case 'quick_note':
                            return <div key={widget.id} className={`${className} min-h-[400px]`}><NotepadWidget note={shop.quickNote || ''} onNoteChange={(note) => onUpdateShop(s => ({...s, quickNote: note}))}/></div>;
                        case 'expense_breakdown':
                            return <div key={widget.id} className={`${className} min-h-[400px]`}><ExpenseChartWidget expenses={filteredData.expenses} /></div>;
                        case 'expense_tracking':
                             return <div key={widget.id} className={`${className} min-h-[400px] overflow-hidden`}><ExpenseTrackingTable expenses={shop.expenses || []} onUpdateShop={onUpdateShop} /></div>;
                        default:
                            return null;
                    }
                })}
            </div>
        </div>
    );
};

// Kept the original Expense Tracking table for data entry
const ExpenseTrackingTable: React.FC<{ expenses: Expense[], onUpdateShop: (updater: (prevShop: Shop) => Shop) => void; }> = ({ expenses, onUpdateShop }) => {
    const { t } = useLocalization();
    const [editingExpense, setEditingExpense] = useState<Partial<Expense> | null>(null);

    const handleSaveExpense = () => {
        if (!editingExpense || !editingExpense.date || !editingExpense.amount || !editingExpense.category || !editingExpense.description) {
            alert("Please fill all fields.");
            return;
        }
        onUpdateShop(s => ({
            ...s,
            expenses: editingExpense.id
                ? (s.expenses || []).map(e => e.id === editingExpense.id ? editingExpense as Expense : e)
                : [...(s.expenses || []), { ...editingExpense, id: `exp_${Date.now()}` } as Expense],
        }));
        setEditingExpense(null);
    };

    const handleDeleteExpense = (id: string) => {
        onUpdateShop(s => ({ ...s, expenses: (s.expenses || []).filter(e => e.id !== id) }));
    };

    return (
        <div className="bg-[#1D3B59] p-6 rounded-lg h-full flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h3 className="text-xl font-bold text-white">{t('expenseTracking')}</h3>
                <button onClick={() => setEditingExpense({ date: toISODateString(new Date()), category: 'Other', description: '', amount: 0 })} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-semibold">
                    <PlusIcon className="w-4 h-4"/> Add Expense
                </button>
            </div>
            {editingExpense && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 p-3 bg-gray-700 rounded-md mb-4 items-end flex-shrink-0">
                    <input type="date" value={editingExpense.date || ''} onChange={e => setEditingExpense(p => ({...p, date: e.target.value}))} className="bg-gray-600 p-2 rounded text-sm w-full"/>
                    <input type="number" placeholder="Amount" value={editingExpense.amount || ''} onChange={e => setEditingExpense(p => ({...p, amount: parseFloat(e.target.value) || 0}))} className="bg-gray-600 p-2 rounded text-sm w-full"/>
                    <select value={editingExpense.category} onChange={e => setEditingExpense(p => ({...p, category: e.target.value as Expense['category']}))} className="bg-gray-600 p-2 rounded text-sm w-full">
                        {['Rent', 'Marketing', 'Supplies', 'Salaries', 'Utilities', 'Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                    <input type="text" placeholder="Description" value={editingExpense.description || ''} onChange={e => setEditingExpense(p => ({...p, description: e.target.value}))} className="bg-gray-600 p-2 rounded text-sm w-full md:col-span-2"/>
                    <div className="md:col-span-5 flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingExpense(null)} className="px-3 py-1.5 text-xs bg-gray-500 rounded">Cancel</button>
                        <button onClick={handleSaveExpense} className="px-3 py-1.5 text-xs bg-blue-600 rounded">Save</button>
                    </div>
                </div>
            )}
             <div className="overflow-y-auto flex-grow">
                <table className="min-w-full text-sm text-left">
                    <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
                        <tr>
                            <th className="p-3">Date</th><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3 text-right">Amount</th><th className="p-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                    {[...(expenses || [])].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(exp => (
                        <tr key={exp.id}>
                            <td className="p-3">{exp.date}</td>
                            <td className="p-3">{exp.category}</td>
                            <td className="p-3">{exp.description}</td>
                            <td className="p-3 text-right font-mono">{exp.amount.toLocaleString()}</td>
                            <td className="p-3 text-right">
                                <button onClick={() => handleDeleteExpense(exp.id)} className="text-gray-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                 {(!expenses || expenses.length === 0) && <p className="text-center py-8 text-gray-500">No expenses recorded.</p>}
            </div>
        </div>
    );
};

export default AccountantPanel;