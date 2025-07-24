import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Textarea = forwardRef(({ 
  label, 
  error, 
  className = '', 
  rows = 4, 
  ...props 
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <motion.textarea
        ref={ref}
        whileFocus={{ scale: 1.01 }}
        rows={rows}
        className={`
          w-full px-4 py-3 border rounded-lg transition-all duration-200 resize-vertical
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          ${error 
            ? 'border-red-300 bg-red-50' 
            : 'border-gray-300 bg-white hover:border-gray-400'
          }
        `}
        {...props}
      />
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;