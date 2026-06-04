import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AuthenticatedRequest } from '../middleware/auth.js';

const generateTokens = async (userId: string, email: string, role: string) => {
  const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret';
  const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret';

  const accessToken = jwt.sign(
    { id: userId, email, role },
    accessTokenSecret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { id: userId, email, role },
    refreshTokenSecret,
    { expiresIn: '7d' }
  );

  // Store refresh token in db
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    token: refreshToken,
    user: userId,
    expiresAt,
  });

  return { accessToken, refreshToken };
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role: role === 'admin' ? 'admin' : 'staff', // Allow setting admin if specified
    });

    const { accessToken, refreshToken } = await generateTokens(
      newUser._id.toString(),
      newUser.email,
      newUser.role
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during signup', error: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = await generateTokens(
      user._id.toString(),
      user.email,
      user.role
    );

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    // Get refresh token from cookie or request body
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!token) {
      return res.status(401).json({ message: 'Refresh token missing' });
    }

    // Verify token exists in database
    const storedToken = await RefreshToken.findOne({ token });
    if (!storedToken) {
      return res.status(403).json({ message: 'Refresh token revoked or invalid' });
    }

    // Verify token validity
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(403).json({ message: 'Refresh token expired' });
    }

    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret';
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || 'fallback_access_secret';

    jwt.verify(token, refreshTokenSecret, async (err: any, decoded: any) => {
      if (err) {
        return res.status(403).json({ message: 'Refresh token invalid' });
      }

      // Generate a new access token
      const newAccessToken = jwt.sign(
        { id: decoded.id, email: decoded.email, role: decoded.role },
        accessTokenSecret,
        { expiresIn: '15m' }
      );

      res.status(200).json({
        accessToken: newAccessToken,
      });
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during refresh', error: error.message });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;

    if (token) {
      await RefreshToken.deleteOne({ token });
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error during logout', error: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error: any) {
    res.status(500).json({ message: 'Server error retrieving user', error: error.message });
  }
};
