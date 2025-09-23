import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import {
  Plus,
  Users,
  TrendingUp,
  CreditCard,
  MessageCircle,
  Search,
  Filter,
  X,
  UserPlus,
  Mail,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  MoreHorizontal,
  PieChart,
  Zap,
} from "lucide-react";
import { supabase } from "../supabaseClient";

// -------------------- Types --------------------
type MembershipRow = {
  group_id: string;
  groups: {
    id: string;
    name: string;
    created_by: string;
  }[];
};

type GroupData = {
  id: string;
  name: string;
  members: number;
  totalExpenses: number;
  yourShare: number;
  unreadMessages: number;
  color: string;
};

type ExpenseData = {
  id: string;
  description: string;
  amount: number;
  group: string;
  date: string;
  type: 'expense' | 'payment';
  avatar?: string;
  labels?: string[];
};

// -------------------- Component --------------------
const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("groups");
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [recentExpenses, setRecentExpenses] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([""]);
  const [memberUpiIds, setMemberUpiIds] = useState<string[]>([""]);
  const [emailValidationErrors, setEmailValidationErrors] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [totalUserExpenses, setTotalUserExpenses] = useState<number>(0);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  // Add these with your existing useState declarations
  const [personalExpenseInput, setPersonalExpenseInput] = useState("");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<any[]>([]);
  const [personalExpenses, setPersonalExpenses] = useState<any[]>([]);
  const [budgetSpending, setBudgetSpending] = useState<any>({});
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newBudgetCategory, setNewBudgetCategory] = useState("Food & Dining");
  const [newBudgetAmount, setNewBudgetAmount] = useState("");
  const [newBudgetPeriod, setNewBudgetPeriod] = useState("weekly");
  // Add this with your other useState declarations (around line 50)
  const [isProcessingExpense, setIsProcessingExpense] = useState(false);

  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTargetAmount, setNewGoalTargetAmount] = useState("");
  const [newGoalTargetDate, setNewGoalTargetDate] = useState("");
  const [creatorUpiId, setCreatorUpiId] = useState("");
  
  
  // Fetch user's budgets
  const fetchUserBudgets = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: budgets, error } = await supabase
      .from("user_budgets")
      .select("*")
      .eq("user_id", user.id)
      .eq("period", "weekly");

    if (!error && budgets) {
      setBudgets(budgets);
    }
  };

  // Fetch user's savings goals
  const fetchSavingsGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: goals, error } = await supabase
      .from("savings_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && goals) {
      setSavingsGoals(goals);
    }
  };

  // Calculate budget spending for current week
  const calculateBudgetSpending = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get start of current week
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    const { data: expenses, error } = await supabase
      .from("personal_transactions")
      .select("label, amount")
      .eq("user_id", user.id)
      .gte("created_at", startOfWeek.toISOString());

    if (!error && expenses) {
      const spending = expenses.reduce((acc: any, expense: any) => {
        const category = expense.label || 'Miscellaneous';
        acc[category] = (acc[category] || 0) + parseFloat(expense.amount);
        return acc;
      }, {});
      setBudgetSpending(spending);
    }
  };

  // Handle adding personal expense
  // Handle adding personal expense - REPLACE the entire existing function
  // Ensure your handleAddPersonalExpense function looks like this
  const handleAddPersonalExpense = async () => {
    if (!personalExpenseInput.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simple parsing - you can make this more sophisticated
    const amount = personalExpenseInput.match(/\d+/)?.[0];
    if (!amount) {
      alert("Please include an amount in your expense");
      return;
    }

    try {
      setIsProcessingExpense(true); // If you added the loading state

      // Get the label from webhook (this will also handle savings goal updates)
      const predictedLabel = await getTransactionLabel(personalExpenseInput.trim());

      const { error } = await supabase
        .from("personal_transactions")
        .insert([{
          user_id: user.id,
          amount: parseFloat(amount),
          note: personalExpenseInput,
          label: predictedLabel
        }]);

      if (error) {
        alert("Error adding expense: " + error.message);
      } else {
        setPersonalExpenseInput("");
        calculateBudgetSpending(); // Refresh budget data
        alert("Expense added successfully!");
      }
    } catch (error) {
      console.error('Error processing expense:', error);
      alert("Error processing expense. Please try again.");
    } finally {
      setIsProcessingExpense(false); // If you added the loading state
    }
  };

  // Handle UPI payment
  const handleUPIPayment = () => {
    // This would integrate with UPI APIs
    alert("UPI payment feature - would integrate with payment gateway");
  };

  // Add this useEffect with your existing ones
  useEffect(() => {
    fetchUserBudgets();
    fetchSavingsGoals();
    calculateBudgetSpending();
  }, []);

  // Handle creating budget
  const handleCreateBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newBudgetAmount.trim()) {
      alert("Please enter a budget amount");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("user_budgets")
      .insert([{
        user_id: user.id,
        category: newBudgetCategory,
        period: newBudgetPeriod,
        amount: parseFloat(newBudgetAmount),
        start_date: new Date().toISOString().split('T')[0]
      }]);

    if (error) {
      alert("Error creating budget: " + error.message);
    } else {
      setNewBudgetCategory("Food & Dining");
      setNewBudgetAmount("");
      setNewBudgetPeriod("weekly");
      setShowBudgetModal(false);
      fetchUserBudgets(); // Refresh budgets
      alert("Budget created successfully!");
    }
  };

  // Handle creating savings goal
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newGoalTitle.trim() || !newGoalTargetAmount.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const goalData: any = {
      user_id: user.id,
      title: newGoalTitle.trim(),
      target_amount: parseFloat(newGoalTargetAmount),
      current_amount: 0
    };

    if (newGoalTargetDate) {
      goalData.target_date = newGoalTargetDate;
    }

    const { error } = await supabase
      .from("savings_goals")
      .insert([goalData]);

    if (error) {
      alert("Error creating goal: " + error.message);
    } else {
      setNewGoalTitle("");
      setNewGoalTargetAmount("");
      setNewGoalTargetDate("");
      setShowGoalModal(false);
      fetchSavingsGoals(); // Refresh goals
      alert("Savings goal created successfully!");
    }
  };


  const handleDeleteGroup = async (groupId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this group?");
    if (!confirmDelete) return;

    try {
      // First remove group_members entries
      const { error: memberError } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId);

      if (memberError) {
        console.error("Error deleting group members:", memberError.message);
        alert("Failed to delete group members.");
        return;
      }

      // Then delete the group itself
      const { error: groupError } = await supabase
        .from("groups")
        .delete()
        .eq("id", groupId);

      if (groupError) {
        console.error("Error deleting group:", groupError.message);
        alert("Failed to delete group.");
        return;
      }

      // Update UI
      setGroups((prev) => prev.filter((g) => g.id !== groupId));
      alert("Group deleted successfully!");
    } catch (err) {
      console.error("Unexpected error deleting group:", err);
      alert("An unexpected error occurred while deleting group.");
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert("Error logging out: " + error.message);
    } else {
      navigate("/login");
    }
    setIsLoggingOut(false);
  };

  // ✅ Fetch groups user belongs to - MODIFIED to filter by current user
  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting current user:", userError?.message);
        setLoading(false);
        return;
      }

      // Fetch only groups where current user is a member
      const {
        data: memberships,
        error,
      } = await supabase
        .from("group_members")
        .select("group_id, groups(id, name, created_by)")
        .eq('user_id', user.id);

      if (error) {
        console.error("Error fetching groups:", error.message);
        setLoading(false);
        return;
      }

      const formattedGroups: GroupData[] = [];

      for (const [index, membership] of (memberships as MembershipRow[]).entries()) {
        const group = Array.isArray(membership.groups)
          ? membership.groups[0]
          : membership.groups;

        // Calculate total expenses for this group where user is involved
        const { data: transactionDetails, error: expenseError } = await supabase
          .from("transaction_details")
          .select(`
            amount,
            transactions!inner(group_id)
          `)
          .eq('transactions.group_id', group?.id || membership.group_id)
          .or(`lender_id.eq.${user.id},borrower_id.eq.${user.id}`);

        let totalExpenses = 0;
        if (!expenseError && transactionDetails) {
          totalExpenses = transactionDetails.reduce((sum, detail) => sum + Number(detail.amount), 0);
        }

        // Get member count for this group
        const { data: memberCount } = await supabase
          .from("group_members")
          .select("user_id", { count: 'exact' })
          .eq('group_id', group?.id || membership.group_id);

        formattedGroups.push({
          id: group?.id || membership.group_id,
          name: group?.name || "Unnamed",
          members: memberCount?.length || 1,
          totalExpenses: totalExpenses,
          yourShare: Math.floor(Math.random() * 500) + 100, // Keep this random for now or calculate actual share
          unreadMessages: Math.floor(Math.random() * 5),
          color: ["from-teal-400 to-cyan-400", "from-emerald-400 to-teal-400", "from-cyan-400 to-blue-400"][
            index % 3
          ],
        });
      };

      setGroups(formattedGroups);
      setLoading(false);
    };

    fetchGroups();
  }, []);

  // Calculate total expenses across all groups for the user

  useEffect(() => {
    const fetchTotalUserExpenses = async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting current user:", userError?.message);
        return;
      }

      // Get all transaction details where user is either lender or borrower
      const { data: allTransactionDetails, error: expenseError } = await supabase
        .from("transaction_details")
        .select("amount")
        .or(`lender_id.eq.${user.id},borrower_id.eq.${user.id}`);

      if (!expenseError && allTransactionDetails) {
        const total = allTransactionDetails.reduce((sum, detail) => sum + Number(detail.amount), 0);
        setTotalUserExpenses(total);
      }
    };

    fetchTotalUserExpenses();
  }, []);

  // ✅ Fetch recent expenses - MODIFIED to filter by user's groups only
  useEffect(() => {
    const fetchExpenses = async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting current user:", userError?.message);
        return;
      }

      // First, get the user's group IDs
      const { data: userGroups, error: groupsError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq('user_id', user.id);

      if (groupsError) {
        console.error("Error fetching user groups:", groupsError.message);
        return;
      }

      const groupIds = userGroups?.map(g => g.group_id) || [];

      if (groupIds.length === 0) {
        // Generate mock data for demo
        const mockExpenses: ExpenseData[] = [
          {
            id: '1',
            description: 'Dinner at Italian Restaurant',
            amount: 85.50,
            group: 'Weekend Squad',
            date: '2024-01-15',
            type: 'expense',
            avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100&h=100&fit=crop&crop=face'
          },
          {
            id: '2',
            description: 'Uber ride to airport',
            amount: 32.75,
            group: 'Travel Buddies',
            date: '2024-01-14',
            type: 'expense',
            avatar: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?w=100&h=100&fit=crop&crop=face'
          },
          {
            id: '3',
            description: 'Coffee shop meeting',
            amount: 18.25,
            group: 'Work Team',
            date: '2024-01-14',
            type: 'expense',
            avatar: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?w=100&h=100&fit=crop&crop=face'
          },
          {
            id: '4',
            description: 'Payment received from John',
            amount: 45.00,
            group: 'Weekend Squad',
            date: '2024-01-13',
            type: 'payment',
            avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=100&h=100&fit=crop&crop=face'
          },
          {
            id: '5',
            description: 'Grocery shopping',
            amount: 127.80,
            group: 'Roommates',
            date: '2024-01-12',
            type: 'expense',
            avatar: 'https://images.pexels.com/photos/1181519/pexels-photo-1181519.jpeg?w=100&h=100&fit=crop&crop=face'
          }
        ];
        setRecentExpenses(mockExpenses);
        return;
      }

      // Fetch transactions only from user's groups
      const { data, error } = await supabase
        .from("transactions")
        .select("id, raw_text, group_id, created_at, groups(name)")
        .in('group_id', groupIds)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching expenses:", error.message);
        return;
      }

      const formattedExpenses: ExpenseData[] = data.map((txn: any) => ({
        id: txn.id,
        description: txn.raw_text,
        amount: Math.floor(Math.random() * 1000) / 10,
        group: Array.isArray(txn.groups) ? txn.groups[0]?.name : txn.groups?.name,
        date: new Date(txn.created_at).toISOString().split("T")[0],
        type: Math.random() > 0.8 ? 'payment' : 'expense',
      }));

      setRecentExpenses(formattedExpenses);
    };

    fetchExpenses();
  }, []);

  // Fetch user balance from balances table
  useEffect(() => {
    const fetchUserBalance = async () => {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error("Error getting current user:", userError?.message);
        setUserBalance(0);
        return;
      }

      // Fetch all balance records for the current user
      const { data: balances, error: balanceError } = await supabase
        .from("balances")
        .select("balance")
        .eq('user_id', user.id);

      if (balanceError) {
        console.error("Error fetching user balances:", balanceError.message);
        setUserBalance(0);
        return;
      }

      // Sum all balances for the user
      const totalBalance = balances?.reduce((sum, record) => sum + (record.balance || 0), 0) || 0;
      setUserBalance(totalBalance);
    };

    fetchUserBalance();
  }, []);

  // Add this function after the existing helper functions (around line 200) this is for personal transaction label
  // Replace the existing getTransactionLabel function
  // Replace the existing getTransactionLabel function with this debug version
  // Replace the existing getTransactionLabel function
  // Add this function after the existing helper functions (around line 250)
  const updateSavingsGoal = async (goalName: string, amount: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Find matching savings goal by title (case-insensitive)
      const { data: matchingGoals, error: fetchError } = await supabase
        .from("savings_goals")
        .select("id, current_amount, target_amount")
        .eq("user_id", user.id)
        .ilike("title", `%${goalName.trim()}%`); // Use ilike for case-insensitive partial matching

      if (fetchError) {
        console.error("Error fetching savings goals:", fetchError);
        return;
      }

      if (matchingGoals && matchingGoals.length > 0) {
        // Use the first matching goal
        const goal = matchingGoals[0];
        const newAmount = Math.min(goal.current_amount + amount, goal.target_amount); // Don't exceed target

        const { error: updateError } = await supabase
          .from("savings_goals")
          .update({ current_amount: newAmount })
          .eq("id", goal.id);

        if (updateError) {
          console.error("Error updating savings goal:", updateError);
        } else {
          console.log(`Updated savings goal "${goalName}" with amount ${amount}`);
          // Refresh savings goals display
          fetchSavingsGoals();
        }
      } else {
        console.log(`No matching savings goal found for "${goalName}"`);
      }
    } catch (error) {
      console.error("Error in updateSavingsGoal:", error);
    }
  };

  // Replace the existing getTransactionLabel function
  const getTransactionLabel = async (transactionText: string): Promise<string> => {
    try {
      const response = await fetch('http://localhost:5678/webhook/8ae0fd7a-b5a4-4c1b-a593-1248049cfa29', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_text: transactionText
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Webhook response:', data); // For debugging

      // Check if it's a category response: {"output": "Groceries"}
      if (data && data.output && typeof data.output === 'string') {
        return data.output;
      }
      
      // Check if it's a savings goal response: {"Goal": "iPad", "Amount": 1001}
      if (data && data.Goal && data.Amount && typeof data.Goal === 'string' && typeof data.Amount === 'number') {
        // Update the matching savings goal
        await updateSavingsGoal(data.Goal, data.Amount);
        
        // Return a default category since this was a savings goal transaction
        return 'Savings & Investments';
      }

      console.warn('Unexpected webhook response format:', data);
      return 'Miscellaneous'; // Fallback
      
    } catch (error) {
      console.error('Error getting transaction label:', error);
      return 'Miscellaneous'; // Fallback category
    }
  };

  // Add new email input field
  const addEmailField = () => {
    setMemberEmails([...memberEmails, ""]);
    setEmailValidationErrors([...emailValidationErrors, ""]);
    setMemberUpiIds([...memberUpiIds, ""]);
  };

  // Remove email input field
  const removeEmailField = (index: number) => {
    if (memberEmails.length > 1) {
      const newEmails = memberEmails.filter((_, i) => i !== index);
      const newErrors = emailValidationErrors.filter((_, i) => i !== index);
      const newUpiIds = memberUpiIds.filter((_, i) => i !== index);
      setMemberEmails(newEmails);
      setEmailValidationErrors(newErrors);
      setMemberUpiIds(newUpiIds);
    }
  };

  // Update email value
  const updateEmail = (index: number, value: string) => {
    const newEmails = [...memberEmails];
    newEmails[index] = value;
    setMemberEmails(newEmails);
    
    // Clear error for this field when user starts typing
    const newErrors = [...emailValidationErrors];
    newErrors[index] = "";
    setEmailValidationErrors(newErrors);
  };

  // Add UPI ID field
  const addUpiIdField = () => {
    setMemberUpiIds([...memberUpiIds, ""]);
  };

  // Remove UPI ID field
  const removeUpiIdField = (index: number) => {
    if (memberUpiIds.length > 1) {
      const newUpiIds = memberUpiIds.filter((_, i) => i !== index);
      setMemberUpiIds(newUpiIds);
    }
  };

  // Update UPI ID value
  const updateUpiId = (index: number, value: string) => {
    const newUpiIds = [...memberUpiIds];
    newUpiIds[index] = value;
    setMemberUpiIds(newUpiIds);
  };

  const fetchCategorySpending = async (userId: string) => {
    try {
      // First, let's see what data exists
      const { data: allTransactionDetails, error: allError } = await supabase
        .from('transaction_details')
        .select(`
          amount,
          label,
          borrower_id,
          transaction_id,
          transactions!inner(group_id)
        `);

      console.log('All transaction details:', allTransactionDetails);

      // Then filter for user's transactions
      const { data, error } = await supabase
        .from('transaction_details')
        .select(`
          amount,
          label,
          borrower_id
        `)
        .eq('borrower_id', userId);

      console.log('User transaction details:', data);
      console.log('User ID:', userId);

      if (error) {
        console.error('Error fetching category spending:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log('No transaction details found for user');
        return [];
      }

      // Group by label and sum amounts
      const categoryTotals = data.reduce((acc: any, item: any) => {
        const label = item.label || 'Miscellaneous';
        if (!acc[label]) {
          acc[label] = 0;
        }
        acc[label] += parseFloat(item.amount);
        return acc;
      }, {});

      console.log('Category totals:', categoryTotals);

      // Convert to array and sort by amount (descending)
      const categoryArray = Object.entries(categoryTotals)
        .map(([name, amount]) => ({ name, amount: amount as number }))
        .sort((a, b) => b.amount - a.amount);

      return categoryArray;
    } catch (error) {
      console.error('Error in fetchCategorySpending:', error);
      return [];
    }
  };

  const [categoryData, setCategoryData] = useState<{name: string, amount: number}[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const loadCategoryData = async () => {
      setLoadingCategories(true);
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      if (user) {
        const categories = await fetchCategorySpending(user.id);
        console.log('Final categories:', categories);
        setCategoryData(categories);
      }
      setLoadingCategories(false);
    };

    loadCategoryData();
  }, []);

  const getCategoryColor = (categoryName: string) => {
    const colorMap: { [key: string]: string } = {
      'Food & Dining': '#00B4D8',
      'Transportation': '#52B788',
      'Entertainment': '#E63946',
      'Groceries': '#F77F00',
      'Rent & Housing': '#6A4C93',
      'Utilities': '#4361EE',
      'Health': '#F72585',
      'Shopping': '#FF6B6B',
      'Travel': '#4ECDC4',
      'Education': '#45B7D1',
      'Stationery': '#96CEB4',
      'Savings & Investments': '#FFEAA7',
      'Gifts & Donations': '#DDA0DD',
      'Household & Maintenance': '#98D8C8',
      'Miscellaneous': '#ADB5BD'
    };
    return colorMap[categoryName] || '#ADB5BD';
  };

  // Validate emails and check if users exist
  const validateEmails = async (emails: string[]): Promise<{ validEmails: string[], errors: string[] }> => {
    const validEmails: string[] = [];
    const errors: string[] = [];
    
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i].trim();
      
      if (!email) {
        errors[i] = "";
        continue;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors[i] = "Invalid email format";
        continue;
      }
      
      // Check if user exists in database
      const { data, error } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", email)
        .single();
      
      if (error || !data) {
        errors[i] = "User not registered with the company";
        continue;
      }
      
      validEmails.push(email);
      errors[i] = "";
    }
    
    return { validEmails, errors };
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingGroup(true);

    const user = (await supabase.auth.getUser()).data.user;
    if (!user) {
      alert("You must be logged in to create a group");
      setIsCreatingGroup(false);
      return;
    }

    // Filter out empty emails
    const filteredEmails = memberEmails.filter(email => email.trim() !== "");
    
    // Validate emails
    const { validEmails, errors } = await validateEmails(filteredEmails);
    setEmailValidationErrors(errors);
    
    // Check if there are any validation errors
    const hasErrors = errors.some(error => error !== "");
    if (hasErrors) {
      setIsCreatingGroup(false);
      return;
    }

    try {
      // Insert new group
      const { data: groupData, error: groupError } = await supabase
        .from("groups")
        .insert([
          {
            name: newGroupName,
            description: newGroupDescription,
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (groupError) {
        console.error("Error creating group:", groupError.message);
        alert(groupError.message);
        setIsCreatingGroup(false);
        return;
      }

      // Update creator's UPI ID if provided
      if (creatorUpiId && creatorUpiId.trim()) {
        const { error: creatorUpiUpdateError } = await supabase
          .from("users")
          .update({ upi_id: creatorUpiId.trim() })
          .eq("id", user.id);
        
        if (creatorUpiUpdateError) {
          console.error("Error updating creator's UPI ID:", creatorUpiUpdateError.message);
          // Continue with group creation even if UPI update fails
        }
      }

      // Get user IDs for valid emails
      const { data: validUsers, error: userError } = await supabase
        .from("users")
        .select("id, email")
        .in("email", validEmails);

      // Update UPI IDs for valid users
      if (validUsers && validUsers.length > 0) {
        for (let i = 0; i < validEmails.length; i++) {
          const email = validEmails[i];
          const upiId = memberUpiIds[memberEmails.findIndex(e => e.trim() === email)];
          
          if (upiId && upiId.trim()) {
            const user = validUsers.find(u => u.email === email);
            if (user) {
              const { error: upiUpdateError } = await supabase
                .from("users")
                .update({ upi_id: upiId.trim() })
                .eq("id", user.id);
              
              if (upiUpdateError) {
                console.error(`Error updating UPI ID for user ${email}:`, upiUpdateError.message);
              }
            }
          }
        }
      }
      if (userError) {
        console.error("Error fetching users:", userError.message);
        alert("Error adding members to group");
        setIsCreatingGroup(false);
        return;
      }

      // Prepare group member insertions
      const memberInsertions = [];
      
      // Add current user as a member
      memberInsertions.push({
        group_id: groupData.id,
        user_id: user.id,
      });
      
      // Add other members
      if (validUsers) {
        validUsers.forEach(validUser => {
          // Don't add the current user twice
          if (validUser.id !== user.id) {
            memberInsertions.push({
              group_id: groupData.id,
              user_id: validUser.id,
            });
          }
        });
      }

      // Insert all members at once
      const { error: memberError } = await supabase
        .from("group_members")
        .insert(memberInsertions);

      if (memberError) {
        console.error("Error adding members to group:", memberError.message);
        alert("Group created but error adding some members");
      }

      // Update UI state
      setGroups((prev) => [
        ...prev,
        {
          id: groupData.id,
          name: groupData.name,
          members: memberInsertions.length,
          totalExpenses: 0,
          yourShare: 0,
          unreadMessages: 0,
          color: [
            "from-teal-400 to-cyan-400",
            "from-emerald-400 to-teal-400",
            "from-cyan-400 to-blue-400",
          ][prev.length % 3],
        },
      ]);

      // Reset and close modal
      setNewGroupName("");
      setNewGroupDescription("");
      setMemberEmails([""]);
      setEmailValidationErrors([]);
      setShowNewGroupModal(false);
      
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred");
    }
    
    setIsCreatingGroup(false);
  };

  const resetModal = () => {
    setNewGroupName("");
    setNewGroupDescription("");
    setMemberEmails([""]);
    setEmailValidationErrors([]);
    setMemberUpiIds([""]);
    setCreatorUpiId("");
    setShowNewGroupModal(false);
  };

  // Calculate totals for hero metrics
  const totalExpenses = totalUserExpenses; // Use the calculated total from all user transactions
  const totalOwed = userBalance;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-[#0D1B2A] relative"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Header */}
      <motion.header
        className="bg-[#1B263B] border-b border-[#2D3A4D] sticky top-0 z-40 backdrop-blur-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Left: Logo + Greeting */}
          <div className="flex items-center gap-4">
            <img
              src="/logo2.png"
              alt="Logo"
              className="w-10 h-10 rounded-xl object-contain shadow-lg"
            />
            <div>
              <h1 className="text-xl font-semibold text-[#E0E1DD]">SpendWise</h1>
              <p className="text-sm text-[#778DA9]">Let's track your expenses</p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <button className="p-2.5 bg-[#1B263B] border border-[#2D3A4D] rounded-xl hover:bg-[#2D3A4D] hover:border-[#00B4D8]/30 transition-all duration-200">
              <Search className="w-5 h-5 text-[#778DA9]" />
            </button>
            <button 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2 px-3 py-2.5 bg-[#1B263B] border border-[#2D3A4D] hover:bg-[#E63946]/10 hover:border-[#E63946]/30 rounded-xl text-[#778DA9] hover:text-[#E63946] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              {isLoggingOut ? (
                <span className="text-sm">Logging out...</span>
              ) : (
                <span className="text-sm">Logout</span>
              )}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Metrics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Total Expenses */}
          <div className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6 hover:shadow-lg hover:shadow-[#00B4D8]/5 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#52B788] to-[#52B788]/80 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex items-center gap-1 text-[#52B788] text-sm font-medium bg-[#52B788]/10 px-2 py-1 rounded-lg">
                <ArrowUpRight className="w-3 h-3" />
                
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-[#E0E1DD] mb-1">₹{totalExpenses.toFixed(2)}</h3>
            <p className="text-[#778DA9] text-sm">Turnover</p>
            {/* Mini sparkline */}
            <div className="mt-3 h-8 flex items-end gap-1">
              {[40, 65, 45, 80, 60, 90, 75].map((height, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-[#52B788]/30 to-[#52B788]/60 rounded-sm flex-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          {/* Active Groups */}
          <div className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6 hover:shadow-lg hover:shadow-[#00B4D8]/5 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#00B4D8] to-[#48CAE4] rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="text-[#00B4D8] text-sm font-medium bg-[#00B4D8]/10 px-2 py-1 rounded-lg">
                {groups.length}
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-[#E0E1DD] mb-1">Active Groups</h3>
            <p className="text-[#778DA9] text-sm">Join or create more</p>
            {/* Mini progress bar */}
            <div className="mt-3 h-2 bg-[#2D3A4D] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((groups.length / 10) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* You Owe */}
          <div className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6 hover:shadow-lg hover:shadow-[#00B4D8]/5 transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#E63946] to-[#E63946]/80 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg ${
                userBalance < 0 
                  ? 'text-[#E63946] bg-[#E63946]/10' 
                  : 'text-[#52B788] bg-[#52B788]/10'
              }`}>
                {userBalance < 0 ? (
                  <ArrowDownRight className="w-3 h-3" />
                ) : (
                  <ArrowUpRight className="w-3 h-3" />
                )}
                {userBalance < 0 ? 'You Owe' : 'You\'re Owed'}
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-[#E0E1DD] mb-1">
              ₹{Math.abs(userBalance).toFixed(2)}
            </h3>
            <p className="text-[#778DA9] text-sm">
              {userBalance < 0 ? 'You owe' : 'You are owed'}
            </p>
            {/* Mini chart */}
            <div className="mt-3 h-8 flex items-end gap-1">
              {[80, 60, 75, 45, 65, 40, 55].map((height, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-[#E63946]/30 to-[#E63946]/60 rounded-sm flex-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tabbed Main Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-[#1B263B] border border-[#2D3A4D] rounded-xl sm:rounded-2xl overflow-hidden"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-[#2D3A4D] overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedTab("groups")}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedTab === "groups"
                  ? "text-[#00B4D8] bg-[#00B4D8]/5 border-b-2 border-[#00B4D8]"
                  : "text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#2D3A4D]/30"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Groups</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab("expenses")}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedTab === "expenses"
                  ? "text-[#00B4D8] bg-[#00B4D8]/5 border-b-2 border-[#00B4D8]"
                  : "text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#2D3A4D]/30"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Recent Expenses</span>
                <span className="sm:hidden truncate">Expenses</span>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedTab("personal")}
              className={`flex-1 min-w-0 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                selectedTab === "personal"
                  ? "text-[#00B4D8] bg-[#00B4D8]/5 border-b-2 border-[#00B4D8]"
                  : "text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#2D3A4D]/30"
              }`}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 justify-center">
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline">Personal Expenses</span>
                <span className="sm:hidden truncate">Personal</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-4 md:p-6">
            <AnimatePresence mode="wait">
              {selectedTab === "groups" && (
                <motion.div
                  key="groups"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-8 h-8 border-2 border-[#2D3A4D] border-t-[#00B4D8] rounded-full animate-spin"></div>
                      <p className="text-[#778DA9] ml-3 text-sm sm:text-base">Loading groups...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:gap-6">
                      {/* New Group Card */}
                      <motion.div
                        onClick={() => setShowNewGroupModal(true)}
                        className="bg-[#0D1B2A] border-2 border-dashed border-[#2D3A4D] rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:border-[#00B4D8]/50 hover:bg-[#00B4D8]/5 transition-all duration-300 cursor-pointer group"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-center">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2D3A4D] group-hover:bg-gradient-to-br group-hover:from-[#00B4D8] group-hover:to-[#48CAE4] rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-all duration-300">
                            <Plus className="w-5 h-5 sm:w-6 sm:h-6 text-[#778DA9] group-hover:text-white transition-colors duration-300" />
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold text-[#E0E1DD] mb-1 sm:mb-2 group-hover:text-[#00B4D8] transition-colors">
                            New Group
                          </h3>
                          <p className="text-[#778DA9] text-xs sm:text-sm">Create a new expense group</p>
                        </div>
                      </motion.div>

                      {/* Group Cards */}
                      {groups.map((group, index) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl sm:rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:shadow-[#00B4D8]/10 hover:border-[#00B4D8]/30 transition-all duration-300 cursor-pointer group"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="flex items-start justify-between mb-3 sm:mb-4">
                            <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br ${group.color} rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg`}>
                              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                            {group.unreadMessages > 0 && (
                              <div className="bg-[#00B4D8] text-white text-xs font-bold px-2 py-1 rounded-full min-w-[20px] text-center">
                                {group.unreadMessages > 99 ? '99+' : group.unreadMessages}
                              </div>
                            )}
                          </div>

                          <h3 className="text-base sm:text-lg font-semibold text-[#E0E1DD] mb-1 sm:mb-2 group-hover:text-[#00B4D8] transition-colors line-clamp-1">
                            {group.name}
                          </h3>
                          <p className="text-[#778DA9] text-xs sm:text-sm mb-3 sm:mb-4">
                            {group.members} members
                          </p>

                          <div className="space-y-2 mb-3 sm:mb-4">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-[#778DA9]">Total expenses:</span>
                              <span className="text-[#E0E1DD] font-semibold">
                                ₹{group.totalExpenses.toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-[#778DA9]">Your share:</span>
                              <span className="text-[#E0E1DD] font-semibold">
                                ₹{group.yourShare.toFixed(0)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2 sm:gap-3">
                            {/* Open Chat Button */}
                            <button
                              onClick={() => navigate(`/group/${group.id}/chat`)}
                              className="flex-1 py-2.5 sm:py-4 glass-light hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 
                                        border border-white/20 hover:border-indigo-500/40 rounded-2xl sm:rounded-3xl text-gray-300 
                                        hover:text-white font-medium sm:font-semibold transition-smooth flex items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm"
                            >
                              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                              <span className="hidden xs:inline">Open Chat</span>
                              <span className="xs:hidden">Chat</span>
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-2.5 sm:p-4 glass-light border border-red-500/30 text-red-400 
                                        hover:bg-red-500/10 hover:text-red-300 rounded-2xl sm:rounded-3xl transition-smooth"
                              title="Delete Group"
                            >
                              <X className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {selectedTab === "expenses" && (
                <motion.div
                  key="expenses"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-[#E0E1DD]">Recent Expenses</h2>
                    <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1">
                      <button className="flex items-center gap-1.5 sm:gap-2 text-[#778DA9] hover:text-[#E0E1DD] transition-colors px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-[#2D3A4D]/30 text-xs sm:text-sm whitespace-nowrap">
                        <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        Filter
                      </button>
                      <button className="flex items-center gap-1.5 sm:gap-2 text-[#778DA9] hover:text-[#E0E1DD] transition-colors px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl hover:bg-[#2D3A4D]/30 text-xs sm:text-sm whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        This Month
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    {recentExpenses.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#2D3A4D] rounded-lg sm:rounded-xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                          <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-[#778DA9]" />
                        </div>
                        <p className="text-[#778DA9] text-sm sm:text-base">No recent expenses</p>
                        <p className="text-[#778DA9] text-xs sm:text-sm mt-1">Start adding expenses to see them here!</p>
                      </div>
                    ) : (
                      recentExpenses.map((expense, index) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-3 sm:p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-lg sm:rounded-xl hover:bg-[#1B263B]/50 hover:border-[#00B4D8]/30 transition-all duration-300 group"
                        >
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <div className="relative flex-shrink-0">
                              {expense.avatar ? (
                                <img
                                  src={expense.avatar}
                                  alt="Avatar"
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover"
                                />
                              ) : (
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 ${expense.type === 'payment' ? 'bg-gradient-to-br from-[#52B788] to-[#52B788]/80' : 'bg-gradient-to-br from-[#00B4D8] to-[#48CAE4]'} rounded-lg sm:rounded-xl flex items-center justify-center`}>
                                  {expense.type === 'payment' ? (
                                    <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                  ) : (
                                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                  )}
                                </div>
                              )}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 ${expense.type === 'payment' ? 'bg-[#52B788]' : 'bg-[#E63946]'} rounded-full border-2 border-[#0D1B2A] flex items-center justify-center`}>
                                {expense.type === 'payment' ? (
                                  <ArrowUpRight className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                ) : (
                                  <ArrowDownRight className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[#E0E1DD] font-medium sm:font-semibold group-hover:text-[#00B4D8] transition-colors text-sm sm:text-base line-clamp-1">
                                {expense.description}
                              </h4>
                              <p className="text-[#778DA9] text-xs sm:text-sm line-clamp-1">
                                {expense.group} • {new Date(expense.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                            <div className="text-right">
                              <span className={`text-sm sm:text-lg font-bold ${expense.type === 'payment' ? 'text-[#52B788]' : 'text-[#E0E1DD]'}`}>
                                {expense.type === 'payment' ? '+' : '-'}₹{expense.amount.toFixed(0)}
                              </span>
                            </div>
                            <button className="p-1.5 sm:p-2 opacity-0 group-hover:opacity-100 hover:bg-[#2D3A4D] rounded-lg transition-all duration-200">
                              <MoreHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#778DA9]" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

              {selectedTab === "personal" && (
                <motion.div
                  key="personal"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-4 sm:space-y-6">
                    {/* Quick Add Expense Chat */}
                    <div className="bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <h3 className="text-base sm:text-lg font-semibold text-[#E0E1DD] mb-3 sm:mb-4 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Quick Add Expense
                      </h3>
                      <div className="flex flex-col gap-3">
                        <input
                          type="text"
                          placeholder="Type naturally: 'Paid 250 for coffee' or 'Groceries 1200'"
                          value={personalExpenseInput}
                          onChange={(e) => setPersonalExpenseInput(e.target.value)}
                          className="w-full p-3 sm:p-4 bg-[#1B263B] border border-[#2D3A4D] rounded-lg sm:rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent transition-all duration-300 text-sm sm:text-base"
                          onKeyPress={(e) => e.key === 'Enter' && handleAddPersonalExpense()}
                        />
                        <div className="flex flex-col xs:flex-row gap-2 sm:gap-3">
                          
                          <button 
                            onClick={handleAddPersonalExpense}
                            disabled={isProcessingExpense}
                            className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:shadow-[#00B4D8]/25 transition-all flex items-center justify-center gap-2 text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus className="w-4 h-4" />
                            {isProcessingExpense ? 'Processing...' : 'Add Expense'}
                          </button>
                        </div>
                      </div>
                      <p className="text-[#778DA9] text-xs sm:text-sm mt-2">
                        Examples: "Lunch 450", "Uber 180", "Movie tickets 600"
                      </p>
                    </div>

                    {/* Budget Tracking */}
                    <div className="bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <div className="flex flex-col xs:flex-row xs:items-center justify-between mb-4 sm:mb-6 gap-3 xs:gap-0">
                        <h3 className="text-base sm:text-lg font-semibold text-[#E0E1DD] flex items-center gap-2">
                          <PieChart className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="hidden sm:inline">Weekly Budget Tracker</span>
                          <span className="sm:hidden">Budget Tracker</span>
                        </h3>
                        <button 
                          onClick={() => setShowBudgetModal(true)}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1B263B] border border-[#2D3A4D] hover:border-[#00B4D8]/30 rounded-lg sm:rounded-xl text-[#778DA9] hover:text-[#E0E1DD] transition-all text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Set Budget
                        </button>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        {budgets.length === 0 ? (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-[#778DA9] text-sm sm:text-base">No budgets set yet</p>
                            <button 
                              onClick={() => setShowBudgetModal(true)}
                              className="mt-2 px-4 py-2 bg-[#00B4D8] text-white rounded-lg sm:rounded-xl hover:bg-[#00B4D8]/80 transition-all text-sm"
                            >
                              Create Your First Budget
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {budgets.map((budget) => {
                              const spent = budgetSpending[budget.category] || 0;
                              const remaining = budget.amount - spent;
                              const percentage = Math.min((spent / budget.amount) * 100, 100);
                              
                              return (
                                <div key={budget.id} className="bg-[#1B263B] border border-[#2D3A4D] rounded-lg sm:rounded-xl p-3 sm:p-4">
                                  <div className="flex items-center justify-between mb-2 sm:mb-3">
                                    <h4 className="text-[#E0E1DD] font-medium text-sm sm:text-base line-clamp-1">{budget.category}</h4>
                                    <span className="text-[#778DA9] text-xs sm:text-sm whitespace-nowrap ml-2">₹{spent.toFixed(0)} / ₹{budget.amount}</span>
                                  </div>
                                  <div className="w-full bg-[#2D3A4D] rounded-full h-2 mb-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        percentage >= 100 ? 'bg-gradient-to-r from-[#E63946] to-[#F77F00]' :
                                        percentage >= 80 ? 'bg-gradient-to-r from-[#F77F00] to-[#FCBF49]' :
                                        'bg-gradient-to-r from-[#00B4D8] to-[#48CAE4]'
                                      }`}
                                      style={{width: `${Math.min(percentage, 100)}%`}}
                                    />
                                  </div>
                                  <p className={`text-xs sm:text-sm ${
                                    remaining < 0 ? 'text-[#E63946]' : 'text-[#52B788]'
                                  }`}>
                                    {remaining < 0 ? `₹${Math.abs(remaining).toFixed(0)} over budget!` : `₹${remaining.toFixed(0)} remaining`}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Savings Goals */}
                    <div className="bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <div className="flex flex-col xs:flex-row xs:items-center justify-between mb-4 sm:mb-6 gap-3 xs:gap-0">
                        <h3 className="text-base sm:text-lg font-semibold text-[#E0E1DD] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                          Savings Goals
                        </h3>
                        <button 
                          onClick={() => setShowGoalModal(true)}
                          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[#1B263B] border border-[#2D3A4D] hover:border-[#00B4D8]/30 rounded-lg sm:rounded-xl text-[#778DA9] hover:text-[#E0E1DD] transition-all text-sm"
                        >
                          <Plus className="w-4 h-4" />
                          Add Goal
                        </button>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        {savingsGoals.length === 0 ? (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-[#778DA9] text-sm sm:text-base">No savings goals yet</p>
                            <button 
                              onClick={() => setShowGoalModal(true)}
                              className="mt-2 px-4 py-2 bg-[#00B4D8] text-white rounded-lg sm:rounded-xl hover:bg-[#00B4D8]/80 transition-all text-sm"
                            >
                              Create Your First Goal
                            </button>
                          </div>
                        ) : (
                          savingsGoals.map((goal) => {
                            const percentage = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                            const remaining = goal.target_amount - goal.current_amount;
                            
                            return (
                              <div key={goal.id} className="bg-[#1B263B] border border-[#2D3A4D] rounded-lg sm:rounded-xl p-4 sm:p-5 hover:border-[#00B4D8]/30 transition-all">
                                <div className="flex items-start sm:items-center justify-between mb-3 sm:mb-4 gap-3">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#00B4D8] to-[#48CAE4] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-[#E0E1DD] font-medium sm:font-semibold text-sm sm:text-base line-clamp-1">{goal.title}</h4>
                                      <p className="text-[#778DA9] text-xs sm:text-sm">
                                        Target: {goal.target_date ? new Date(goal.target_date).toLocaleDateString() : 'No date set'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right flex-shrink-0">
                                    <p className="text-[#E0E1DD] font-medium sm:font-semibold text-sm sm:text-base">₹{goal.current_amount} / ₹{goal.target_amount}</p>
                                    <p className="text-[#778DA9] text-xs sm:text-sm">{percentage.toFixed(0)}% complete</p>
                                  </div>
                                </div>
                                <div className="w-full bg-[#2D3A4D] rounded-full h-2.5 sm:h-3 mb-2 sm:mb-3">
                                  <div 
                                    className="bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] h-2.5 sm:h-3 rounded-full transition-all duration-300" 
                                    style={{width: `${percentage}%`}}
                                  />
                                </div>
                                <div className="flex justify-between text-xs sm:text-sm">
                                  <span className="text-[#52B788]">₹{remaining.toFixed(0)} remaining</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Optional Right Sidebar - Insights */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Spending Trends */}
          <div className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#00B4D8] to-[#48CAE4] rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#E0E1DD]">Trends</h3>
            </div>
            <p className="text-[#778DA9] text-sm mb-3">Your spending is 12% higher this month</p>
            <div className="h-16 flex items-end gap-1">
              {[30, 45, 35, 60, 40, 70, 55, 80, 65, 90, 75, 85].map((height, i) => (
                <div
                  key={i}
                  className="bg-gradient-to-t from-[#00B4D8]/30 to-[#00B4D8]/60 rounded-sm flex-1"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          {/* Top Categories */}
          <div 
            className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6 cursor-pointer hover:bg-[#1B263B]/80 transition-all"
            onClick={() => setShowCategoriesModal(true)}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#52B788] to-[#52B788]/80 rounded-lg flex items-center justify-center">
                <PieChart className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#E0E1DD]">Categories</h3>
            </div>
            <div className="space-y-3">
              {loadingCategories ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-5 h-5 border-2 border-[#52B788] border-t-transparent rounded-full"></div>
                  <span className="ml-2 text-[#778DA9] text-sm">Loading categories...</span>
                </div>
              ) : categoryData.length === 0 ? (
                <p className="text-[#778DA9] text-sm text-center py-4">No spending data available</p>
              ) : (
                categoryData.slice(0, 3).map((category, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: getCategoryColor(category.name) }} 
                      />
                      <span className="text-[#778DA9] text-sm">{category.name}</span>
                    </div>
                    <span className="text-[#E0E1DD] font-semibold text-sm">₹{category.amount.toFixed(0)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Add */}
          <div className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-[#E63946] to-[#E63946]/80 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#E0E1DD]">Quick Add</h3>
            </div>
            <div className="space-y-2">
              <button className="w-full py-2 px-3 bg-[#0D1B2A] border border-[#2D3A4D] hover:border-[#00B4D8]/30 rounded-lg text-[#778DA9] hover:text-[#E0E1DD] text-sm transition-all duration-200 text-left">
                + Suggested Payments
              </button>
              <button className="w-full py-2 px-3 bg-[#0D1B2A] border border-[#2D3A4D] hover:border-[#00B4D8]/30 rounded-lg text-[#778DA9] hover:text-[#E0E1DD] text-sm transition-all duration-200 text-left">
                + Split Bill
              </button>
              <button className="w-full py-2 px-3 bg-[#0D1B2A] border border-[#2D3A4D] hover:border-[#00B4D8]/30 rounded-lg text-[#778DA9] hover:text-[#E0E1DD] text-sm transition-all duration-200 text-left">
                + Record Payment
              </button>
            </div>
          </div>

          {/* Categories Modal */}
          <AnimatePresence>
            {showCategoriesModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowCategoriesModal(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-[#52B788] to-[#52B788]/80 rounded-2xl flex items-center justify-center">
                        <PieChart className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-2xl font-bold text-white">All Categories</h2>
                    </div>
                    <button
                      onClick={() => setShowCategoriesModal(false)}
                      className="p-2 hover:bg-slate-800/50 rounded-xl transition-all"
                    >
                      <span className="text-slate-400 text-xl">×</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {categoryData.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">No spending data available</p>
                    ) : (
                      categoryData.map((category, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 hover:bg-slate-800/50 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: getCategoryColor(category.name) }} 
                            />
                            <span className="text-slate-300 font-medium">{category.name}</span>
                          </div>
                          <span className="text-white font-bold text-lg">₹{category.amount.toFixed(0)}</span>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => setShowCategoriesModal(false)}
                    className="w-full mt-6 py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all"
                  >
                    Close
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={resetModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00B4D8] to-[#48CAE4] rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[#E0E1DD]">Create New Group</h2>
              </div>

              <form className="space-y-5" onSubmit={handleCreateGroup}>
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent transition-all duration-300"
                  required
                />
                
                <textarea
                  placeholder="Description (optional)"
                  rows={3}
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent transition-all duration-300 resize-none"
                />

                <input
                  type="text"
                  placeholder="Your UPI ID (optional)"
                  value={creatorUpiId}
                  onChange={(e) => setCreatorUpiId(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent transition-all duration-300"
                />

                {/* Member Emails Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[#E0E1DD] font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Add Members
                    </label>
                    <button
                      type="button"
                      onClick={addEmailField}
                      className="flex items-center gap-1 px-3 py-2 bg-[#0D1B2A] hover:bg-[#2D3A4D] border border-[#2D3A4D] rounded-xl text-[#778DA9] hover:text-[#E0E1DD] text-sm transition-all"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  
                  {memberEmails.map((email, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="email"
                          placeholder="Enter email address"
                          value={email}
                          onChange={(e) => updateEmail(index, e.target.value)}
                          className={`flex-1 p-3 bg-[#0D1B2A] border rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 transition-all duration-300 ${
                            emailValidationErrors[index] 
                              ? 'border-[#E63946] focus:ring-[#E63946]' 
                              : 'border-[#2D3A4D] focus:ring-[#00B4D8]'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="UPI ID (optional)"
                          value={memberUpiIds[index] || ""}
                          onChange={(e) => updateUpiId(index, e.target.value)}
                          className="flex-1 p-3 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] transition-all duration-300"
                        />
                        {memberEmails.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEmailField(index)}
                            className="p-3 bg-[#E63946]/10 hover:bg-[#E63946]/20 border border-[#E63946]/30 rounded-xl text-[#E63946] transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {emailValidationErrors[index] && (
                        <p className="text-[#E63946] text-sm px-2">
                          {emailValidationErrors[index]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="flex-1 py-4 bg-[#0D1B2A] border border-[#2D3A4D] text-[#778DA9] rounded-xl hover:bg-[#2D3A4D] hover:text-[#E0E1DD] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingGroup}
                    className="flex-1 py-4 bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] text-white rounded-xl hover:shadow-lg hover:shadow-[#00B4D8]/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingGroup ? "Creating..." : "Create Group"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Modal */}
      <AnimatePresence>
        {showBudgetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowBudgetModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00B4D8] to-[#48CAE4] rounded-xl flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[#E0E1DD]">Set Budget</h2>
              </div>

              <form className="space-y-5" onSubmit={handleCreateBudget}>
                <select
                  value={newBudgetCategory}
                  onChange={(e) => setNewBudgetCategory(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                  required
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Health">Health</option>
                  <option value="Education">Education</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
                
                <input
                  type="number"
                  placeholder="Budget Amount"
                  value={newBudgetAmount}
                  onChange={(e) => setNewBudgetAmount(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                  required
                />

                <select
                  value={newBudgetPeriod}
                  onChange={(e) => setNewBudgetPeriod(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowBudgetModal(false)}
                    className="flex-1 py-4 bg-[#0D1B2A] border border-[#2D3A4D] text-[#778DA9] rounded-xl hover:bg-[#2D3A4D] hover:text-[#E0E1DD] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-r from-[#00B4D8] to-[#48CAE4] text-white rounded-xl hover:shadow-lg hover:shadow-[#00B4D8]/25 transition-all"
                  >
                    Create Budget
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl p-8 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#52B788] to-[#40916C] rounded-xl flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-[#E0E1DD]">Add Savings Goal</h2>
              </div>

              <form className="space-y-5" onSubmit={handleCreateGoal}>
                <input
                  type="text"
                  placeholder="Goal Title"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                  required
                />
                
                <input
                  type="number"
                  placeholder="Target Amount"
                  value={newGoalTargetAmount}
                  onChange={(e) => setNewGoalTargetAmount(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] placeholder-[#778DA9] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                  required
                />

                <input
                  type="date"
                  placeholder="Target Date (optional)"
                  value={newGoalTargetDate}
                  onChange={(e) => setNewGoalTargetDate(e.target.value)}
                  className="w-full p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl text-[#E0E1DD] focus:outline-none focus:ring-2 focus:ring-[#00B4D8] focus:border-transparent"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 py-4 bg-[#0D1B2A] border border-[#2D3A4D] text-[#778DA9] rounded-xl hover:bg-[#2D3A4D] hover:text-[#E0E1DD] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-r from-[#52B788] to-[#40916C] text-white rounded-xl hover:shadow-lg hover:shadow-[#52B788]/25 transition-all"
                  >
                    Create Goal
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;