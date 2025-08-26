import React, {useState, useEffect} from 'react';
import {Link, useNavigate} from 'react-router-dom';
import {motion} from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import {useAuthStore} from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {getSystemStats, getAllUsers} from '../../services/supabaseService';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ReactECharts from 'echarts-for-react';

const {FiUsers, FiDatabase, FiBook, FiFileText, FiCpu, FiBarChart2, FiPieChart, FiActivity, FiSettings, FiUser} = FiIcons;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {isSuperAdmin} = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [systemStats, setSystemStats] = useState({
    total_users: 0,
    total_programs: 0,
    total_courses: 0,
    total_tokens: 0
  });
  const [userStats, setUserStats] = useState([]);

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
        console.error('Error fetching admin data:', err);
        setError('Failed to load admin dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSuperAdmin, navigate]);

  // Prepare chart data
  const getProgramsChartOption = () => {
    // Sort users by program count and take top 5
    const topUsers = [...userStats]
      .sort((a, b) => b.programs_count - a.programs_count)
      .slice(0, 5);

    return {
      title: {
        text: 'Top Users by Programs',
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
        data: topUsers.map(user => user.email.split('@')[0]),
        axisLabel: {
          interval: 0,
          rotate: 30
        }
      },
      yAxis: {
        type: 'value',
        name: 'Programs'
      },
      series: [
        {
          data: topUsers.map(user => user.programs_count),
          type: 'bar',
          color: '#3b82f6'
        }
      ]
    };
  };

  const getTokensChartOption = () => {
    // Sort users by token usage and take top 5
    const topUsers = [...userStats]
      .sort((a, b) => b.total_tokens - a.total_tokens)
      .slice(0, 5);

    return {
      title: {
        text: 'Top Users by Token Usage',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: '70%',
          data: topUsers.map(user => ({
            name: user.email.split('@')[0],
            value: user.total_tokens
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          }
        }
      ]
    };
  };

  const getUserRolesChartOption = () => {
    const roleCount = {
      superadmin: 0,
      admin: 0,
      user: 0
    };

    userStats.forEach(user => {
      if (Object.prototype.hasOwnProperty.call(roleCount, user.role)) {
        roleCount[user.role]++;
      } else {
        roleCount.user++;
      }
    });

    return {
      title: {
        text: 'User Roles Distribution',
        left: 'center'
      },
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: '70%',
          data: [
            {
              name: 'Superadmin',
              value: roleCount.superadmin,
              itemStyle: {color: '#ef4444'}
            },
            {
              name: 'Admin',
              value: roleCount.admin,
              itemStyle: {color: '#f59e0b'}
            },
            {
              name: 'User',
              value: roleCount.user,
              itemStyle: {color: '#3b82f6'}
            }
          ],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0,0,0,0.5)'
            }
          }
        }
      ]
    };
  };

  const getActivityChartOption = () => {
    // This is a placeholder - in a real app, you'd fetch actual activity data
    return {
      title: {
        text: 'System Activity (Last 7 Days)',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
      },
      yAxis: {
        type: 'value',
        name: 'Operations'
      },
      series: [
        {
          name: 'API Calls',
          type: 'line',
          smooth: true,
          data: [120, 132, 101, 134, 90, 50, 70],
          color: '#3b82f6'
        },
        {
          name: 'Content Generation',
          type: 'line',
          smooth: true,
          data: [220, 182, 191, 234, 290, 150, 170],
          color: '#10b981'
        }
      ]
    };
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <SafeIcon icon={FiIcons.FiAlertTriangle} className="text-4xl text-red-500 mb-4 mx-auto" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">
          Monitor system performance, user statistics, and manage platform settings.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.1}}
        className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Link to="/admin/users">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <SafeIcon icon={FiUsers} className="text-blue-600 text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">User Management</h3>
                <p className="text-sm text-gray-600">Add, edit or deactivate user accounts</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/admin/stats">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <SafeIcon icon={FiBarChart2} className="text-green-600 text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">System Statistics</h3>
                <p className="text-sm text-gray-600">View detailed platform analytics</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link to="/settings">
          <Card className="p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <SafeIcon icon={FiSettings} className="text-purple-600 text-xl" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">System Settings</h3>
                <p className="text-sm text-gray-600">Configure API keys and global settings</p>
              </div>
            </div>
          </Card>
        </Link>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.2}}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Overview</h2>
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

      {/* Analytics Charts */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.3}}
        className="mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <ReactECharts option={getProgramsChartOption()} style={{height: 300}} />
          </Card>
          <Card className="p-4">
            <ReactECharts option={getTokensChartOption()} style={{height: 300}} />
          </Card>
          <Card className="p-4">
            <ReactECharts option={getUserRolesChartOption()} style={{height: 300}} />
          </Card>
          <Card className="p-4">
            <ReactECharts option={getActivityChartOption()} style={{height: 300}} />
          </Card>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.4}}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent User Activity</h2>
          <Link to="/admin/stats">
            <Button variant="secondary" size="sm">View All Activity</Button>
          </Link>
        </div>
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userStats.slice(0, 5).map((user, index) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <SafeIcon icon={FiUser} className="text-gray-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.email}</div>
                          <div className="text-sm text-gray-500">{user.role}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {index % 3 === 0 ? 'Created Program' : index % 3 === 1 ? 'Generated Course' : 'Logged In'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(user.last_sign_in_at || user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;