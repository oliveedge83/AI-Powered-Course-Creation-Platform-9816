import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { getSystemStats, getAllUsers } from '../../services/supabaseService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ReactECharts from 'echarts-for-react';

const { 
  FiUsers, FiDatabase, FiBook, FiFileText, FiCpu, FiBarChart2, 
  FiPieChart, FiActivity, FiCalendar, FiTrendingUp 
} = FiIcons;

const SystemStats = () => {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState({
    total_users: 0,
    total_programs: 0,
    total_courses: 0,
    total_tokens: 0
  });
  const [userStats, setUserStats] = useState([]);
  const [activeView, setActiveView] = useState('overview');
  
  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/');
      return;
    }
    
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch system stats
        const stats = await getSystemStats();
        setSystemStats(stats);
        
        // Fetch user data
        const users = await getAllUsers();
        setUserStats(users);
      } catch (err) {
        console.error('Error fetching stats data:', err);
        setError('Failed to load statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [isSuperAdmin, navigate]);
  
  // Prepare chart data
  const getUsersChartOption = () => {
    // Group users by creation date (month/year)
    const usersByDate = {};
    userStats.forEach(user => {
      const date = new Date(user.created_at);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      
      if (!usersByDate[monthYear]) {
        usersByDate[monthYear] = 0;
      }
      usersByDate[monthYear]++;
    });
    
    // Sort dates chronologically
    const sortedDates = Object.keys(usersByDate).sort((a, b) => {
      const [monthA, yearA] = a.split('/').map(Number);
      const [monthB, yearB] = b.split('/').map(Number);
      
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return monthA - monthB;
    });
    
    return {
      title: {
        text: 'User Growth Over Time',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: sortedDates
      },
      yAxis: {
        type: 'value',
        name: 'Users'
      },
      series: [
        {
          data: sortedDates.map(date => usersByDate[date]),
          type: 'bar',
          color: '#3b82f6'
        }
      ]
    };
  };
  
  const getTokenUsageChartOption = () => {
    // Sort users by token usage and take top 10
    const topUsers = [...userStats]
      .sort((a, b) => b.total_tokens - a.total_tokens)
      .slice(0, 10);
    
    return {
      title: {
        text: 'Top 10 Users by Token Usage',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        name: 'Tokens'
      },
      yAxis: {
        type: 'category',
        data: topUsers.map(user => user.email.split('@')[0]),
        axisLabel: {
          interval: 0,
          margin: 15
        }
      },
      series: [
        {
          name: 'Token Usage',
          type: 'bar',
          data: topUsers.map(user => user.total_tokens),
          color: '#10b981'
        }
      ]
    };
  };
  
  const getContentGenerationChartOption = () => {
    // Sort users by courses count and take top 10
    const topUsers = [...userStats]
      .sort((a, b) => b.courses_count - a.courses_count)
      .slice(0, 10);
    
    return {
      title: {
        text: 'Top 10 Users by Content Generation',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['Programs', 'Courses', 'Lessons'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
        top: 80
      },
      xAxis: {
        type: 'value'
      },
      yAxis: {
        type: 'category',
        data: topUsers.map(user => user.email.split('@')[0]),
        axisLabel: {
          interval: 0,
          margin: 15
        }
      },
      series: [
        {
          name: 'Programs',
          type: 'bar',
          stack: 'total',
          data: topUsers.map(user => user.programs_count),
          color: '#3b82f6'
        },
        {
          name: 'Courses',
          type: 'bar',
          stack: 'total',
          data: topUsers.map(user => user.courses_count),
          color: '#8b5cf6'
        },
        {
          name: 'Lessons',
          type: 'bar',
          stack: 'total',
          data: topUsers.map(user => user.lessons_count),
          color: '#ec4899'
        }
      ]
    };
  };
  
  const getUserActivityChartOption = () => {
    // Get active vs inactive users
    const activeCount = userStats.filter(user => user.is_active).length;
    const inactiveCount = userStats.length - activeCount;
    
    // Get users with recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyActiveCount = userStats.filter(user => {
      if (!user.last_sign_in_at) return false;
      const lastSignIn = new Date(user.last_sign_in_at);
      return lastSignIn >= thirtyDaysAgo;
    }).length;
    
    const notRecentlyActiveCount = activeCount - recentlyActiveCount;
    
    return {
      title: {
        text: 'User Activity Status',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left',
        top: 30
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { 
              value: recentlyActiveCount, 
              name: 'Recently Active',
              itemStyle: { color: '#10b981' }
            },
            { 
              value: notRecentlyActiveCount, 
              name: 'Not Recently Active',
              itemStyle: { color: '#f59e0b' }
            },
            { 
              value: inactiveCount, 
              name: 'Inactive',
              itemStyle: { color: '#ef4444' }
            }
          ]
        }
      ]
    };
  };
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading system statistics...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-4xl text-red-500 mb-4 mx-auto" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Statistics</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Statistics</h1>
        <p className="text-gray-600">
          Detailed analytics and statistics for the entire platform.
        </p>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                <p className="text-3xl font-bold text-gray-900">{systemStats.total_users}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiUsers} className="text-blue-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Programs</p>
                <p className="text-3xl font-bold text-gray-900">{systemStats.total_programs}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiBook} className="text-green-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Courses</p>
                <p className="text-3xl font-bold text-gray-900">{systemStats.total_courses}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiFileText} className="text-yellow-600 text-xl" />
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Tokens</p>
                <p className="text-3xl font-bold text-gray-900">
                  {(systemStats.total_tokens / 1000).toFixed(1)}K
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <SafeIcon icon={FiCpu} className="text-red-600 text-xl" />
              </div>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* View Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex flex-wrap gap-3">
          <Button
            variant={activeView === 'overview' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('overview')}
            className="flex items-center space-x-2"
          >
            <SafeIcon icon={FiBarChart2} />
            <span>Overview</span>
          </Button>
          
          <Button
            variant={activeView === 'users' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('users')}
            className="flex items-center space-x-2"
          >
            <SafeIcon icon={FiUsers} />
            <span>Users</span>
          </Button>
          
          <Button
            variant={activeView === 'content' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('content')}
            className="flex items-center space-x-2"
          >
            <SafeIcon icon={FiFileText} />
            <span>Content</span>
          </Button>
          
          <Button
            variant={activeView === 'tokens' ? 'primary' : 'secondary'}
            onClick={() => setActiveView('tokens')}
            className="flex items-center space-x-2"
          >
            <SafeIcon icon={FiCpu} />
            <span>Tokens</span>
          </Button>
        </div>
      </motion.div>

      {/* Charts - Overview View */}
      {activeView === 'overview' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <Card className="p-4">
            <ReactECharts option={getUsersChartOption()} style={{ height: 400 }} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-4">
              <ReactECharts option={getUserActivityChartOption()} style={{ height: 400 }} />
            </Card>
            
            <Card className="p-4">
              <ReactECharts option={getTokenUsageChartOption()} style={{ height: 400 }} />
            </Card>
          </div>
        </motion.div>
      )}

      {/* Charts - Users View */}
      {activeView === 'users' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <Card className="p-4">
            <ReactECharts option={getUsersChartOption()} style={{ height: 400 }} />
          </Card>
          
          <Card className="p-4">
            <ReactECharts option={getUserActivityChartOption()} style={{ height: 400 }} />
          </Card>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">User Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'superadmin' 
                            ? 'bg-red-100 text-red-800' 
                            : user.role === 'admin' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString() 
                          : 'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts - Content View */}
      {activeView === 'content' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <Card className="p-4">
            <ReactECharts option={getContentGenerationChartOption()} style={{ height: 500 }} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <SafeIcon icon={FiBook} className="text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">Programs</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">{systemStats.total_programs}</div>
              <div className="text-sm text-gray-600">
                Average of {(systemStats.total_programs / Math.max(systemStats.total_users, 1)).toFixed(1)} programs per user
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-green-100 rounded-full">
                  <SafeIcon icon={FiFileText} className="text-green-600" />
                </div>
                <h3 className="font-medium text-gray-900">Courses</h3>
              </div>
              <div className="text-3xl font-bold text-green-600 mb-2">{systemStats.total_courses}</div>
              <div className="text-sm text-gray-600">
                Average of {(systemStats.total_courses / Math.max(systemStats.total_programs, 1)).toFixed(1)} courses per program
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-full">
                  <SafeIcon icon={FiDatabase} className="text-purple-600" />
                </div>
                <h3 className="font-medium text-gray-900">Content Size</h3>
              </div>
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {Math.round(systemStats.total_tokens * 0.00075)} MB
              </div>
              <div className="text-sm text-gray-600">
                Estimated size of generated content
              </div>
            </Card>
          </div>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content Generation by User</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programs</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lessons</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Content</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats
                    .sort((a, b) => b.programs_count - a.programs_count)
                    .map(user => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.programs_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.courses_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.lessons_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.programs_count + user.courses_count + user.lessons_count} items
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Charts - Tokens View */}
      {activeView === 'tokens' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-8"
        >
          <Card className="p-4">
            <ReactECharts option={getTokenUsageChartOption()} style={{ height: 500 }} />
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-full">
                  <SafeIcon icon={FiCpu} className="text-red-600" />
                </div>
                <h3 className="font-medium text-gray-900">Total Token Usage</h3>
              </div>
              <div className="text-3xl font-bold text-red-600 mb-2">
                {(systemStats.total_tokens / 1000).toFixed(1)}K
              </div>
              <div className="text-sm text-gray-600">
                Estimated cost: ${(systemStats.total_tokens * 0.00002).toFixed(2)}
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-yellow-100 rounded-full">
                  <SafeIcon icon={FiTrendingUp} className="text-yellow-600" />
                </div>
                <h3 className="font-medium text-gray-900">Average per Course</h3>
              </div>
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {Math.round(systemStats.total_tokens / Math.max(systemStats.total_courses, 1))}
              </div>
              <div className="text-sm text-gray-600">
                tokens per course
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-full">
                  <SafeIcon icon={FiUsers} className="text-blue-600" />
                </div>
                <h3 className="font-medium text-gray-900">Average per User</h3>
              </div>
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {Math.round(systemStats.total_tokens / Math.max(systemStats.total_users, 1))}
              </div>
              <div className="text-sm text-gray-600">
                tokens per user
              </div>
            </Card>
          </div>
          
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Token Usage by User</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tokens</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens per Course</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Percentage</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {userStats
                    .sort((a, b) => b.total_tokens - a.total_tokens)
                    .map(user => {
                      const usagePercentage = (user.total_tokens / Math.max(systemStats.total_tokens, 1)) * 100;
                      return (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {(user.total_tokens / 1000).toFixed(1)}K
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${(user.total_tokens * 0.00002).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {user.courses_count > 0
                              ? Math.round(user.total_tokens / user.courses_count)
                              : 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2 max-w-[150px]">
                                <div 
                                  className="bg-blue-600 h-2.5 rounded-full" 
                                  style={{ width: `${usagePercentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-700">
                                {usagePercentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default SystemStats;