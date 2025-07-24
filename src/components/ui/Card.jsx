import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ 
  children, 
  className = '', 
  hover = true, 
  ...props 
}) => {
  return (
    <motion.div
      whileHover={hover ? { y: -2, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' } : {}}
      className={`
        bg-white rounded-xl border border-gray-200 shadow-sm 
        transition-all duration-200 ${className}
      `}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default Card;