import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useProgram } from '../contexts/ProgramContext';

const { FiHome, FiEdit, FiPlay, FiBook } = FiIcons;

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useProgram();

  const navItems = [
    { 
      path: '/', 
      icon: FiHome, 
      label: 'Program Setup',
      enabled: true
    },
    { 
      path: '/review', 
      icon: FiEdit, 
      label: 'Review & Edit',
      enabled: state.generatedStructure !== null
    },
    { 
      path: '/generate', 
      icon: FiPlay, 
      label: 'Generate Content',
      enabled: state.editedStructure !== null
    }
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiBook} className="text-2xl text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">
              MicroMasters Generator
            </h1>
          </div>
          
          <div className="flex space-x-1">
            {navItems.map((item) => (
              <motion.button
                key={item.path}
                onClick={() => item.enabled && navigate(item.path)}
                disabled={!item.enabled}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200
                  ${location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : item.enabled
                    ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                  }
                `}
                whileHover={item.enabled ? { scale: 1.02 } : {}}
                whileTap={item.enabled ? { scale: 0.98 } : {}}
              >
                <SafeIcon icon={item.icon} className="text-lg" />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}