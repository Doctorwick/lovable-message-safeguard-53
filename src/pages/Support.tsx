import { useQuery } from "@tanstack/react-query";
import { Navbar } from "@/components/Navbar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ExternalLink, LifeBuoy, HelpCircle, Info, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

interface SupportResource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  priority: number;
}

const Support = () => {
  const { toast } = useToast();
  const { data: resources, isLoading } = useQuery({
    queryKey: ["support-resources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_resources")
        .select("*")
        .eq("active", true)
        .order("priority", { ascending: false });
      
      if (error) {
        toast({
          title: "Error loading resources",
          description: "Please try again later",
          variant: "destructive",
        });
        throw error;
      }
      return data as SupportResource[];
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case "crisis":
        return <LifeBuoy className="h-5 w-5 text-red-500" />;
      case "mental health":
        return <HelpCircle className="h-5 w-5 text-pink-500" />;
      case "communication":
        return <MessageSquare className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5 text-purple-500" />;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-purple-700 to-purple-800 bg-clip-text text-transparent">
            Support Resources
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            We're here to help. Below you'll find a list of trusted resources and support services 
            available to assist you on your journey.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-32 bg-gray-200 rounded-t-lg" />
                <CardContent className="h-24 bg-gray-100 rounded-b-lg" />
              </Card>
            ))}
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {resources?.map((resource) => (
              <motion.div
                key={resource.id}
                variants={item}
                whileHover={{ y: -5 }}
                className="h-full"
              >
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block h-full"
                >
                  <Card className="h-full transition-all duration-300 hover:shadow-lg border-purple-100 bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getCategoryIcon(resource.category)}
                          <span className="text-sm font-medium text-gray-500 capitalize">
                            {resource.category}
                          </span>
                        </div>
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                      <CardTitle className="text-xl bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
                        {resource.name}
                      </CardTitle>
                      <CardDescription className="text-gray-600">
                        {resource.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </a>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Support;