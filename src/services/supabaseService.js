import {supabase} from '../lib/supabase'

// Authentication functions
export const signUp = async (email, password, metadata = {}) => {
  try {
    const {data, error} = await supabase.auth.signUp({
      email,
      password,
      options: {data: metadata}
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error signing up:', error)
    throw error
  }
}

export const signIn = async (email, password) => {
  try {
    const {data, error} = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error

    // Fetch user's role after login
    const {data: userData, error: userError} = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .single();
    if (!userError && userData) {
      // Add role to the user data
      data.user.role = userData.role;
    }
    return data
  } catch (error) {
    console.error('Error signing in:', error)
    throw error
  }
}

export const signOut = async () => {
  try {
    const {error} = await supabase.auth.signOut()
    if (error) throw error
  } catch (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

export const getCurrentUser = async () => {
  try {
    const {data: {user}, error} = await supabase.auth.getUser()
    if (error) throw error
    if (user) {
      // Fetch user's role
      const {data: userData, error: userError} = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      if (!userError && userData) {
        // Add role to the user data
        user.role = userData.role;
      }
    }
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export const updateUserProfile = async (updates) => {
  try {
    const {data, error} = await supabase.auth.updateUser({
      data: updates
    })
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// Database functions for programs
export const createProgram = async (programData) => {
  try {
    const {data: {user}} = await supabase.auth.getUser()
    const {data, error} = await supabase
      .from('programs')
      .insert([{
        ...programData,
        user_id: user ? user.id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating program:', error)
    throw error
  }
}

export const getUserPrograms = async () => {
  try {
    const {data: {user}} = await supabase.auth.getUser()
    let query = supabase
      .from('programs')
      .select(`
        *,
        courses (
          id,
          course_title,
          wordpress_course_id,
          status,
          input_tokens,
          output_tokens,
          total_tokens,
          created_at
        )
      `)
      .order('created_at', {ascending: false})

    // Add user filter if authenticated
    if (user) {
      query = query.eq('user_id', user.id)
    }

    const {data, error} = await query
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching user programs:', error)
    throw error
  }
}

export const getProgramById = async (programId) => {
  try {
    const {data, error} = await supabase
      .from('programs')
      .select(`
        *,
        courses (
          id,
          course_title,
          wordpress_course_id,
          status,
          input_tokens,
          output_tokens,
          total_tokens,
          created_at
        )
      `)
      .eq('id', programId)
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error fetching program:', error)
    throw error
  }
}

export const updateProgram = async (programId, updates) => {
  try {
    const {data, error} = await supabase
      .from('programs')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', programId)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating program:', error)
    throw error
  }
}

export const deleteProgram = async (programId) => {
  try {
    const {error} = await supabase
      .from('programs')
      .delete()
      .eq('id', programId)
    if (error) throw error
  } catch (error) {
    console.error('Error deleting program:', error)
    throw error
  }
}

// Database functions for courses
export const createCourse = async (courseData) => {
  try {
    const {data: {user}} = await supabase.auth.getUser()
    const {data, error} = await supabase
      .from('courses')
      .insert([{
        ...courseData,
        user_id: user ? user.id : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating course:', error)
    throw error
  }
}

export const updateCourse = async (courseId, updates) => {
  try {
    const {data, error} = await supabase
      .from('courses')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error updating course:', error)
    throw error
  }
}

export const getCoursesByProgram = async (programId) => {
  try {
    const {data, error} = await supabase
      .from('courses')
      .select('*')
      .eq('program_id', programId)
      .order('created_at', {ascending: true})
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching courses:', error)
    throw error
  }
}

// Superadmin functions
export const getAllUsers = async () => {
  try {
    // Get current user to check if superadmin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'superadmin') {
      throw new Error('Unauthorized access');
    }

    // First, get all users from auth.users
    const {data: authUsers, error: authError} = await supabase.auth.admin.listUsers();
    if (authError) throw authError;

    // Then, get user roles
    const {data: userRoles, error: rolesError} = await supabase
      .from('user_roles')
      .select('*');
    if (rolesError) throw rolesError;

    // Get user stats
    const {data: userStats, error: statsError} = await supabase
      .from('user_stats')
      .select('*');
    if (statsError) throw statsError;

    // Merge the data
    const users = authUsers.users.map(user => {
      const role = userRoles.find(r => r.user_id === user.id)?.role || 'user';
      const stats = userStats.find(s => s.user_id === user.id) || {
        programs_count: 0,
        courses_count: 0,
        lessons_count: 0,
        total_tokens: 0
      };
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        is_active: !user.banned_until,
        role,
        ...stats
      };
    });

    return users;
  } catch (error) {
    console.error('Error fetching all users:', error);
    throw error;
  }
}

export const getUserStats = async (userId) => {
  try {
    // Get programs count
    const {data: programs, error: programsError} = await supabase
      .from('programs')
      .select('id')
      .eq('user_id', userId);
    if (programsError) throw programsError;

    // Get courses count and token usage
    const {data: courses, error: coursesError} = await supabase
      .from('courses')
      .select('id,input_tokens,output_tokens,total_tokens')
      .eq('user_id', userId);
    if (coursesError) throw coursesError;

    // Calculate total tokens
    const totalTokens = courses.reduce((sum, course) => sum + (course.total_tokens || 0), 0);

    // Get lessons count (by counting topics and lessons in each course)
    let lessonsCount = 0;
    for (const course of courses) {
      const {data: topics, error: topicsError} = await supabase
        .from('topics')
        .select('id')
        .eq('course_id', course.id);
      if (topicsError) throw topicsError;

      for (const topic of topics) {
        const {data: lessons, error: lessonsError} = await supabase
          .from('lessons')
          .select('id')
          .eq('topic_id', topic.id);
        if (lessonsError) throw lessonsError;
        lessonsCount += lessons.length;
      }
    }

    return {
      programs_count: programs.length,
      courses_count: courses.length,
      lessons_count: lessonsCount,
      total_tokens: totalTokens
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    throw error;
  }
}

export const createUser = async (email, password, role = 'user') => {
  try {
    // Create user in auth
    const {data: authData, error: authError} = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (authError) throw authError;

    // Add role
    const {error: roleError} = await supabase
      .from('user_roles')
      .insert([{
        user_id: authData.user.id,
        role,
        created_at: new Date().toISOString()
      }]);
    if (roleError) throw roleError;

    // Initialize stats
    const {error: statsError} = await supabase
      .from('user_stats')
      .insert([{
        user_id: authData.user.id,
        programs_count: 0,
        courses_count: 0,
        lessons_count: 0,
        total_tokens: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }]);
    if (statsError) throw statsError;

    return authData.user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export const updateUser = async (userId, updates) => {
  try {
    // Update user in auth if needed
    if (updates.email || updates.password) {
      const authUpdates = {};
      if (updates.email) authUpdates.email = updates.email;
      if (updates.password) authUpdates.password = updates.password;
      const {error: authError} = await supabase.auth.admin.updateUserById(
        userId,
        authUpdates
      );
      if (authError) throw authError;
    }

    // Update role if needed
    if (updates.role) {
      const {error: roleError} = await supabase
        .from('user_roles')
        .update({role: updates.role})
        .eq('user_id', userId);
      if (roleError) throw roleError;
    }

    // Toggle active status if needed
    if (Object.prototype.hasOwnProperty.call(updates, 'is_active')) {
      const {error: statusError} = await supabase.auth.admin.updateUserById(
        userId,
        {banned_until: updates.is_active ? null : '2100-01-01'}
      );
      if (statusError) throw statusError;
    }

    return {id: userId, ...updates};
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

export const deleteUser = async (userId) => {
  try {
    // Delete user from auth
    const {error: authError} = await supabase.auth.admin.deleteUser(userId);
    if (authError) throw authError;

    // Delete role and stats (should be handled by database triggers, but just in case)
    await supabase.from('user_roles').delete().eq('user_id', userId);
    await supabase.from('user_stats').delete().eq('user_id', userId);

    return {success: true};
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

export const resetUserPassword = async (userId, newPassword) => {
  try {
    const {error} = await supabase.auth.admin.updateUserById(
      userId,
      {password: newPassword}
    );
    if (error) throw error;
    return {success: true};
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
}

export const getSystemStats = async () => {
  try {
    // Get total users
    const {count: userCount, error: userError} = await supabase
      .from('user_roles')
      .select('*', {count: 'exact', head: true});
    if (userError) throw userError;

    // Get total programs
    const {count: programCount, error: programError} = await supabase
      .from('programs')
      .select('*', {count: 'exact', head: true});
    if (programError) throw programError;

    // Get total courses
    const {count: courseCount, error: courseError} = await supabase
      .from('courses')
      .select('*', {count: 'exact', head: true});
    if (courseError) throw courseError;

    // Get total tokens
    const {data: tokenData, error: tokenError} = await supabase
      .from('courses')
      .select('total_tokens');
    if (tokenError) throw tokenError;
    const totalTokens = tokenData.reduce((sum, course) => sum + (course.total_tokens || 0), 0);

    return {
      total_users: userCount,
      total_programs: programCount,
      total_courses: courseCount,
      total_tokens: totalTokens
    };
  } catch (error) {
    console.error('Error getting system stats:', error);
    throw error;
  }
}

// Initialize tables
export const initializeDatabase = async () => {
  try {
    // Check if tables exist
    const {data: programsExist, error: programsError} = await supabase
      .from('programs')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: coursesExist, error: coursesError} = await supabase
      .from('courses')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: recoveryStateExist, error: recoveryStateError} = await supabase
      .from('recovery_state_74621')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: apiLogsExist, error: apiLogsError} = await supabase
      .from('api_logs_74621')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: tokenUsageExist, error: tokenUsageError} = await supabase
      .from('token_usage_74621')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: userRolesExist, error: userRolesError} = await supabase
      .from('user_roles')
      .select('id')
      .limit(1)
      .maybeSingle()

    const {data: userStatsExist, error: userStatsError} = await supabase
      .from('user_stats')
      .select('id')
      .limit(1)
      .maybeSingle()

    // Create tables if they don't exist
    if (programsError || !programsExist) {
      console.log('Creating programs table...')
      // Create programs table
      await supabase.rpc('create_programs_table')
    }

    if (coursesError || !coursesExist) {
      console.log('Creating courses table...')
      // Create courses table
      await supabase.rpc('create_courses_table')
    }

    if (recoveryStateError || !recoveryStateExist) {
      console.log('Creating recovery_state table...')
      // Create recovery_state table
      await supabase.rpc('create_recovery_state')
    }

    if (apiLogsError || !apiLogsExist) {
      console.log('Creating api_logs table...')
      // Create api_logs table
      await supabase.rpc('create_api_logs_table')
    }

    if (tokenUsageError || !tokenUsageExist) {
      console.log('Creating token_usage table...')
      // Create token_usage table
      await supabase.rpc('create_token_usage_table')
    }

    if (userRolesError || !userRolesExist) {
      console.log('Creating user_roles table...')
      // Create user_roles table
      await supabase.rpc('create_user_roles_table')
      // Create superadmin user if it doesn't exist
      const {data: superadmin, error: superadminError} = await supabase.auth.signUp({
        email: 'oliveearthdigital@gmail.com',
        password: 'Ubernow20212030',
        options: {data: {name: 'Super Admin'}}
      });
      if (!superadminError && superadmin) {
        // Add superadmin role
        await supabase.from('user_roles').insert({
          user_id: superadmin.user.id,
          role: 'superadmin',
          created_at: new Date().toISOString()
        });
      }
    }

    if (userStatsError || !userStatsExist) {
      console.log('Creating user_stats table...')
      // Create user_stats table
      await supabase.rpc('create_user_stats_table')
    }

    return true
  } catch (error) {
    console.error('Error initializing database:', error)
    return false
  }
}

// Call initializeDatabase to ensure all tables exist
initializeDatabase();