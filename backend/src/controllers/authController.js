const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');
const { signupSchema, loginSchema } = require('../validators/authValidator');

/**
 * @desc    Register new user
 * @route   POST /api/auth/signup
 * @access  Public
 */
const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation with Joi (already done in middleware, but double-check)
    const { error } = signupSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // RACE CONDITION FIX: Use try-catch with unique index instead of findOne check
    // This relies on MongoDB's unique index on email field to prevent duplicates
    try {
      const user = await User.create({ email, password });

      // Generate token
      const token = generateToken(user._id);

      console.log(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            email: user.email,
          },
          token,
        },
      });
    } catch (dbError) {
      // Handle duplicate key error (race condition)
      if (dbError.code === 11000 || dbError.code === 11001) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists',
        });
      }
      throw dbError; // Re-throw other database errors
    }
  } catch (error) {
    console.error('Signup error:', error);

    // Don't expose internal error details in production
    res.status(500).json({
      success: false,
      message: 'Error during signup. Please try again later.',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation with Joi
    const { error } = loginSchema.validate({ email, password });
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    // Find user (include password, loginAttempts, and lockUntil)
    const user = await User.findOne({ email }).select('+password +loginAttempts +lockUntil');

    // Generic error message to prevent user enumeration
    const invalidCredentialsMsg = 'Invalid email or password';

    if (!user) {
      // Timing attack protection: still compute a hash even if user doesn't exist
      const bcrypt = require('bcryptjs');
      await bcrypt.compare(password, '$2a$12$invalidhashtopreventtimingattacks1234567890');

      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg,
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      const lockTimeRemaining = Math.ceil((user.lockUntil - Date.now()) / 1000 / 60);
      return res.status(429).json({
        success: false,
        message: `Account is locked due to too many failed login attempts. Please try again in ${lockTimeRemaining} minutes.`,
      });
    }

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      // Increment login attempts
      await user.incLoginAttempts();

      console.log(`Failed login attempt for: ${email}`);

      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg,
      });
    }

    // Password is correct - reset login attempts if there were any
    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    // Generate token
    const token = generateToken(user._id);

    console.log(`User logged in successfully: ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login. Please try again later.',
    });
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    const user = {
      id: req.user._id,
      email: req.user.email,
    };

    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
    });
  }
};

module.exports = {
  signup,
  login,
  getMe,
};
