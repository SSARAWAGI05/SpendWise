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
          className="bg-[#1B263B] border border-[#2D3A4D] rounded-2xl overflow-hidden"
        >
          {/* Tab Navigation */}
          <div className="flex border-b border-[#2D3A4D]">
            <button
              onClick={() => setSelectedTab("groups")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
                selectedTab === "groups"
                  ? "text-[#00B4D8] bg-[#00B4D8]/5 border-b-2 border-[#00B4D8]"
                  : "text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#2D3A4D]/30"
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <Users className="w-4 h-4" />
                Groups
              </div>
            </button>
            <button
              onClick={() => setSelectedTab("expenses")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all duration-200 ${
                selectedTab === "expenses"
                  ? "text-[#00B4D8] bg-[#00B4D8]/5 border-b-2 border-[#00B4D8]"
                  : "text-[#778DA9] hover:text-[#E0E1DD] hover:bg-[#2D3A4D]/30"
              }`}
            >
              <div className="flex items-center gap-2 justify-center">
                <CreditCard className="w-4 h-4" />
                Recent Expenses
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
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
                      <p className="text-[#778DA9] ml-3">Loading groups...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* New Group Card */}
                      <motion.div
                        onClick={() => setShowNewGroupModal(true)}
                        className="bg-[#0D1B2A] border-2 border-dashed border-[#2D3A4D] rounded-2xl p-6 hover:border-[#00B4D8]/50 hover:bg-[#00B4D8]/5 transition-all duration-300 cursor-pointer group"
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="text-center">
                          <div className="w-12 h-12 bg-[#2D3A4D] group-hover:bg-gradient-to-br group-hover:from-[#00B4D8] group-hover:to-[#48CAE4] rounded-xl flex items-center justify-center mx-auto mb-4 transition-all duration-300">
                            <Plus className="w-6 h-6 text-[#778DA9] group-hover:text-white transition-colors duration-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-[#E0E1DD] mb-2 group-hover:text-[#00B4D8] transition-colors">
                            New Group
                          </h3>
                          <p className="text-[#778DA9] text-sm">Create a new expense group</p>
                        </div>
                      </motion.div>

                      {/* Group Cards */}
                      {groups.map((group, index) => (
                        <motion.div
                          key={group.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.1 + index * 0.05 }}
                          className="bg-[#0D1B2A] border border-[#2D3A4D] rounded-2xl p-6 hover:shadow-lg hover:shadow-[#00B4D8]/10 hover:border-[#00B4D8]/30 transition-all duration-300 cursor-pointer group"
                          whileHover={{ scale: 1.02, y: -2 }}
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${group.color} rounded-xl flex items-center justify-center shadow-lg`}>
                              <Users className="w-6 h-6 text-white" />
                            </div>
                            {group.unreadMessages > 0 && (
                              <div className="bg-[#00B4D8] text-white text-xs font-bold px-2 py-1 rounded-full">
                                {group.unreadMessages}
                              </div>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-[#E0E1DD] mb-2 group-hover:text-[#00B4D8] transition-colors">
                            {group.name}
                          </h3>
                          <p className="text-[#778DA9] text-sm mb-4">
                            {group.members} members
                          </p>

                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#778DA9]">Total expenses:</span>
                              <span className="text-[#E0E1DD] font-semibold">
                                ₹{group.totalExpenses.toFixed(2)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-[#778DA9]">Your share:</span>
                              <span className="text-[#E0E1DD] font-semibold">
                                ₹{group.yourShare.toFixed(2)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-3">
                            {/* Open Chat Button */}
                            <button
                              onClick={() => navigate(`/group/${group.id}/chat`)}
                              className="flex-1 py-4 glass-light hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20 
                                        border border-white/20 hover:border-indigo-500/40 rounded-3xl text-gray-300 
                                        hover:text-white font-semibold transition-smooth flex items-center justify-center gap-3"
                            >
                              <MessageCircle className="w-5 h-5" />
                              Open Chat
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteGroup(group.id)}
                              className="p-4 glass-light border border-red-500/30 text-red-400 
                                        hover:bg-red-500/10 hover:text-red-300 rounded-3xl transition-smooth"
                              title="Delete Group"
                            >
                              <X className="w-5 h-5" />
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
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-[#E0E1DD]">Recent Expenses</h2>
                    <div className="flex items-center gap-3">
                      <button className="flex items-center gap-2 text-[#778DA9] hover:text-[#E0E1DD] transition-colors px-3 py-2 rounded-xl hover:bg-[#2D3A4D]/30">
                        <Filter className="w-4 h-4" />
                        Filter
                      </button>
                      <button className="flex items-center gap-2 text-[#778DA9] hover:text-[#E0E1DD] transition-colors px-3 py-2 rounded-xl hover:bg-[#2D3A4D]/30">
                        <Calendar className="w-4 h-4" />
                        This Month
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {recentExpenses.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-[#2D3A4D] rounded-xl flex items-center justify-center mx-auto mb-4">
                          <CreditCard className="w-6 h-6 text-[#778DA9]" />
                        </div>
                        <p className="text-[#778DA9]">No recent expenses</p>
                        <p className="text-[#778DA9] text-sm mt-1">Start adding expenses to see them here!</p>
                      </div>
                    ) : (
                      recentExpenses.map((expense, index) => (
                        <motion.div
                          key={expense.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-center justify-between p-4 bg-[#0D1B2A] border border-[#2D3A4D] rounded-xl hover:bg-[#1B263B]/50 hover:border-[#00B4D8]/30 transition-all duration-300 group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative">
                              {expense.avatar ? (
                                <img
                                  src={expense.avatar}
                                  alt="Avatar"
                                  className="w-12 h-12 rounded-xl object-cover"
                                />
                              ) : (
                                <div className={`w-12 h-12 ${expense.type === 'payment' ? 'bg-gradient-to-br from-[#52B788] to-[#52B788]/80' : 'bg-gradient-to-br from-[#00B4D8] to-[#48CAE4]'} rounded-xl flex items-center justify-center`}>
                                  {expense.type === 'payment' ? (
                                    <ArrowUpRight className="w-5 h-5 text-white" />
                                  ) : (
                                    <CreditCard className="w-5 h-5 text-white" />
                                  )}
                                </div>
                              )}
                              <div className={`absolute -bottom-1 -right-1 w-5 h-5 ${expense.type === 'payment' ? 'bg-[#52B788]' : 'bg-[#E63946]'} rounded-full border-2 border-[#0D1B2A] flex items-center justify-center`}>
                                {expense.type === 'payment' ? (
                                  <ArrowUpRight className="w-3 h-3 text-white" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 text-white" />
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-[#E0E1DD] font-semibold group-hover:text-[#00B4D8] transition-colors">
                                {expense.description}
                              </h4>
                              <p className="text-[#778DA9] text-sm">
                                {expense.group} • {new Date(expense.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className={`text-lg font-bold ${expense.type === 'payment' ? 'text-[#52B788]' : 'text-[#E0E1DD]'}`}>
                                {expense.type === 'payment' ? '+' : '-'}₹{expense.amount.toFixed(2)}
                              </span>
                            </div>
                            <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-[#2D3A4D] rounded-lg transition-all duration-200">
                              <MoreHorizontal className="w-4 h-4 text-[#778DA9]" />
                            </button>
                          </div>
                        </motion.div>
                      ))
                    )}
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
    </motion.div>
  );
};

export default Dashboard;