import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useProgramStore } from '../stores/programStore';
import { useAuthStore } from '../stores/authStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const { FiPlus, FiBook, FiClock, FiEdit3, FiEye, FiTrendingUp, FiUsers, FiTarget } = FiIcons;

const Dashboard = () => {
  const { user } = useAuthStore();
  const { programs } = useProgramStore();

  const stats = [
    {
      label: 'Total Programs',
      value: programs.length,
      icon: FiBook,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: 'In Progress',
      value: programs.filter(p => p.status === 'in-progress').length,
      icon: FiClock,
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      label: 'Completed',
      value: programs.filter(p => p.status === 'completed').length,
      icon: FiTarget,
      color: 'from-green-500 to-green-600'
    },
    {
      label: 'Total Courses',
      value: programs.reduce((total, p) => total + (p.courses?.length || 0), 0),
      icon: FiTrendingUp,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-gray-600">
          Manage your AI-generated educational programs and monitor their progress.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                  <SafeIcon icon={stat.icon} className="text-white text-xl" />
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <Card className="p-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
          <div className="flex flex-col sm:flex-row items-center justify-between">
            <div className="mb-4 sm:mb-0">
              <h2 className="text-xl font-semibold text-primary-900 mb-2">
                Ready to create your next program?
              </h2>
              <p className="text-primary-700">
                Use AI to generate comprehensive educational content in minutes.
              </p>
            </div>
            <Link to="/create">
              <Button size="lg" className="flex items-center space-x-2">
                <SafeIcon icon={FiPlus} />
                <span>Create New Program</span>
              </Button>
            </Link>
          </div>
        </Card>
      </motion.div>

      {/* Programs List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Your Programs</h2>
          {programs.length > 0 && (
            <Link to="/create">
              <Button variant="secondary" className="flex items-center space-x-2">
                <SafeIcon icon={FiPlus} />
                <span>New Program</span>
              </Button>
            </Link>
          )}
        </div>

        {programs.length === 0 ? (
          <Card className="p-12 text-center">
            <SafeIcon icon={FiBook} className="text-6xl text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No programs yet
            </h3>
            <p className="text-gray-600 mb-6">
              Create your first AI-generated educational program to get started.
            </p>
            <Link to="/create">
              <Button size="lg">
                <SafeIcon icon={FiPlus} className="mr-2" />
                Create Your First Program
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {programs.map((program, index) => (
              <motion.div
                key={program.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 hover:shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {program.niche || 'Untitled Program'}
                      </h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(program.status)}`}>
                        {program.status?.replace('-', ' ') || 'draft'}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <Link to={`/review/${program.id}`}>
                        <Button variant="ghost" size="sm">
                          <SafeIcon icon={FiEye} />
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm">
                        <SafeIcon icon={FiEdit3} />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <SafeIcon icon={FiBook} className="mr-2" />
                      <span>{program.courses?.length || 0} courses</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <SafeIcon icon={FiClock} className="mr-2" />
                      <span>
                        Created {new Date(program.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {program.mustHaveAspects && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {program.mustHaveAspects}
                    </p>
                  )}
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Dashboard;