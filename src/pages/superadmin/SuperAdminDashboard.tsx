import { useState, useEffect } from "react";
import { supabase } from "@/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { School, Plus, Loader2, UserPlus, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface SchoolData {
  id: string;
  name: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create School Form
  const [newSchoolName, setNewSchoolName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
      toast.error("Failed to load schools");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName || !adminEmail || !adminPassword) {
      toast.error("Please fill all fields");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-school", {
        body: {
          name: newSchoolName,
          admin_email: adminEmail,
          admin_password: adminPassword,
          admin_name: adminName,
        },
      });

      if (error) throw error;

      toast.success("School and Admin created successfully!");
      setNewSchoolName("");
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
      setIsDialogOpen(false);
      fetchSchools();
    } catch (error: any) {
      console.error("Error creating school:", error);
      toast.error(error.message || "Failed to create school");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-8 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600 mb-2">
            Super Admin Dashboard
          </h1>
          <p className="text-muted-foreground">
            Manage schools and platform settings
          </p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4 mr-2" /> Onboard School
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" /> Onboard New School
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSchool} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">School Name</label>
                <Input
                  className="bg-secondary/20"
                  placeholder="e.g. Springfield High"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  disabled={isCreating}
                />
              </div>
              
              <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="text-sm font-medium text-blue-400 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> First Admin Details
                </label>
                <Input
                  className="bg-secondary/20"
                  placeholder="Admin Name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  disabled={isCreating}
                />
                <Input
                  className="bg-secondary/20"
                  placeholder="Admin Email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={isCreating}
                />
                <Input
                  className="bg-secondary/20"
                  placeholder="Password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create School & Admin"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6">
        <Card className="glass-card p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <School className="w-5 h-5 text-blue-400" /> Active Schools
          </h2>
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            </div>
          ) : (
            <div className="rounded-md border border-white/10 overflow-hidden">
              <Table>
                <TableHeader className="bg-secondary/20">
                  <TableRow>
                    <TableHead>School Name</TableHead>
                    <TableHead>School ID</TableHead>
                    <TableHead>Onboarded At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">
                        No schools found. Create one to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    schools.map((school) => (
                      <TableRow key={school.id} className="hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-blue-100">{school.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{school.id}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(school.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => {
                             toast.info(`Managing ${school.name} (Coming Soon)`);
                          }}>
                            Manage
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
