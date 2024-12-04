import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/components/ui/use-toast";
import { MessageList } from "@/components/simulation/MessageList";
import { MessageInput } from "@/components/simulation/MessageInput";
import { SimulationControls } from "@/components/simulation/SimulationControls";
import { analyzeMessage } from "@/utils/messageFilter";
import { Message } from "@/types/message";
import { supabase } from "@/integrations/supabase/client";

// Create a subscribers array to handle history updates
const historySubscribers: (() => void)[] = [];

export const subscribeToHistory = (callback: () => void) => {
  console.log('Subscribing to history updates');
  historySubscribers.push(callback);
  return () => {
    const index = historySubscribers.indexOf(callback);
    if (index > -1) {
      historySubscribers.splice(index, 1);
    }
  };
};

const notifyHistorySubscribers = () => {
  console.log('Notifying history subscribers');
  historySubscribers.forEach(callback => callback());
};

export const getMessageHistory = async () => {
  try {
    console.log('Fetching message history...');
    const { data, error } = await supabase
      .from('message_history')
      .select('id, text, sender, is_hidden, timestamp, filter_result')
      .order('timestamp', { ascending: false });
      
    if (error) {
      console.error('Error fetching message history:', error);
      throw error;
    }
    
    const transformedData = data?.map(message => ({
      id: message.id,
      text: message.text,
      sender: message.sender,
      isHidden: message.is_hidden,
      timestamp: message.timestamp,
      filterResult: message.filter_result
    })) || [];

    console.log('Fetched message history:', transformedData);
    return transformedData;
  } catch (error) {
    console.error('Failed to fetch message history:', error);
    return [];
  }
};

export default function Simulation() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: "Hi! I'm here to help you test Descryber's filtering system. Try sending some messages!",
      sender: "bot",
      timestamp: new Date().toISOString()
    }
  ]);
  const [input, setInput] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!input.trim() || !isActive || isPaused) return;

    const filterResult = await analyzeMessage(input);
    const newMessage: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      isHidden: filterResult.isHarmful,
      timestamp: new Date().toISOString(),
      filterResult
    };

    setMessages(prev => [...prev, newMessage]);
    setInput("");

    if (filterResult.isHarmful) {
      try {
        const { error } = await supabase
          .from('message_history')
          .insert([{
            text: newMessage.text,
            sender: newMessage.sender,
            is_hidden: newMessage.isHidden,
            timestamp: newMessage.timestamp,
            filter_result: newMessage.filterResult
          }]);

        if (error) throw error;
        
        notifyHistorySubscribers();
        
        toast({
          title: "Message Hidden",
          description: `Message contained ${filterResult.categories.join(", ")} content with ${filterResult.severity} severity.`,
          variant: "destructive"
        });
      } catch (error) {
        console.error('Error storing message:', error);
        toast({
          title: "Error",
          description: "Failed to store message in history.",
          variant: "destructive"
        });
      }
    }

    // Bot response
    setTimeout(() => {
      const botMessage: Message = {
        id: Date.now() + 1,
        text: filterResult.isHarmful 
          ? `I noticed that message might contain ${filterResult.categories.join(" and ")}. Remember, kind words make the internet a better place! 😊`
          : "Thanks for the message! Keep testing our filter system. 👍",
        sender: "bot",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMessage]);
    }, 1000);
  };

  // Handle message restoration from history
  useEffect(() => {
    const subscription = supabase
      .from('message_history')
      .on('UPDATE', (payload) => {
        if (payload.new && !payload.new.is_hidden) {
          // Update the corresponding message in the simulation
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id 
              ? { ...msg, isHidden: false }
              : msg
          ));
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    toast({
      title: "Simulation Started",
      description: "You can now send messages to test the filter.",
    });
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
    toast({
      title: isPaused ? "Simulation Resumed" : "Simulation Paused",
      description: isPaused ? "You can continue sending messages." : "Message sending is paused.",
    });
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setMessages([{
      id: 1,
      text: "Simulation ended. Click Start to begin a new session!",
      sender: "bot",
      timestamp: new Date().toISOString()
    }]);
    toast({
      title: "Simulation Ended",
      description: "All messages have been cleared. Start a new session to continue testing.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <Navbar />
      <div className="container mx-auto px-4 pt-20">
        <div className="max-w-2xl mx-auto mt-8">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
              <h1 className="text-2xl font-bold text-center">Message Filter Demo</h1>
              <SimulationControls
                isActive={isActive}
                isPaused={isPaused}
                onStart={handleStart}
                onPause={handlePause}
                onStop={handleStop}
              />
            </div>
            <MessageList messages={messages} />
            <MessageInput
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              isDisabled={!isActive || isPaused}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
