import React, { useState } from 'react';
import { Lock, User, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { loginRequest } from '../utils/auth';
const LOGO_URL = "./WhatsApp_Image_2025-12-13_at_2.34.53_PM.jpg";

interface LoginPageProps {
  onLogin: () => void;
}
export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      await loginRequest(username, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setIsLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <motion.div
        initial={{
          opacity: 0,
          y: 20
        }}
        animate={{
          opacity: 1,
          y: 0
        }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        
        <div className="bg-[#f5a623] p-8 text-center">
          <img
            src={LOGO_URL}
            alt="Universal Tools"
            className="h-20 w-auto mx-auto mb-2 object-contain" />
          
          <p className="text-[#1a1a2e] text-sm font-medium mt-1">POS System</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error &&
            <motion.div
              initial={{
                opacity: 0,
                x: -10
              }}
              animate={{
                opacity: 1,
                x: 0
              }}
              className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2 border border-red-100">
              
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            }

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all"
                  placeholder="Enter username"
                  required />
                
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f5a623] focus:border-transparent outline-none transition-all"
                  placeholder="Enter password"
                  required />
                
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1a1a2e] hover:bg-[#2d4059] text-white font-bold py-3.5 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              
              {isLoading ?
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :

              'Sign In'
              }
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">
              Authorized personnel only. All activities are monitored.
            </p>
          </div>
        </div>
      </motion.div>
    </div>);

}