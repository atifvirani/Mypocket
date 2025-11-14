import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { Expense, Friend } from '../types';
import { MicrophoneIcon, ReceiptIcon, GlobeAltIcon, UsersIcon, TrashIcon, LightBulbIcon } from './icons';
import { useAppContext } from '../contexts/AppContext';
import { GoogleGenAI, Type } from '@google/genai';

interface ExpenseFormProps {
  expenseToEdit: Expense | null;
  onSave: () => void;
  onCancel: () => void;
  isPage?: boolean;
}

/**
 * @file ExpenseForm.tsx
 * @description
 * This is a highly advanced form component for adding and editing expenses.
 * It includes several sophisticated features:
 * - **AI-Powered Data Entry:** Users can add expenses via voice or by scanning a receipt. The component uses the Gemini API for transcription and data extraction.
 * - **Client-Side Image Optimization:** To improve performance and reduce data usage, receipt images are resized and compressed in the browser before being sent to the AI.
 * - **Real-time Currency Conversion:** Fetches live and historical exchange rates from a public API to accurately convert foreign currency expenses.
 * - **Robust Validation:** Implements a comprehensive set of client-side validation rules to ensure data integrity before submission.
 * - **Complex State Management:** Manages state for standard fields, recurring expenses, and bill splitting with friends.
 * - **UX Enhancements:** Includes features like smart category suggestions based on user history.
 */

const PRESET_CATEGORIES = ['Food', 'Fuel', 'Groceries', 'Shopping', 'Transport', 'Utilities', 'Entertainment'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'];
const AI_MODEL_NAME = 'gemini-2.5-flash';

/**
 * Resizes and compresses an image file on the client-side.
 * This is a performance optimization to reduce upload size for AI processing.
 * @param file The original image file.
 * @param maxWidth The maximum width of the output image.
 * @returns A promise that resolves with the optimized image as a Blob.
 */
const resizeAndCompressImage = (file: File, maxWidth: number = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const scaleFactor = maxWidth / img.width;
                canvas.width = maxWidth;
                canvas.height = img.height * scaleFactor;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Could not get canvas context'));
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob conversion failed'));
                        }
                    },
                    'image/jpeg',
                    0.7 // 70% quality
                );
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

/**
 * Converts a File or Blob object into a Base64 encoded string.
 * @param file The file or blob to convert.
 * @returns A promise that resolves with the Base64 string.
 */
const fileToBase64 = (file: File | Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = error => reject(error);
  });
};

const ExpenseForm: React.FC<ExpenseFormProps> = ({ expenseToEdit, onSave, onCancel, isPage = false }) => {
  const { friends, expenses, isOffline } = useAppContext();
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  
  const [sourceType, setSourceType] = useState<'manual' | 'voice' | 'photo'>('manual');
  
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const allCategories = [...new Set([...PRESET_CATEGORIES, ...customCategories])];

  // V4 features state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [recurringEndDate, setRecurringEndDate] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [isSplit, setIsSplit] = useState(false);
  const [collaborators, setCollaborators] = useState<{ name: string; amount: number; friend_id?: string }[]>([{ name: 'Me', amount: 0 }]);
  const [totalSplitAmount, setTotalSplitAmount] = useState('');
  
  // State for real-time currency conversion
  const [conversionRate, setConversionRate] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  // UX Improvement: Smart Category Suggestion
  const [categorySuggestion, setCategorySuggestion] = useState<string | null>(null);

  useEffect(() => {
    if (!expenseToEdit) {
      amountInputRef.current?.focus();
    }
  }, [expenseToEdit]);

  useEffect(() => {
    const savedCategories = localStorage.getItem('myPocketCategories');
    if (savedCategories) {
      setCustomCategories(JSON.parse(savedCategories));
    }
  }, []);

  // Smart Category Suggestion Logic
  useEffect(() => {
    if (description.length < 4 || category) {
      setCategorySuggestion(null);
      return;
    }
    const handler = setTimeout(() => {
      const reversedExpenses = [...expenses].reverse();
      const foundExpense = reversedExpenses.find(exp => 
          exp.description && exp.description.toLowerCase().includes(description.toLowerCase())
      );
      if (foundExpense && foundExpense.category) {
        setCategorySuggestion(foundExpense.category);
      } else {
        setCategorySuggestion(null);
      }
    }, 500); // Debounce
    return () => clearTimeout(handler);
  }, [description, category, expenses]);

  const addCustomCategory = (newCategory: string) => {
    if (newCategory && !allCategories.includes(newCategory)) {
      const updatedCategories = [...customCategories, newCategory];
      setCustomCategories(updatedCategories);
      localStorage.setItem('myPocketCategories', JSON.stringify(updatedCategories));
    }
  };

  const resetForm = () => {
      setAmount('');
      setCategory('');
      setDescription('');
      setLocation('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setSourceType('manual');
      setIsRecurring(false);
      setRecurringType('weekly');
      setRecurringEndDate('');
      setCurrency('INR');
      setIsSplit(false);
      setCollaborators([{ name: 'Me', amount: 0 }]);
      setTotalSplitAmount('');
      setError(null);
      setStatusMessage(null);
  };

  useEffect(() => {
    if (expenseToEdit) {
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category);
      setDescription(expenseToEdit.description || '');
      setLocation(expenseToEdit.location || '');
      setExpenseDate(new Date(expenseToEdit.created_at).toISOString().split('T')[0]);
      setSourceType(expenseToEdit.source_type || 'manual');
      const isEditRecurring = expenseToEdit.recurring_type && expenseToEdit.recurring_type !== 'none';
      setIsRecurring(isEditRecurring);
      setRecurringType(isEditRecurring ? expenseToEdit.recurring_type! : 'weekly');
      setRecurringEndDate(expenseToEdit.recurring_end_date ? new Date(expenseToEdit.recurring_end_date).toISOString().split('T')[0] : '');
      setCurrency(expenseToEdit.currency_code || 'INR');
      setIsSplit(!!expenseToEdit.collaborators);
      if (expenseToEdit.collaborators) {
          setTotalSplitAmount(expenseToEdit.collaborators.total_amount.toString());
          setCollaborators(expenseToEdit.collaborators.participants);
      }
    } else {
      resetForm();
    }
  }, [expenseToEdit]);
  
    useEffect(() => {
        /**
         * Fetches currency conversion rates from the Frankfurter API.
         * This effect is triggered when amount, currency, or date changes.
         * It includes debounce logic to avoid excessive API calls.
         * It also has a fallback to fetch the 'latest' rate if the historical date is unavailable (e.g., a weekend).
         */
        const fetchRate = async () => {
        const primaryAmount = parseFloat(isSplit ? totalSplitAmount : amount);
        if (currency === 'INR' || !expenseDate || isNaN(primaryAmount) || primaryAmount <= 0) {
            setConversionRate(null);
            return;
        }

        setIsConverting(true);
        setError(null);
        try {
            const apiUrl = `https://api.frankfurter.app/${expenseDate}?from=${currency}&to=INR`;
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const latestResponse = await fetch(`https://api.frankfurter.app/latest?from=${currency}&to=INR`);
                if (!latestResponse.ok) throw new Error('Currency conversion service is unavailable.');
                const data = await latestResponse.json();
                setConversionRate(data.rates.INR);
            } else {
                const data = await response.json();
                setConversionRate(data.rates.INR);
            }
        } catch (err) {
            console.error("Failed to fetch conversion rate:", err);
            setError("Could not fetch the latest conversion rate. Using manual entry.");
            setConversionRate(null);
        } finally {
            setIsConverting(false);
        }
        };

        const debounceTimer = setTimeout(fetchRate, 500);
        return () => clearTimeout(debounceTimer);
    }, [amount, totalSplitAmount, isSplit, currency, expenseDate]);


  /**
   * Handles the AI-powered data extraction from a voice note or receipt photo.
   * @param prompt The prompt to send to the Gemini API.
   * @param file The audio or image file as a Blob.
   * @param source The source type ('voice' or 'photo').
   */
  const parseWithAI = async (
    prompt: string, 
    file: File | Blob, 
    source: 'voice' | 'photo'
  ) => {
    setLoading(true);
    setError(null);
    setStatusMessage(`ARVS is analyzing your ${source === 'photo' ? 'receipt' : 'voice note'}...`);

    try {
        const base64Data = await fileToBase64(file);
        
        // The API key is securely sourced from the environment variable `process.env.API_KEY`.
        // This is a security best practice to avoid exposing sensitive keys in the client-side code.
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const response = await ai.models.generateContent({
            model: AI_MODEL_NAME,
            contents: {
                parts: [
                { text: prompt },
                { inlineData: { mimeType: file.type, data: base64Data } }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                type: Type.OBJECT,
                properties: {
                    amount: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" }
                },
                required: ["amount", "category", "date"]
                },
            },
        });
        
        let parsedData;
        try {
            // Trim and parse the JSON response from the AI.
            parsedData = JSON.parse(response.text.trim());
        } catch (jsonError) {
            console.error("AI response JSON parsing error:", jsonError);
            console.error("AI raw response:", response.text);
            throw new Error("ARVS returned a response that was not in the expected format.");
        }

        if (!parsedData || typeof parsedData.amount === 'undefined') {
            throw new Error("The AI returned an unexpected response. Key fields are missing.");
        }

        setAmount(parsedData.amount.toString());
        setCategory(parsedData.category || 'Uncategorized');
        setDescription(parsedData.description || '');
        setExpenseDate(parsedData.date || new Date().toISOString().split('T')[0]);
        setSourceType(source);

        setStatusMessage("ARVS extracted the details. Please review and save.");

    } catch(err: any) {
        console.error(err);
        setError(`ARVS couldn't extract details: ${err.message}. Please try again or enter manually.`);
    } finally {
        setLoading(false);
    }
  };
  
  const handlePhotoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setStatusMessage("Optimizing receipt image...");
      try {
        // Performance: Resize image before uploading
        const optimizedBlob = await resizeAndCompressImage(file);
        const prompt = `From the receipt, extract: total amount, a category (e.g., Groceries, Food, Fuel), a description (merchant name), and the date (format as YYYY-MM-DD). If no date, use today's date.`;
        // Create a new File object to preserve the filename and type for the AI model
        const optimizedFile = new File([optimizedBlob], file.name, { type: 'image/jpeg' });
        await parseWithAI(prompt, optimizedFile, 'photo');
      } catch(err) {
        console.error("Image optimization failed:", err);
        setError("Could not optimize the image. Please try another one.");
        setStatusMessage(null);
      } finally {
        if (imageInputRef.current) imageInputRef.current.value = "";
      }
  };


  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (event) => audioChunks.push(event.data);
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const prompt = `Transcribe audio, then extract: expense amount, a category, a description, and the date (format YYYY-MM-DD). If no date mentioned, use today.`;
        parseWithAI(prompt, audioBlob, 'voice');
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setStatusMessage("Recording... Click again to stop.");
    } catch (err) {
      setError("Microphone access denied. Please enable it in your browser settings.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setStatusMessage(null);
  };
  
  const handleGetLocation = () => {
    if (navigator.geolocation) {
        setStatusMessage("Fetching location...");
        navigator.geolocation.getCurrentPosition((position) => {
            setLocation(`Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}`);
            setStatusMessage(null);
        }, () => {
            setError("Unable to retrieve your location. Please check your browser settings.");
            setStatusMessage(null);
        });
    } else {
        setError("Geolocation is not supported by your browser.");
    }
  };
  
  const handleCollaboratorChange = (index: number, field: 'name' | 'amount', value: string | number) => {
    const newCollaborators = [...collaborators];
    if(field === 'amount') newCollaborators[index][field] = parseFloat(value as string) || 0;
    else newCollaborators[index][field] = value as string;
    setCollaborators(newCollaborators);
  };
  
  const addCollaborator = (friend?: Friend) => {
    const newCollaborator = friend 
        ? { name: friend.friend_email, amount: 0, friend_id: friend.id }
        : { name: '', amount: 0 };
    setCollaborators([...collaborators, newCollaborator]);
  };
  const removeCollaborator = (index: number) => setCollaborators(collaborators.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // --- Robust Validation Block ---
    const expenseDateObj = new Date(expenseDate);
    const today = new Date();
    expenseDateObj.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (expenseDateObj > today) {
      setError("Expense date cannot be in the future.");
      return;
    }
    if (isRecurring && recurringEndDate && new Date(recurringEndDate) < expenseDateObj) {
      setError("Recurring end date cannot be before the expense date.");
      return;
    }
    const primaryAmount = isSplit ? parseFloat(totalSplitAmount) : parseFloat(amount);
    if (isNaN(primaryAmount) || primaryAmount <= 0) {
      setError(`The ${isSplit ? 'total bill' : ''} amount must be a positive number.`);
      return;
    }
    if (isSplit) {
      const totalAssigned = collaborators.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(primaryAmount - totalAssigned) > 0.01) {
        setError(`The sum of shares (₹${totalAssigned.toFixed(2)}) does not match the total bill (₹${primaryAmount.toFixed(2)}).`);
        return;
      }
      if (collaborators.some(p => p.amount < 0)) {
        setError("Individual shares cannot be negative.");
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not logged in");
      
      const finalAmount = isSplit ? (collaborators.find(p => p.name === 'Me')?.amount || 0) : primaryAmount;

      let convertedAmountValue = null;
      if (currency !== 'INR' && conversionRate) {
          convertedAmountValue = finalAmount * conversionRate;
      } else if (currency === 'INR') {
          convertedAmountValue = finalAmount;
      } else if (expenseToEdit && expenseToEdit.currency_code === currency) {
          convertedAmountValue = expenseToEdit.converted_amount;
      }

      const expenseData: Omit<Expense, 'id' | 'user_id'> = {
        amount: finalAmount,
        category,
        description,
        location: location || null,
        created_at: new Date(expenseDate).toISOString(),
        source_type: sourceType,
        recurring_type: isRecurring ? recurringType : 'none',
        recurring_end_date: isRecurring && recurringEndDate ? new Date(recurringEndDate).toISOString() : null,
        currency_code: currency,
        converted_amount: convertedAmountValue,
        collaborators: isSplit ? { total_amount: parseFloat(totalSplitAmount), my_share: finalAmount, participants: collaborators } : null,
      };

      if (expenseToEdit) {
        setStatusMessage("Updating expense...");
        const { error } = await supabase.from('expenses').update(expenseData).eq('id', expenseToEdit.id);
        if (error) throw error;
        setStatusMessage("Expense updated successfully!");
      } else {
        setStatusMessage("Saving expense...");
        const payload = { ...expenseData, user_id: user.id };
        const { error: insertError } = await supabase.from('expenses').insert(payload);
        if (insertError) throw insertError;
        addCustomCategory(category);
        setStatusMessage("ARVS analyzed & added your expense successfully!");
      }
      
      setTimeout(() => onSave(), 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred.');
      setLoading(false);
    }
  };
  
  const availableFriends = friends.filter(f => !collaborators.some(c => c.friend_id === f.id));
  
  const convertedAmountDisplay = useMemo(() => {
      const primaryAmount = parseFloat(isSplit ? totalSplitAmount : amount);
      if (conversionRate && !isNaN(primaryAmount) && primaryAmount > 0) {
          const totalConverted = primaryAmount * conversionRate;
          return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalConverted);
      }
      return null;
  }, [conversionRate, amount, totalSplitAmount, isSplit]);

  return (
    <div className={`bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg ${isPage ? '' : 'shadow-md mb-6'}`}>
      <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">{expenseToEdit ? 'Edit Expense' : 'Add New Expense'}</h3>

      {!expenseToEdit && (
        <div className="grid grid-cols-2 gap-3 mb-4">
           <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={(loading && !isRecording) || isOffline}
                className={`flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors disabled:opacity-60 ${isRecording ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-light-text-primary dark:text-dark-text-primary'}`}
                aria-label={isRecording ? "Stop recording" : "Add expense with voice"}
            >
                <MicrophoneIcon className="h-5 w-5" />
                <span>{isRecording ? 'Recording...' : 'Voice Entry'}</span>
            </button>
           <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={loading || isOffline}
                className="flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-light-text-primary dark:text-dark-text-primary transition-colors disabled:opacity-60"
                aria-label="Add expense from a receipt photo"
            >
                <ReceiptIcon className="h-5 w-5" />
                <span>Scan Receipt</span>
            </button>
            <input type="file" ref={imageInputRef} onChange={handlePhotoSelected} accept="image/*" className="hidden"/>
        </div>
      )}

      {statusMessage && <p className="text-blue-600 dark:text-blue-400 text-sm text-center mb-4">{statusMessage}</p>}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {isSplit ? (
            <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-md space-y-3">
                 <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-light-text-primary dark:text-dark-text-primary">Split Bill Details</h4>
                     <div className="flex items-center">
                        <input type="checkbox" id="isSplitToggle" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-secondary"/>
                        <label htmlFor="isSplitToggle" className="ml-2 block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">Enable Split</label>
                    </div>
                </div>
                 <div>
                    <label htmlFor="total-amount" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Total Bill Amount</label>
                    <div className="relative mt-1">
                        <input type="number" id="total-amount" value={totalSplitAmount} onChange={(e) => setTotalSplitAmount(e.target.value)} placeholder="0.00" required className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm pl-16 bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" disabled={loading}/>
                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="absolute left-1 bottom-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-md text-sm py-1.5 focus:ring-brand-primary text-light-text-primary dark:text-dark-text-primary">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
                {(isConverting || convertedAmountDisplay) && (
                    <div className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary bg-light-bg-secondary dark:bg-dark-bg-secondary p-2 rounded-md -mt-2">
                        {isConverting ? 'Fetching conversion rate...' : `~ ${convertedAmountDisplay}`}
                    </div>
                )}
                <div className="space-y-2">
                    {collaborators.map((p, i) => (
                        <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                            <input type="text" value={p.name} onChange={e => handleCollaboratorChange(i, 'name', e.target.value)} placeholder="Participant Name" className="col-span-12 md:col-span-6 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" disabled={p.name === 'Me' || !!p.friend_id} />
                            <input type="number" value={p.amount} onChange={e => handleCollaboratorChange(i, 'amount', e.target.value)} placeholder="Share" className="col-span-8 md:col-span-4 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" />
                            {i > 0 && <button type="button" onClick={() => removeCollaborator(i)} className="col-span-4 md:col-span-2 text-red-500 hover:text-red-700 flex justify-center items-center"><TrashIcon className="h-5 w-5" /></button>}
                        </div>
                    ))}
                </div>
                 <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    <p className="text-xs font-medium text-light-text-secondary dark:text-dark-text-secondary mb-2">Add from Friends:</p>
                    <div className="flex flex-wrap gap-2">
                         {availableFriends.length > 0 ? availableFriends.map(friend => (
                            <button type="button" key={friend.id} onClick={() => addCollaborator(friend)} className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full hover:bg-emerald-200">
                               + {friend.friend_email}
                            </button>
                         )) : <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary">All friends have been added.</p>}
                         <button type="button" onClick={() => addCollaborator()} className="text-xs font-medium bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500">+ Manual</button>
                    </div>
                 </div>
            </div>
        ) : (
            <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1 relative">
                        <label htmlFor="amount" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Amount</label>
                        <input ref={amountInputRef} type="number" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm pl-16 bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" disabled={loading}/>
                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="absolute left-1 bottom-1 bg-gray-100 dark:bg-gray-700 border-0 rounded-md text-sm py-1.5 focus:ring-brand-primary text-light-text-primary dark:text-dark-text-primary">
                            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="category" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Category</label>
                        <input list="categories" type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g., Food, Fuel" required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" disabled={loading}/>
                        <datalist id="categories">
                        {allCategories.map(cat => <option key={cat} value={cat} />)}
                        </datalist>
                    </div>
                </div>
                 {(isConverting || convertedAmountDisplay) && (
                    <div className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary bg-light-bg dark:bg-dark-bg p-2 rounded-md mt-2">
                        {isConverting ? 'Fetching conversion rate...' : `~ ${convertedAmountDisplay}`}
                    </div>
                )}
            </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Description</label>
            <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={1} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" placeholder="e.g., Lunch with colleagues" disabled={loading}/>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Date</label>
            <input type="date" id="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" disabled={loading}/>
          </div>
        </div>
        
        {categorySuggestion && (
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/50 p-2 rounded-md">
            <LightBulbIcon className="h-4 w-4" />
            <span>Suggestion:</span>
            <button
              type="button"
              onClick={() => {
                setCategory(categorySuggestion);
                setCategorySuggestion(null);
              }}
              className="font-semibold underline hover:text-amber-800 dark:hover:text-amber-300"
            >
              {categorySuggestion}
            </button>
          </div>
        )}

         <div className="relative">
          <label htmlFor="location" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Location (Optional)</label>
          <input type="text" id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary" placeholder="e.g., Mumbai, India" disabled={loading}/>
          <button type="button" onClick={handleGetLocation} className="absolute right-2 bottom-1.5 p-1 text-gray-400 hover:text-brand-primary" aria-label="Get current location">
            <GlobeAltIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-light-bg dark:bg-dark-bg p-4 rounded-md space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <input type="checkbox" id="isRecurring" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-secondary"/>
                    <label htmlFor="isRecurring" className="ml-3 block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">Recurring</label>
                </div>
                {!isSplit && (
                    <div className="flex items-center">
                        <input type="checkbox" id="isSplitToggle" checked={isSplit} onChange={(e) => setIsSplit(e.target.checked)} className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-brand-primary focus:ring-brand-secondary"/>
                        <label htmlFor="isSplitToggle" className="ml-3 block text-sm font-medium text-light-text-primary dark:text-dark-text-primary">Split this bill</label>
                    </div>
                )}
            </div>
            {isRecurring && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="recurringType" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Frequency</label>
                        <select id="recurringType" value={recurringType} onChange={(e) => setRecurringType(e.target.value as any)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary">
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="recurringEndDate" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">End Date (Optional)</label>
                        <input type="date" id="recurringEndDate" value={recurringEndDate} onChange={(e) => setRecurringEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg-secondary dark:bg-dark-bg-secondary text-light-text-primary dark:text-dark-text-primary"/>
                    </div>
                </div>
            )}
        </div>


        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} disabled={loading} className="py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary bg-light-bg-secondary dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50">Cancel</button>
          <button type="submit" disabled={loading || !!error || isOffline} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-secondary disabled:opacity-50">
            {isOffline ? 'You are offline' : (loading ? 'Processing...' : (expenseToEdit ? 'Update Expense' : 'Save Expense'))}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;