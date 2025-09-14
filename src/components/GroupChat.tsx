import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Plus,
  Camera,
  Receipt,
  Users,
  MoreVertical,
  Smile,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { supabase } from "../supabaseClient";
interface Message {
  id: string;
  type: 'message' | 'expense' | 'system' | 'bot';
  content: string;
  sender: string;
  senderId?: string;
  timestamp: Date;
  amount?: number;
  category?: string;
}

const generateQRCodeURL = (text: string) => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
};

const EXPENSE_WEBHOOK_URL = "http://localhost:5678/webhook/c5e46359-f84e-4f92-a9c4-ecc1b89fdba1";

const callExpenseWebhook = async (prompt: string): Promise<any> => {
  try {
    const response = await fetch(EXPENSE_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    if (!response.ok) throw new Error('Webhook request failed');
    return await response.json();
  } catch (error) {
    console.error('Webhook error:', error);
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
};

const formatTransaction = (data: any): string => {
  if (data.error) {
    return `<b>Error:</b> ${data.error}`;
  }

  const lenders = data.Lenders || [];
  const borrowers = data.Borrowers || [];
  const label = data.label || "N/A";

  let output = "";

  // Format lenders
  lenders.forEach((lender: any, i: number) => {
    output += `<b>Lender ${i + 1}:</b><br>`;
    output += `Name: ${lender.name || 'Unknown'}<br>`;
    output += `Amount Lent: ${(lender.amountLent || 0).toFixed(2)}<br><br>`;
  });

  // Format borrowers
  borrowers.forEach((borrower: any, i: number) => {
    output += `<b>Borrower ${i + 1}:</b><br>`;
    output += `Name: ${borrower.name || 'Unknown'}<br>`;
    output += `Amount Borrowed: ${(borrower.amountBorrowed || 0).toFixed(2)}<br><br>`;
  });

  output += `<b>Transaction Label:</b> ${label}<br>`;
  return output.trim();
};

const extractExpenseDetails = (data: any): any => {
  const lenders = data.Lenders || [];
  const borrowers = data.Borrowers || [];
  const label = data.label;

  const totalAmount = lenders.reduce((sum: number, lender: any) => sum + (lender.amountLent || 0), 0);
  const payer = lenders[0]?.name || null;
  const participants = borrowers.map((b: any) => b.name).filter(Boolean);

  const customSplits: { [key: string]: number } = {};
  borrowers.forEach((b: any) => {
    if (b.name) customSplits[b.name] = b.amountBorrowed || 0;
  });

  return {
    amount: totalAmount,
    description: `Expense with ${participants.length} participants`,
    payer,
    participants,
    split_type: Object.keys(customSplits).length > 0 ? 'custom' : 'equal',
    custom_splits: Object.keys(customSplits).length > 0 ? customSplits : null,
    label
  };
};

const GroupChat: React.FC = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();
  const [message, setMessage] = useState("");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showValidationError, setShowValidationError] = useState(false);
  const [groupInfo, setGroupInfo] = useState<{
    name: string;
    members: string[];
    totalExpenses: number;
  }>({ name: "", members: [], totalExpenses: 0 });

  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiText, setUpiText] = useState("");
  const [upiLink, setUpiLink] = useState("");
  const [showUpiResult, setShowUpiResult] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);
  const [showSuggestedPayments, setShowSuggestedPayments] = useState(false);
  const [suggestedPayments, setSuggestedPayments] = useState<string>("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const WEBHOOK_URL = "http://localhost:5678/webhook/4ee80114-3101-4549-a1da-ee157dbce30e"; // Replace with your actual webhook URL
  
  const processUpiText = async (text: string) => {
    // Simple regex patterns to extract amount and name
    const amountMatch = text.match(/(?:pay|send|give)\s*(?:rs\.?\s*)?(\d+(?:\.\d{2})?)/i);
    const nameMatch = text.match(/(?:to|for)\s+([a-zA-Z\s]+)/i);
    
    if (amountMatch && nameMatch) {
      const amount = amountMatch[1];
      const receiverName = nameMatch[1].trim();
      
      try {
        // Fetch the UPI ID from the database based on name
        const { data: userData, error } = await supabase
          .from("users")
          .select("upi_id, name")
          .ilike("name", `%${receiverName}%`)
          .single();

        if (error || !userData) {
          alert(`Could not find user "${receiverName}" in the database.`);
          return;
        }

        if (!userData.upi_id) {
          alert(`${userData.name} has not set up their UPI ID yet.`);
          return;
        }

        // Generate UPI link with the fetched UPI ID
        const link = `upi://pay?pa=${userData.upi_id}&pn=Hrishikesh%20Sharma&am=${amount}&cu=INR`;
        setUpiLink(link);
        setShowUpiResult(true);
      } catch (error) {
        console.error("Error fetching UPI ID:", error);
        alert("Error fetching user details. Please try again.");
      }
    } else {
      alert("Could not extract payment details. Please use format like 'I want to pay 500 to Kashvi'");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const validateParticipants = (participants: string[], payer?: string): { isValid: boolean; invalidNames: string[] } => {
    const allNamesToCheck = [...participants];
    if (payer) allNamesToCheck.push(payer);
    
    // Remove duplicates and convert to lowercase for comparison
    const uniqueNames = [...new Set(allNamesToCheck.map(name => name.toLowerCase()))];
    const groupMemberNames = groupInfo.members.map(member => member.toLowerCase());
    
    const invalidNames = uniqueNames.filter(name => !groupMemberNames.includes(name));
    
    return {
      isValid: invalidNames.length === 0,
      invalidNames
    };
  };
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showBalancesModal, setShowBalancesModal] = useState(false);
  const [balances, setBalances] = useState<{user_id: string, user_name: string, balance: number}[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  // Fetch group details + messages
  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("name, group_members(user_id, users(name))")
        .eq("id", groupId)
        .single();

      if (groupError) {
        console.error("Error fetching group:", groupError);
        return;
      }

      setGroupInfo({
        name: group.name,
        members: group.group_members.map((gm: any) => gm.users?.name || "Unknown").filter(name => name !== "Unknown"),
        totalExpenses: 0,
      });
    };

    const fetchMessages = async () => {
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          raw_text,
          created_at,
          created_by,
          users!transactions_created_by_fkey(name),
          transaction_details (amount)
        `
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      const mapped = transactions.map((tx: any) => {
        if (tx.transaction_details.length > 0) {
          return {
            id: tx.id,
            type: "expense",
            content: tx.raw_text || "added an expense",
            sender: tx.users?.name || "Unknown",
            senderId: tx.created_by,
            timestamp: new Date(tx.created_at),
            amount: tx.transaction_details[0]?.amount,
            category: "General",
          } as Message;
        } else {
          return {
            id: tx.id,
            type: "message",
            content: tx.raw_text,
            sender: tx.users?.name || "Unknown",
            senderId: tx.created_by,
            timestamp: new Date(tx.created_at),
          } as Message;
        }
      });

      setMessages(mapped);

      const total = mapped
        .filter((m) => m.type === "expense")
        .reduce((sum, m) => sum + (m.amount || 0), 0);
      setGroupInfo((prev) => ({ ...prev, totalExpenses: total }));
    };

    fetchGroup();
    fetchMessages();

    // Subscribe for realtime new transactions
    const subscription = supabase
      .channel("group-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: `group_id=eq.${groupId}` },
        async (payload) => {
          const tx = payload.new as any;

          // Fetch sender info
          const { data: user } = await supabase
            .from("users")
            .select("name")
            .eq("id", tx.created_by)
            .single();

          const newMsg: Message = {
            id: tx.id,
            type: tx.raw_text ? "message" : "system",
            content: tx.raw_text || "New transaction",
            sender: user?.name || "Unknown",
            timestamp: new Date(tx.created_at),
          };

          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [groupId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestedPayments = async () => {
    if (!groupId) return;
    setLoadingSuggestions(true);
    try {
      // Fetch current balances for the group
      const { data: balanceData, error } = await supabase
        .from("balances")
        .select(`
          user_id,
          balance,
          users!balances_user_id_fkey(name)
        `)
        .eq("group_id", groupId);
      
      if (error) {
        console.error("Error fetching balances:", error);
        alert("Error fetching group balances");
        return;
      }
      
      // Format the data for the webhook as text
      const memberBalancesText = balanceData?.map((item: any) => {
        const name = item.users?.name || "Unknown";
        const balance = item.balance || 0;
        return `${name}: ${balance >= 0 ? '+' : ''}${balance.toFixed(2)}`;
      }).join('\n') || '';
      
      // Send to webhook
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group_id: groupId,
          group_name: groupInfo.name,
          members_balances: memberBalancesText
        })
      });
      
      if (!response.ok) {
        throw new Error('Webhook request failed');
      }
      
      // Parse JSON response instead of text
      const webhookResponse = await response.json();
      
      // Extract the output from the response array
      let suggestionsText = '';
      if (Array.isArray(webhookResponse) && webhookResponse.length > 0 && webhookResponse[0].output) {
        suggestionsText = webhookResponse[0].output;
      } else if (webhookResponse.output) {
        // Handle case where response is directly an object with output
        suggestionsText = webhookResponse.output;
      } else {
        suggestionsText = 'No payment suggestions available';
      }
      
      setSuggestedPayments(suggestionsText);
      setShowSuggestedPayments(true);
      
    } catch (error) {
      console.error("Error getting payment suggestions:", error);
      alert("Error getting payment suggestions. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !groupId) return;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    // 1. Insert user's message into Supabase (so others see it too)
    const { error, data: transactionData } = await supabase
      .from("transactions")
      .insert([
        {
          group_id: groupId,
          created_by: userId,
          raw_text: message,
        },
      ])
      .select("id");

    if (error) {
      console.error("Error sending message:", error);
      return;
    }

    // Store transaction ID for potential expense processing
    const transactionId = transactionData?.[0]?.id;

    // 2. Optimistically update local chat UI
    const newMessage: Message = {
      id: transactionId || crypto.randomUUID(),
      type: "message",
      content: message,
      sender: "Me",
      senderId: userId,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // 3. Process expense extraction directly
    try {
      const prompt = `
        Extract transaction details from: "${message}"

        Return ONLY JSON:
        {
          "label": "string",
          "Lenders": [{ "name": "string", "amountLent": number }],
          "Borrowers": [{ "name": "string", "amountBorrowed": number }]
        }
      `;
      
      const rawData = await callExpenseWebhook(prompt);
      const formattedOutput = formatTransaction(rawData);

      // 4. Show processed response in chat as a "bot" message
      const botMessage: Message = {
        id: crypto.randomUUID(),
        type: "bot",
        content: formattedOutput,
        sender: "Bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);

      // 5. Handle expense extraction and database insertion
      const isExpense = Boolean(rawData.Lenders || rawData.Borrowers);
      if (isExpense && !rawData.error && transactionId) {
        // Clear any previous validation errors
        setValidationError(null);
        setShowValidationError(false);
        
        const expenseDetails = extractExpenseDetails(rawData);
        await handleExpenseExtraction(expenseDetails, transactionId, userId);
      }
    } catch (err) {
      console.error("Error processing expense:", err);
    }

    setMessage("");
  };

  const handleAddExpense = async (amount: number, description: string) => {
    if (!groupId) return;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    const { data: tx, error } = await supabase
      .from("transactions")
      .insert([
        {
          group_id: groupId,
          created_by: userId,
          raw_text: description,
        },
      ])
      .select("id");

    if (error || !tx) {
      console.error("Error adding expense:", error);
      return;
    }

    await supabase.from("transaction_details").insert([
      {
        transaction_id: tx[0].id,
        lender_id: userId,
        borrower_id: userId,
        amount,
        label: 'Miscellaneous',
      },
    ]);

    setShowExpenseModal(false);
  };

  const handleExpenseExtraction = async (
    expenseDetails: any,
    transactionId: string,
    currentUserId: string
  ) => {
    try {
      // Validate participants before processing
      const participantsToValidate = expenseDetails.participants || [];
      const payerToValidate = expenseDetails.payer;

      const validation = validateParticipants(participantsToValidate, payerToValidate);

      if (!validation.isValid) {
        const errorMessage = `The following people are not in this group: ${validation.invalidNames.join(', ')}. Please add them to the group first or check the spelling.`;
        setValidationError(errorMessage);
        setShowValidationError(true);
        
        // Show error message in chat
        const errorMessage_chat: Message = {
          id: crypto.randomUUID(),
          type: "system",
          content: `❌ ${errorMessage}`,
          sender: "System",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage_chat]);
        
        return; // Exit early, don't process the transaction
      }
      
      // Get group members to handle participant mapping
      const { data: groupMembers, error: membersError } = await supabase
        .from("group_members")
        .select(`
          user_id,
          users!inner(id, name, email)
        `)
        .eq("group_id", groupId);

      if (membersError) {
        console.error("Error fetching group members:", membersError);
        return;
      }

      // Create a mapping of names/emails to user IDs
      const memberMap = new Map();
      groupMembers?.forEach((member: any) => {
        const user = member.users;
        memberMap.set(user.name.toLowerCase(), user.id);
        memberMap.set(user.email.toLowerCase(), user.id);
      });

      // Determine the payer (lender)
      let payerId = currentUserId; // Default to current user
      if (expenseDetails.payer) {
        const foundPayerId = memberMap.get(expenseDetails.payer.toLowerCase());
        if (foundPayerId) {
          payerId = foundPayerId;
        }
      }

      // Handle participants and amounts
      const participants = expenseDetails.participants || [];
      const totalAmount = expenseDetails.amount || 0;

      if (expenseDetails.split_type === 'equal' && participants.length > 0) {
        // Equal split among participants
        const amountPerPerson = totalAmount / participants.length;
        
        const transactionDetails = participants.map((participant: string) => {
          const borrowerId = memberMap.get(participant.toLowerCase()) || currentUserId;
          return {
            transaction_id: transactionId,
            lender_id: payerId,
            borrower_id: borrowerId,
            amount: amountPerPerson,
            label: expenseDetails.label || 'Miscellaneous',
          };
        });

        // Insert all transaction details
        const { error: detailsError } = await supabase
          .from("transaction_details")
          .insert(transactionDetails);

        if (detailsError) {
          console.error("Error inserting transaction details:", detailsError);
        }

      } else if (expenseDetails.split_type === 'custom' && expenseDetails.custom_splits) {
        // Custom split amounts
        const transactionDetails = Object.entries(expenseDetails.custom_splits).map(
          ([participant, amount]) => {
            const borrowerId = memberMap.get(participant.toLowerCase()) || currentUserId;
            return {
              transaction_id: transactionId,
              lender_id: payerId,
              borrower_id: borrowerId,
              amount: amount as number,
              label: expenseDetails.label || 'Miscellaneous',
            };
          }
        );

        // Insert all transaction details
        const { error: detailsError } = await supabase
          .from("transaction_details")
          .insert(transactionDetails);

        if (detailsError) {
          console.error("Error inserting transaction details:", detailsError);
        }

      } else {
        // Simple expense - just record the full amount
        const { error: detailsError } = await supabase
          .from("transaction_details")
          .insert([{
            transaction_id: transactionId,
            lender_id: payerId,
            borrower_id: payerId,
            amount: totalAmount,
            label: expenseDetails.label || 'Miscellaneous',
          }]);

        if (detailsError) {
          console.error("Error inserting transaction details:", detailsError);
        }
      }

      // Update the message type to 'expense' in local state
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === transactionId 
            ? { ...msg, type: 'expense', amount: totalAmount, category: 'General' }
            : msg
        )
      );

      // Update total expenses
      setGroupInfo((prev) => ({ 
        ...prev, 
        totalExpenses: prev.totalExpenses + totalAmount 
      }));

    } catch (error) {
      console.error("Error handling expense extraction:", error);
    }
  };

  const fetchGroupBalances = async () => {
    if (!groupId) return;
    
    setLoadingBalances(true);
    try {
      const { data: balanceData, error } = await supabase
        .from("balances")
        .select(`
          user_id,
          balance,
          users!balances_user_id_fkey(name)
        `)
        .eq("group_id", groupId);

      if (error) {
        console.error("Error fetching balances:", error);
        return;
      }

      const formattedBalances = balanceData?.map((item: any) => ({
        user_id: item.user_id,
        user_name: item.users?.name || "Unknown",
        balance: item.balance || 0
      })) || [];

      setBalances(formattedBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoadingBalances(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-emerald-500/8 to-cyan-500/8 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-violet-500/8 to-purple-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

      {/* Header */}
      <motion.header
        className="bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/50 px-6 py-4 flex items-center justify-between relative z-10"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-4">
          <motion.button
            onClick={() => navigate("/dashboard")}
            className="p-2 hover:bg-slate-800/50 rounded-2xl transition-all border border-slate-700/50 hover:border-slate-600/50"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-6 h-6 text-slate-400" />
          </motion.button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>{groupInfo.name}</h1>
              <p className="text-sm text-slate-400">{groupInfo.members.length} members</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total</p>
            <p className="text-white font-semibold">
              ${groupInfo.totalExpenses.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => {
                setShowBalancesModal(true);
                fetchGroupBalances();
              }}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 hover:border-slate-600/50 rounded-xl transition-all text-sm text-slate-300 hover:text-white"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <DollarSign className="w-4 h-4" />
              Balances
            </motion.button>
            
            <button className="p-2 hover:bg-slate-800/50 rounded-2xl transition-all border border-slate-700/50 hover:border-slate-600/50">
              <MoreVertical className="w-6 h-6 text-slate-400" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 relative z-10">
          <AnimatePresence>
            {messages.map((msg) => {
              const isMe = msg.senderId === currentUserId;

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex mb-3 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {msg.type === "system" ? (
                    <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl px-4 py-2 text-center mx-auto border border-slate-700/30">
                      <p className="text-slate-400 text-sm">{msg.content}</p>
                    </div>
                  ) : msg.type === "bot" ? (
                    <div className="max-w-xs px-4 py-3 rounded-2xl border border-slate-700/50 bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-white backdrop-blur-md">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full flex items-center justify-center">
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <p className="font-semibold text-sm">{msg.sender}</p>
                      </div>
                      <p
                        className="break-words text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: msg.content }}
                      ></p>
                      <p className="text-xs opacity-60 mt-2">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={`max-w-xs px-4 py-3 rounded-2xl border backdrop-blur-md ${
                        isMe
                          ? "bg-gradient-to-r from-emerald-500/80 to-cyan-500/80 text-white border-emerald-500/30"
                          : "bg-slate-800/50 text-white border-slate-700/50"
                      }`}
                    >
                      {!isMe && <p className="font-semibold text-sm mb-1 text-slate-300">{msg.sender}</p>}
                      {msg.type === "expense" ? (
                        <>
                          <p className="text-sm">{msg.content}</p>
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/20">
                            <DollarSign className="w-4 h-4" />
                            <p className="text-sm font-semibold">
                              ${msg.amount?.toFixed(2)} • {msg.category}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                      <p className="text-xs opacity-60 mt-2">
                        {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <motion.div
        className="bg-slate-900/80 backdrop-blur-2xl border-t border-slate-800/50 p-6 relative z-10"
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          {/* Always visible action buttons */}
          <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
            <motion.button
              onClick={handleSuggestedPayments}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl text-white text-sm font-medium whitespace-nowrap shadow-lg shadow-emerald-500/25 border border-white/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loadingSuggestions ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Getting Suggestions...
                </>
              ) : (
                <>
                  <DollarSign className="w-4 h-4" />
                  Suggested Payments
                </>
              )}
            </motion.button>

            <motion.button
              onClick={() => setShowUpiModal(true)}
              className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl text-white text-sm font-medium whitespace-nowrap shadow-lg shadow-blue-500/25 border border-white/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <DollarSign className="w-4 h-4" />
              Pay via UPI
            </motion.button>

            <motion.button
              className="flex items-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-700/50 text-sm font-medium whitespace-nowrap transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Receipt className="w-4 h-4" />
              Receipt
            </motion.button>
          </div>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full px-4 py-3 bg-slate-800/50 backdrop-blur-md border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-12 transition-all duration-300"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-1">
                <button
                  type="button"
                  className="p-1.5 hover:bg-slate-700/50 rounded-xl transition-all"
                >
                  <Smile className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={!message.trim()}
              className={`p-3 rounded-2xl transition-all border ${
                message.trim()
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:shadow-lg hover:shadow-emerald-500/25 border-white/10"
                  : "bg-slate-800/50 border-slate-700/50"
              }`}
              whileHover={message.trim() ? { scale: 1.05 } : {}}
              whileTap={message.trim() ? { scale: 0.95 } : {}}
            >
              <Send className="w-5 h-5 text-white" />
            </motion.button>
          </form>
        </form>
      </motion.div>

      {/* Validation Error Modal */}
      <AnimatePresence>
        {showValidationError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowValidationError(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-red-500/30 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-lg">⚠️</span>
                </div>
                <h2 className="text-2xl font-bold text-white">Validation Error</h2>
              </div>
              
              <p className="text-slate-300 mb-6">{validationError}</p>
              
              <button
                onClick={() => setShowValidationError(false)}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl hover:shadow-xl hover:shadow-red-500/25 transition-all border border-white/10"
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showExpenseModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowExpenseModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>Add Expense</h2>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const amount = parseFloat(formData.get("amount") as string);
                  const description = formData.get("description") as string;
                  handleAddExpense(amount, description);
                }}
                className="space-y-5"
              >
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  placeholder="Amount ($)"
                  required
                  className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                />
                <input
                  type="text"
                  name="description"
                  placeholder="Description"
                  required
                  className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-300"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowExpenseModal(false)}
                    className="flex-1 py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all border border-white/10"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPI Payment Modal */}
      <AnimatePresence>
        {showUpiModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowUpiModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Pay via UPI
                </h2>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setUpiLoading(true);
                  await processUpiText(upiText);
                  setUpiLoading(false);
                }}
                className="space-y-5"
              >
                <textarea
                  value={upiText}
                  onChange={(e) => setUpiText(e.target.value)}
                  placeholder="e.g., I want to pay 500 to Kashvi"
                  required
                  rows={3}
                  className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 resize-none"
                />

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpiModal(false);
                      setUpiText("");
                    }}
                    className="flex-1 py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={upiLoading}
                    className="flex-1 py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-2xl hover:shadow-xl hover:shadow-blue-500/25 transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {upiLoading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Looking up UPI ID...
                      </div>
                    ) : (
                      "Generate UPI Link"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UPI Result Modal */}
      <AnimatePresence>
        {showUpiResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => {
              setShowUpiResult(false);
              setShowUpiModal(false);
              setUpiText("");
              setUpiLink("");
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-emerald-500/30 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-lg">✓</span>
                </div>
                <h2 className="text-2xl font-bold text-white">UPI Link Generated</h2>
              </div>
              
              <div className="bg-slate-800/50 rounded-2xl p-6 mb-6 border border-slate-700/50">
                <div className="flex flex-col items-center space-y-4">
                  {/* QR Code */}
                  <div className="bg-white p-4 rounded-2xl shadow-lg">
                    <img 
                      src={generateQRCodeURL(upiLink)}
                      alt="UPI Payment QR Code"
                      className="w-48 h-48"
                      onError={(e) => {
                        console.error('QR Code failed to load');
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                  
                  {/* Instructions */}
                  <div className="text-center">
                    <p className="text-emerald-400 text-sm font-medium mb-1">
                      Scan with any UPI app
                    </p>
                    <p className="text-slate-500 text-xs">
                      Or use the link below
                    </p>
                  </div>
                  
                  {/* Link text - smaller and collapsible */}
                  <div className="w-full">
                    <details className="group">
                      <summary className="text-slate-400 text-sm mb-2 cursor-pointer hover:text-slate-300 transition-colors">
                        Show UPI link ▼
                      </summary>
                      <p className="text-white text-xs break-all font-mono bg-slate-700/50 p-3 rounded-xl mt-2">
                        {upiLink}
                      </p>
                    </details>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(upiLink)}
                  className="flex-1 py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => window.open(upiLink)}
                  className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all border border-white/10"
                >
                  Open UPI App
                </button>
              </div>
              
              <button
                onClick={() => {
                  setShowUpiResult(false);
                  setShowUpiModal(false);
                  setUpiText("");
                  setUpiLink("");
                }}
                className="w-full mt-3 py-3 text-slate-400 hover:text-white transition-all text-sm"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Suggested Payments Modal */}
      <AnimatePresence>
        {showSuggestedPayments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowSuggestedPayments(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Suggested Payments
                  </h2>
                </div>
                <button
                  onClick={() => setShowSuggestedPayments(false)}
                  className="p-2 hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <span className="text-slate-400 text-xl">×</span>
                </button>
              </div>

              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <pre className="text-white text-sm whitespace-pre-wrap font-mono leading-relaxed">
                  {suggestedPayments}
                </pre>
              </div>

              <button
                onClick={() => setShowSuggestedPayments(false)}
                className="w-full mt-6 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-2xl hover:shadow-xl hover:shadow-emerald-500/25 transition-all border border-white/10"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Balances Modal */}
      <AnimatePresence>
        {showBalancesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowBalancesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900/95 backdrop-blur-2xl rounded-3xl p-8 border border-slate-700/50 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                    Group Balances
                  </h2>
                </div>
                <button
                  onClick={() => setShowBalancesModal(false)}
                  className="p-2 hover:bg-slate-800/50 rounded-xl transition-all"
                >
                  <span className="text-slate-400 text-xl">×</span>
                </button>
              </div>

              {loadingBalances ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full"></div>
                  <span className="ml-3 text-slate-400">Loading balances...</span>
                </div>
              ) : balances.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-400">No balance data found for this group.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {balances.map((balance) => (
                    <motion.div
                      key={balance.user_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 rounded-2xl border backdrop-blur-md flex items-center justify-between ${
                        balance.balance > 0
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : balance.balance < 0
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-slate-800/50 border-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          balance.balance > 0
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                            : balance.balance < 0
                            ? "bg-gradient-to-r from-red-500 to-red-600"
                            : "bg-gradient-to-r from-slate-600 to-slate-700"
                        }`}>
                          {balance.user_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-white">{balance.user_name}</p>
                          <p className={`text-sm ${
                            balance.balance > 0
                              ? "text-emerald-400"
                              : balance.balance < 0
                              ? "text-red-400"
                              : "text-slate-500"
                          }`}>
                            {balance.balance > 0
                              ? "Gets back"
                              : balance.balance < 0
                              ? "Owes"
                              : "Settled up"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${
                          balance.balance > 0
                            ? "text-emerald-400"
                            : balance.balance < 0
                            ? "text-red-400"
                            : "text-slate-400"
                        }`}>
                          ${Math.abs(balance.balance).toFixed(2)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowBalancesModal(false)}
                className="w-full mt-6 py-4 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-2xl hover:bg-slate-700/50 hover:text-white transition-all"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default GroupChat;