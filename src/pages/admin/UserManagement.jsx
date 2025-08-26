import React, {useState, useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import {motion, AnimatePresence} from 'framer-motion';
import {useForm} from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import {useAuthStore} from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import {getAllUsers, createUser, updateUser, deleteUser, resetUserPassword} from '../../services/supabaseService';

const {FiUsers, FiUserPlus, FiUserX, FiSearch, FiEdit2, FiTrash2, FiKey, FiX, FiCheck, FiAlertTriangle, FiUserCheck, FiUserMinus, FiUser} = FiIcons;

const UserManagement = () => {
  const navigate = useNavigate();
  const {isSuperAdmin} = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    formState: {errors: errorsAdd},
    reset: resetAdd
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: {errors: errorsEdit},
    reset: resetEdit,
    setValue
  } = useForm();

  const {
    register: registerReset,
    handleSubmit: handleSubmitReset,
    formState: {errors: errorsReset},
    reset: resetResetForm
  } = useForm();

  useEffect(() => {
    if (!isSuperAdmin()) {
      navigate('/');
      return;
    }

    fetchUsers();
  }, [isSuperAdmin, navigate]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        user =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
      setFilteredUsers(allUsers);
    } catch (err) {
      console.error('Error fetching users:', err);
      toast.error('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (data) => {
    setActionLoading(true);
    try {
      await createUser(data.email, data.password, data.role);
      toast.success('User created successfully!');
      setShowAddModal(false);
      resetAdd();
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Failed to create user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditUser = async (data) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const updates = {
        role: data.role,
        is_active: data.is_active === 'active'
      };

      if (data.email && data.email !== selectedUser.email) {
        updates.email = data.email;
      }

      await updateUser(selectedUser.id, updates);
      toast.success('User updated successfully!');
      setShowEditModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Failed to update user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await deleteUser(selectedUser.id);
      toast.success('User deleted successfully!');
      setShowDeleteModal(false);
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (data) => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      await resetUserPassword(selectedUser.id, data.password);
      toast.success('Password reset successfully!');
      setShowResetModal(false);
      resetResetForm();
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    setActionLoading(true);
    try {
      await updateUser(user.id, {is_active: !user.is_active});
      toast.success(`User ${user.is_active ? 'deactivated' : 'activated'} successfully!`);
      fetchUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error('Failed to update user status. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setValue('email', user.email);
    setValue('role', user.role);
    setValue('is_active', user.is_active ? 'active' : 'inactive');
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openResetModal = (user) => {
    setSelectedUser(user);
    setShowResetModal(true);
  };

  const AddUserModal = () => (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={() => setShowAddModal(false)}
    >
      <motion.div
        initial={{scale: 0.95, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        exit={{scale: 0.95, opacity: 0}}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <SafeIcon icon={FiUserPlus} className="text-blue-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Add New User</h3>
            </div>
            <button
              onClick={() => setShowAddModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="text-xl" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmitAdd(handleAddUser)} className="p-6 space-y-4">
          <Input
            label="Email Address"
            type="email"
            {...registerAdd('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            error={errorsAdd.email?.message}
          />
          <Input
            label="Password"
            type="password"
            {...registerAdd('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              }
            })}
            error={errorsAdd.password?.message}
          />
          <Select
            label="Role"
            {...registerAdd('role', {required: 'Role is required'})}
            options={[
              {value: 'user', label: 'User'},
              {value: 'admin', label: 'Admin'},
              {value: 'superadmin', label: 'Super Admin'}
            ]}
            error={errorsAdd.role?.message}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowAddModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Create User
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  const EditUserModal = () => (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={() => setShowEditModal(false)}
    >
      <motion.div
        initial={{scale: 0.95, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        exit={{scale: 0.95, opacity: 0}}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <SafeIcon icon={FiEdit2} className="text-yellow-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Edit User</h3>
            </div>
            <button
              onClick={() => setShowEditModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="text-xl" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmitEdit(handleEditUser)} className="p-6 space-y-4">
          <Input
            label="Email Address"
            type="email"
            {...registerEdit('email', {
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            error={errorsEdit.email?.message}
          />
          <Select
            label="Role"
            {...registerEdit('role', {required: 'Role is required'})}
            options={[
              {value: 'user', label: 'User'},
              {value: 'admin', label: 'Admin'},
              {value: 'superadmin', label: 'Super Admin'}
            ]}
            error={errorsEdit.role?.message}
          />
          <Select
            label="Status"
            {...registerEdit('is_active', {required: 'Status is required'})}
            options={[
              {value: 'active', label: 'Active'},
              {value: 'inactive', label: 'Inactive'}
            ]}
            error={errorsEdit.is_active?.message}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Save Changes
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  const DeleteUserModal = () => (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={() => setShowDeleteModal(false)}
    >
      <motion.div
        initial={{scale: 0.95, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        exit={{scale: 0.95, opacity: 0}}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 bg-red-100 rounded-full mb-4">
              <SafeIcon icon={FiAlertTriangle} className="text-red-600 text-3xl" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Delete User</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete the user <span className="font-medium">{selectedUser?.email}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-center space-x-4 w-full">
              <Button
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUserConfirm}
                loading={actionLoading}
                className="flex-1"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  const ResetPasswordModal = () => (
    <motion.div
      initial={{opacity: 0}}
      animate={{opacity: 1}}
      exit={{opacity: 0}}
      className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
      onClick={() => setShowResetModal(false)}
    >
      <motion.div
        initial={{scale: 0.95, opacity: 0}}
        animate={{scale: 1, opacity: 1}}
        exit={{scale: 0.95, opacity: 0}}
        className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <SafeIcon icon={FiKey} className="text-blue-600 text-xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Reset Password</h3>
            </div>
            <button
              onClick={() => setShowResetModal(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <SafeIcon icon={FiX} className="text-xl" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmitReset(handleResetPassword)} className="p-6 space-y-4">
          <div className="mb-4">
            <p className="text-gray-600">
              Set a new password for user: <span className="font-medium">{selectedUser?.email}</span>
            </p>
          </div>
          <Input
            label="New Password"
            type="password"
            {...registerReset('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters'
              }
            })}
            error={errorsReset.password?.message}
          />
          <Input
            label="Confirm New Password"
            type="password"
            {...registerReset('confirmPassword', {
              required: 'Confirm password is required',
              validate: (value, formValues) =>
                value === formValues.password || 'Passwords do not match'
            })}
            error={errorsReset.confirmPassword?.message}
          />
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowResetModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={actionLoading}>
              Reset Password
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence>
        {showAddModal && <AddUserModal />}
        {showEditModal && <EditUserModal />}
        {showDeleteModal && <DeleteUserModal />}
        {showResetModal && <ResetPasswordModal />}
      </AnimatePresence>

      <motion.div initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">
          Create, edit, and manage user accounts across the platform.
        </p>
      </motion.div>

      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.1}}
        className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0"
      >
        <Button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2"
        >
          <SafeIcon icon={FiUserPlus} />
          <span>Add New User</span>
        </Button>

        <div className="relative w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search users..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <SafeIcon
            icon={FiSearch}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
        </div>
      </motion.div>

      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.2}}
      >
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <SafeIcon icon={FiUser} className="text-gray-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-xs text-gray-500">{user.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'superadmin' ? 'bg-red-100 text-red-800' : user.role === 'admin' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-1.5 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
                            title="Edit User"
                          >
                            <SafeIcon icon={FiEdit2} />
                          </button>
                          <button
                            onClick={() => openResetModal(user)}
                            className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                            title="Reset Password"
                          >
                            <SafeIcon icon={FiKey} />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`p-1.5 ${user.is_active ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-600 hover:bg-green-100'} rounded-lg`}
                            title={user.is_active ? 'Deactivate User' : 'Activate User'}
                          >
                            <SafeIcon icon={user.is_active ? FiUserMinus : FiUserCheck} />
                          </button>
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                            title="Delete User"
                          >
                            <SafeIcon icon={FiTrash2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{opacity: 0, y: 20}}
        animate={{opacity: 1, y: 0}}
        transition={{delay: 0.3}}
        className="mt-8"
      >
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-full">
                  <SafeIcon icon={FiUsers} className="text-blue-600" />
                </div>
                <span className="font-medium text-blue-800">Total Users</span>
              </div>
              <p className="text-3xl font-bold text-blue-900">{users.length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-green-100 rounded-full">
                  <SafeIcon icon={FiUserCheck} className="text-green-600" />
                </div>
                <span className="font-medium text-green-800">Active Users</span>
              </div>
              <p className="text-3xl font-bold text-green-900">
                {users.filter(user => user.is_active).length}
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <div className="p-2 bg-red-100 rounded-full">
                  <SafeIcon icon={FiUserX} className="text-red-600" />
                </div>
                <span className="font-medium text-red-800">Inactive Users</span>
              </div>
              <p className="text-3xl font-bold text-red-900">
                {users.filter(user => !user.is_active).length}
              </p>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default UserManagement;